import mongoose from 'mongoose';
import pLimit from 'p-limit';
import {
    EngineSettingsModel,
    IScraperConfiguration,
    ScrapedDataItemModel,
     } from "./scrape-engine-schema.js";
import { 
    checkStructuredDataForKeywords,
    extractDetailData,
    takeScreenshot
    } from "./scraper-engine-utils.js";
import {
    MAX_DETAIL_PAGES_PER_JOB,
    BROWSER_PROCESS_LIST_ITEM_FUNCTION_STRING,
    DEFAULT_POOL_OPTIONS
    } from "./scraper-engine-constants.js";
import { 
    ProcessingResult,
    ListItemEvalResult,
    BrowserPoolOptions,
    ExtractedData
     } from "./scraper-engine-types.js";
import { BrowserPool} from './scraper-engine-browser-pool.js';
import { Page } from 'puppeteer';

let browserPool : BrowserPool | null = null;
let currentPoolOptions : BrowserPoolOptions | null = null;

export async function initializeBrowserPool(): Promise<BrowserPool> {
    if (!browserPool) {
        console.log('[Service:initializeBrowserPool] Initializing browser pool for the first time...');
        currentPoolOptions = await getEnginePoolOptions();
        console.log('[Service:initializeBrowserPool] Using pool options:', currentPoolOptions);
        browserPool = new BrowserPool(currentPoolOptions);
        await browserPool.initialize();
        console.log('[Service:initializeBrowserPool] Browser pool initialized successfully.');
    } else {
        console.log('[Service:initializeBrowserPool] Browser pool already initialized.');
    }
    return browserPool;
}

export async function getEnginePoolOptions(): Promise<BrowserPoolOptions> {
    try {
        const settings = await EngineSettingsModel.findOne({ singleton: true }).lean();
        if (settings) {
            console.log('[Service:getEnginePoolOptions] Found engine settings in DB.');
            return {
                maxPoolSize: settings.maxPoolSize,
                minPoolSize: settings.minPoolSize,
                idleTimeoutMs: settings.idleTimeoutMs,
                retryLimit: settings.retryLimit,
            };
        } else {
            console.log('[Service:getEnginePoolOptions] No engine settings found in DB, using defaults.');
            return { ...DEFAULT_POOL_OPTIONS };
        }
    } catch (error: any) {
        console.error(`[Service:getEnginePoolOptions] Error fetching settings, using defaults: ${error.message}`);
        return { ...DEFAULT_POOL_OPTIONS };
    }
}


export async function shutdownBrowserPool(): Promise<void> {
    if (browserPool) {
        console.log('[Service:shutdownBrowserPool] Shutting down browser pool...');
        await browserPool.shutdown();
        browserPool = null;
        currentPoolOptions = null;
        console.log('[Service:shutdownBrowserPool] Browser pool shut down.');
    }
}

export function getBrowserPoolStats() {
    return browserPool ? browserPool.getStats() : null;
}


export function getCurrentPoolOptions(): BrowserPoolOptions | null {
    return currentPoolOptions ? { ...currentPoolOptions } : null;
}




