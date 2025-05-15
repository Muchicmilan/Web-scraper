import {ExtractedData, ListItemEvalResult, ProcessingResult} from "../scraper-engine-types.js";
import {Page} from "puppeteer";
import pLimit from "p-limit";
import {IScraperConfiguration} from "../models/scraperConfig.model.js";
import {getCurrentPoolOptions, initializeBrowserPool} from "../browserPooling/browserPoolInstancing.js";
import {DEFAULT_POOL_OPTIONS} from "../constants/browserPool.constants.js";
import {applyPageWait, closePopups} from "../utils/pagePreparation.js";
import {handleFixedScrollsInteraction, scrollToBottomUntilStable} from "../utils/pageScrolling.js";
import {handleLoadMoreButtonInteraction} from "../utils/loadMoreButtonInteraction.js";
import {takeScreenshot} from "../utils/screenshotPage.js";
import {BROWSER_PROCESS_LIST_ITEM_FUNCTION_STRING} from "../constants/processListFuncString.js";
import {MAX_DETAIL_PAGES_PER_JOB} from "../constants/puppeteer.constants.js";
import {processDetailPage} from "./detailPage.service.js";

export async function processListPage(
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

    const interactionOpts = config.interactionOptions;
    const strategy = interactionOpts?.interactionStrategy;
    const maxItems = interactionOpts?.maxItemsToScrape

    try {
        pageObj = await pool.getPage(startUrl);
        const { page } = pageObj;
        const listPageUrl = page.url();
        await applyPageWait(page, config.pageLoadWaitOptions);
        await closePopups(page, config.closePopupSelectors);

        console.log('[Service:processListPage] Adding extra delay (e.g., 3s) before interactions...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log(`[Service:processListPage] Applying interaction strategy: ${strategy}`);
        switch(strategy) {
            case 'infiniteScroll' :
                if(interactionOpts){
                    await scrollToBottomUntilStable(
                        page,
                        interactionOpts.maxScrolls,
                        interactionOpts.scrollDelayMs,
                        interactionOpts.scrollStagnationTimeoutMs
                    );
                }
                else {
                    console.warn("[Service:processListPage] 'infiniteScroll' strategy selected but no options found. Using defaults.");
                    await scrollToBottomUntilStable(page);
                }
                break;

            case 'loadMoreButton':
                if(interactionOpts?.loadMoreButtonSelector){
                    const requiredButtonOpts = {
                        loadMoreButtonSelector: interactionOpts.loadMoreButtonSelector,
                        maxClicks: interactionOpts.maxClicks ?? 5,
                        clickDelayMs: interactionOpts.clickDelayMs ?? 1500,
                        scrollDelayMs: interactionOpts.scrollDelayMs ?? 500,
                        scrollStagnationTimeoutMs: interactionOpts.scrollStagnationTimeoutMs ?? 3000,
                        maxScrolls: interactionOpts.maxScrolls ?? 20,
                        maxItemsToScrape: interactionOpts.maxItemsToScrape
                    };
                    await handleLoadMoreButtonInteraction(page, requiredButtonOpts, config.itemSelector)
                }
                else {
                    console.warn(`[Service:processListPage] 'loadMoreButton' strategy selected but 'loadMoreButtonSelector' is missing. Skipping interaction.`);
                }
                break;

            case 'fixedScrolls' :
                if(interactionOpts){
                    const requiredScrollOpts = {
                        maxScrolls: interactionOpts.maxScrolls ?? 20,
                        scrollDelayMs: interactionOpts.scrollDelayMs ?? 500
                    };
                    await handleFixedScrollsInteraction(page, requiredScrollOpts);
                }
                else {
                    console.warn("[Service:processListPage] 'fixedScrolls' strategy selected but no options found. Using defaults.");
                    await handleFixedScrollsInteraction(page, { maxScrolls: 20, scrollDelayMs: 500 });
                }
                break;

            case 'none' :
            default:
                console.log(`[Service:processListPage] No interaction strategy applied.`);
                break;
        }
        console.log(`[Service:processListPage] Finished page interactions.`);

        await takeScreenshot(page,config,'list');

        console.log(`[Service:processListPage] Evaluating list items with selector: "${config.itemSelector}"`);
        let itemEvalResults: ListItemEvalResult[] = await page.$$eval(
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

        const maxItems = config.interactionOptions?.maxItemsToScrape;
        if (maxItems !== undefined && maxItems > 0 && itemEvalResults.length > maxItems) {
            console.log(`[Service:processListPage] Limiting results from ${itemEvalResults.length} to ${maxItems} based on maxItemsToScrape.`);
            itemEvalResults = itemEvalResults.slice(0, maxItems);
        }

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