async function processDetailPage(
    url: string,
    config: IScraperConfiguration,
    retries = 1
): Promise<ProcessingResult | null> {
    const maxAttempts = retries + 1;
    const currentAttempt = maxAttempts - retries;
    console.log(`[Service:processDetailPage] Processing Detail Page: ${url} (Attempt ${currentAttempt}/${maxAttempts})`);
    const pool = await initializeBrowserPool();
    let pageObj: { page: Page; browserId: string } | null = null;

    try {
        pageObj = await pool.getPage(url);
        const { page } = pageObj;
        await takeScreenshot(page,config,'detail');
        const extractedData = await extractDetailData(page, config);

        if (extractedData && Object.keys(extractedData).length > 0) {
             console.log(`[Service:processDetailPage] Successfully extracted data for ${url} on attempt ${currentAttempt}`);
            return { url: url, data: extractedData };
        } else {
            console.warn(`[Service:processDetailPage] No data extracted from ${url} on attempt ${currentAttempt}.`);
            await takeScreenshot(page,config,'detail-no-data');
            return null;
        }

    } catch (error: any) {
        const errorType = error.name || 'Error';
        const errorMessage = error.message || 'Unknown error';
        console.error(`[Service:processDetailPage] Attempt ${currentAttempt}/${maxAttempts} failed for ${url}: ${errorType} - ${errorMessage}`);

        if (pageObj?.page) {
            try {
                await pool.releasePage(pageObj.page);
                console.log(`[Service:processDetailPage] Released page for ${url} after error on attempt ${currentAttempt}.`);
            } catch (releaseError: any) {
                console.error(`[Service:processDetailPage] Error releasing page for ${url} after error: ${releaseError.message}`);
            }
            pageObj = null;
        }

        if (retries > 0) {
            console.log(`[Service:processDetailPage] Retrying ${url} (${retries} retries left)...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
            return processDetailPage(url, config, retries - 1);
        } else {
            console.error(`[Service:processDetailPage] All ${maxAttempts} attempts failed for ${url}.`);
            return null;
        }
    } finally {
         if (pageObj?.page && pool) {
            try {
                await pool.releasePage(pageObj.page);
                 console.log(`[Service:processDetailPage] Released page for ${url} in finally block.`);
            } catch (releaseError: any) {
                 console.error(`[Service:processDetailPage] Error releasing page for ${url} in finally block: ${releaseError.message}`);
            }
        }
    }
}

async function processListPage(
    startUrl: string,
    config: IScraperConfiguration,
    processedDetailUrls: Set<string>
): Promise<ProcessingResult[]> {
    console.log(`[Service:processListPage] Processing List Page: ${startUrl}`);
    const pool = await initializeBrowserPool();
    const finalResults: ProcessingResult[] = [];
    const intermediateListData: { [key: string]: { listData: ExtractedData, finalUrl: string } } = {};
    const detailPageTasks: { url: string, task: Promise<ProcessingResult | null> }[] = [];
    let pageObj: { page: Page; browserId: string } | null = null;

    const poolOptions = getCurrentPoolOptions() || DEFAULT_POOL_OPTIONS;
    const concurrencyLimit = poolOptions.maxPoolSize;
    const limit = pLimit(concurrencyLimit);
    console.log(`[Service:processListPage] Concurrency limit set to: ${concurrencyLimit}`);

    try {
        pageObj = await pool.getPage(startUrl);
        const { page } = pageObj;
        const listPageUrl = page.url();
        
        await takeScreenshot(page,config,'list');

        console.log(`[Service:processListPage] Evaluating list items with selector: "${config.itemSelector}"`);
        const itemEvalResults: ListItemEvalResult[] = await page.$$eval(
            config.itemSelector,
            (itemElements, mappings, url, funcStr) => {
                 const processItemFunc = eval(`(${funcStr})`);
                 return itemElements.map(element => processItemFunc(element, mappings, url));
            },
            config.fieldMappings,
            listPageUrl,
            BROWSER_PROCESS_LIST_ITEM_FUNCTION_STRING
        );

        console.log(`[Service:processListPage] DEBUG: $$eval completed. Found ${itemEvalResults.length} raw item results.`);

        console.log(`[Service:processListPage] DEBUG: Entering loop to store list data and queue detail tasks...`);
        for (const [index, itemResult] of itemEvalResults.entries()) {
            console.log(`[Service:processListPage] DEBUG: Processing raw item ${index}. Detail URL: ${itemResult.detailUrl}, List Data Keys: ${Object.keys(itemResult.listData || {}).join(', ')}`);

            const logPrefix = `[Service:processListPage Item ${index}]`;
            if (itemResult.error) {
                console.warn(`${logPrefix} Skipping item due to $$eval error: ${itemResult.error}`);
                continue;
            }

            const { listData, detailUrl } = itemResult;
            const hasListData = listData && Object.keys(listData).length > 0;
            const itemKey = detailUrl || `${listPageUrl}#item-${index}-listonly`;
            const finalItemUrl = detailUrl || itemKey;

            intermediateListData[itemKey] = {
                listData: listData || {},
                finalUrl: finalItemUrl
            };
            if(hasListData) {
                console.log(`${logPrefix} Stored initial list data for key: ${itemKey} (Data keys: ${Object.keys(listData).join(', ')})`);
            } else {
                console.log(`${logPrefix} No list data extracted (hasListData is false). Storing empty object.`);
            }

            if (config.scrapeDetailsFromList && detailUrl) {
                if (processedDetailUrls.size >= MAX_DETAIL_PAGES_PER_JOB) {
                    console.warn(`${logPrefix} Detail page limit reached (${MAX_DETAIL_PAGES_PER_JOB}), skipping detail scrape for: ${detailUrl}`);
                    continue;
                }
                if (processedDetailUrls.has(detailUrl)) {
                    continue;
                }

                processedDetailUrls.add(detailUrl);

                console.log(`${logPrefix} Queuing detail task for ${detailUrl}.`);
                const task = limit(() => processDetailPage(detailUrl, config));
                detailPageTasks.push({ url: detailUrl, task: task });
            }
        }
        console.log(`[Service:processListPage] DEBUG: Exited loop. Stored initial data for ${Object.keys(intermediateListData).length} items. Queued ${detailPageTasks.length} detail tasks.`);

        const detailResultsMap: { [url: string]: ExtractedData } = {};
        if (detailPageTasks.length > 0) {
            console.log(`[Service:processListPage] Processing ${detailPageTasks.length} detail page tasks...`);
            const taskPromises = detailPageTasks.map(t => t.task);
            const detailResultsArray = await Promise.all(taskPromises);
            console.log(`[Service:processListPage] Finished processing ${detailPageTasks.length} detail page tasks.`);

            detailResultsArray.forEach((result, i) => {
                const originalUrl = detailPageTasks[i].url;
                if (result && result.data && Object.keys(result.data).length > 0) {
                    detailResultsMap[originalUrl] = result.data;
                    console.log(`[Service:processListPage] Stored successful detail data for: ${originalUrl}. Keys: ${Object.keys(result.data).join(', ')}`);
                } else {
                    console.warn(`[Service:processListPage] Detail page failed or returned empty data for: ${originalUrl}.`);
                }
            });
        }

        console.log(`[Service:processListPage] Constructing final results...`);
        for (const key in intermediateListData) {
            const item = intermediateListData[key];
            const fetchedDetailData = detailResultsMap[key] || {};

            const finalNestedData = {
                listData: item.listData,
                detailData: fetchedDetailData
            };

            console.log(`[Service:processListPage] DEBUG: Pushing final nested data for ${item.finalUrl}:`, JSON.stringify(finalNestedData));

            finalResults.push({
                url: item.finalUrl,
                data: finalNestedData
            });
        }
        console.log(`[Service:processListPage] Finished constructing final data for ${finalResults.length} items.`);

    } catch (error: any) {
        console.error(`[Service:processListPage] Critical error processing list page ${startUrl}: ${error.message}`, error.stack);
    } finally {
         if (pageObj?.page && pool) {
            try {
                await pool.releasePage(pageObj.page);
            } catch (releaseError: any) {
                 console.error(`[Service:processListPage] Error releasing page for ${startUrl}: ${releaseError.message}`);
            }
        }
    }

    console.log(`[Service:processListPage] Finished processing list page ${startUrl}. Returning ${finalResults.length} results.`);
    return finalResults;
}

async function saveResultsToDB(resultsToSave: ProcessingResult[], configId: mongoose.Types.ObjectId): Promise<number> {
    let savedCount = 0;
    let errorCount = 0;
    if (resultsToSave.length === 0) {
        console.log(`[Service:saveResults] No items to save for config ${configId}.`);
        return 0;
    }
    console.log(`[Service:saveResults] Saving/Updating ${resultsToSave.length} items to DB for config ${configId}...`);

    console.log(`[Service:saveResults] DEBUG: Sample data object being prepared for save (first item):`, JSON.stringify(resultsToSave[0]?.data));

    const bulkOps = resultsToSave.map(result => ({
        updateOne: {
            filter: { configId: configId, url: result.url },
            update: {
                $set: { data: result.data, scrapedAt: new Date() },
                $setOnInsert: { createdAt: new Date(), configId: configId, url: result.url }
            },
            upsert: true
        }
    }));

    try {
        const bulkResult = await ScrapedDataItemModel.bulkWrite(bulkOps, { ordered: false });
        savedCount = (bulkResult.upsertedCount || 0) + (bulkResult.modifiedCount || 0);
         if (bulkResult.hasWriteErrors()) {
             errorCount = bulkResult.getWriteErrors().length;
             console.warn(`[Service:saveResults] Encountered ${errorCount} errors during bulk save for config ${configId}.`);
             console.error(bulkResult.getWriteErrors());
         }
    } catch (dbError: any) {
        console.error(`[Service:saveResults] Critical DB Error during bulk save for config ${configId}:`, dbError.message);
        errorCount = resultsToSave.length - savedCount;
    }
    console.log(`[Service:saveResults] Finished saving for config ${configId}. Saved/Updated: ${savedCount}, Errors: ${errorCount}`);
    return savedCount;
}

export async function runScrapeJob(config: IScraperConfiguration): Promise<ProcessingResult[]> {
    console.log(`[Service:runScrapeJob] Starting job: ${config.name} (${config._id}), Type: ${config.pageType}`);

    await initializeBrowserPool();

    let allExtractedResults: ProcessingResult[] = [];
    const processedDetailUrls = new Set<string>();

    try {
        const startUrlPromises: Promise<ProcessingResult[]>[] = [];
        console.log(`[Service:runScrapeJob] Processing ${config.startUrls.length} start URL(s) for ${config.name}...`);

        for (const startUrl of config.startUrls) {
            console.log(`[Service:runScrapeJob] --- Queueing Start URL: ${startUrl} for job ${config.name} ---`);

            if (config.pageType === 'DetailPage') {
                if (processedDetailUrls.size >= MAX_DETAIL_PAGES_PER_JOB) { /* ... limit check ... */ continue; }
                if (!processedDetailUrls.has(startUrl)) {
                    processedDetailUrls.add(startUrl);
                    const promise = processDetailPage(startUrl, config).then(result => result ? [result] : []);
                    startUrlPromises.push(promise);
                } else {}

            } else if (config.pageType === 'ListPage') {
                const promise = processListPage(startUrl, config, processedDetailUrls);
                startUrlPromises.push(promise);
            }
        }

        console.log(`[Service:runScrapeJob] Waiting for ${startUrlPromises.length} start URL processing branches for job ${config.name}...`);
        const resultsArrays = await Promise.all(startUrlPromises);
        console.log(`[Service:runScrapeJob] Finished processing start URLs for job ${config.name}. Aggregating results...`);

        resultsArrays.forEach(results => allExtractedResults.push(...results));

    } catch (jobError: any) {
        console.error(`[Service:runScrapeJob] Critical job error for ${config.name}: ${jobError.message}`, jobError.stack);
    }

    let filteredResults = allExtractedResults;
    if (config.keywordsToFilterBy && config.keywordsToFilterBy.length > 0) {
        console.log(`[Service:runScrapeJob:${config.name}] Filtering ${allExtractedResults.length} results by keywords...`);
        filteredResults = allExtractedResults.filter(result =>
            checkStructuredDataForKeywords(result.data, config.keywordsToFilterBy!)
        );
        console.log(`[Service:runScrapeJob:${config.name}] ${filteredResults.length} items passed keyword filter.`);
    } else {
         console.log(`[Service:runScrapeJob:${config.name}] No keyword filter. Proceeding with ${allExtractedResults.length} items.`);
    }

    if (!mongoose.Types.ObjectId.isValid(config._id as mongoose.Types.ObjectId)) {
        console.error(`[Service:runScrapeJob:${config.name}] Invalid config._id (${config._id}). Cannot save results.`);
    } else {
        const configObjectId = config._id as mongoose.Types.ObjectId;
        await saveResultsToDB(filteredResults, configObjectId);
    }

    console.log(`[Service:runScrapeJob] Job ${config.name} finished. Results collected/filtered: ${filteredResults.length}. Detail URLs processed in this job: ${processedDetailUrls.size}`);
    return filteredResults;
}

export async function runMultipleScrapeJobs(
    configs: IScraperConfiguration[]
): Promise<Map<string, { success: boolean; resultsCount: number; message?: string }>> {
    const pool = await initializeBrowserPool();
    const resultsSummary = new Map<string, { success: boolean; resultsCount: number; message?: string }>();
    const configIds = configs.map(c => (c._id as mongoose.Types.ObjectId).toString());

    console.log(`[Service:runMultipleScrapeJobs] Starting ${configs.length} scrape jobs concurrently. Config IDs: [${configIds.join(', ')}]`);
    console.log(`[Service:runMultipleScrapeJobs] Using Browser Pool Stats:`, pool.getStats());

    const jobPromises = configs.map(async (config) => {
        const configID = config._id as mongoose.Types.ObjectId;
        const configIdStr = configID.toString();
        try {
            const jobResults = await runScrapeJob(config);
            resultsSummary.set(configIdStr, {
                success: true,
                resultsCount: jobResults.length,
                message: `Job ${config.name} completed successfully.`
            });
        } catch (error: any) {
            console.error(`[Service:runMultipleScrapeJobs] UNEXPECTED critical failure in job ${config.name} (${configIdStr}): ${error.message}`, error.stack);
            resultsSummary.set(configIdStr, {
                success: false,
                resultsCount: 0,
                message: `Job ${config.name} failed critically: ${error.message}`
            });
        }
    });

    await Promise.all(jobPromises);

    console.log(`[Service:runMultipleScrapeJobs] All ${configs.length} jobs finished processing.`);
    console.log(`[Service:runMultipleScrapeJobs] Final Browser Pool Stats:`, pool.getStats());

    configIds.forEach(id => {
        if (!resultsSummary.has(id)) {
             resultsSummary.set(id, { success: false, resultsCount: 0, message: "Job execution did not complete or record results." });
        }
    });


    return resultsSummary;
}