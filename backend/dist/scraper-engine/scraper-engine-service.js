import * as cheerio from "cheerio";
import mongoose from 'mongoose';
import { ScrapedDataItemModel } from "./scrape-engine-schema.js";
import { extractDataFromElement, checkStructuredDataForKeywords, fetchHTML, processSingleListItem } from "./scraper-engine-utils.js";
import { COMMON_EXCLUDED_SELECTORS, MAX_DETAIL_PAGES_PER_JOB } from "./scraper-engine-constants.js";
//TODO: Add cron job, detail page scraping option for scraping all links gathered by list page scraping
async function processDetailPage(url, config) {
    console.log(`[Service:processDetailPage] Processing Detail Page (Standalone/Separate Pass): ${url}`);
    try {
        await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250));
        const html = await fetchHTML(url);
        const page = cheerio.load(html);
        const specificExclusions = config.scrapeOptions?.excludeSelectors || [];
        const allExclusions = [...new Set([...COMMON_EXCLUDED_SELECTORS, ...specificExclusions])];
        if (allExclusions.length > 0) {
            try {
                page(allExclusions.join(', ')).remove();
            }
            catch (exError) {
                console.warn(`[Service:processDetailPage] Error applying exclusions on ${url}: ${exError}`);
            }
        }
        const itemElement = page(config.itemSelector).first();
        if (itemElement.length === 0) {
            console.warn(`[Service:processDetailPage] itemSelector "${config.itemSelector}" not found on page ${url}.`);
            return null;
        }
        console.log(`[Service:processDetailPage] Extracting data using primary fieldMappings for ${url}`);
        const extractedData = extractDataFromElement(itemElement, config.fieldMappings, url);
        if (Object.keys(extractedData).length > 0) {
            return { url: url, data: extractedData };
        }
        else {
            console.warn(`[Service:processDetailPage] No data extracted from ${url} using primary mappings.`);
            return null;
        }
    }
    catch (error) {
        console.error(`[Service:processDetailPage] Failed to process ${url}: ${error.message}`);
        throw error;
    }
}
async function processListPage(startUrl, config, processedDetailUrls) {
    console.log(`[Service:processListPage] Processing List Page: ${startUrl}`);
    const processedResults = [];
    let itemsProcessedCount = 0;
    let detailLinksProcessedCount = 0;
    try {
        const listHtml = await fetchHTML(startUrl);
        const listPage = cheerio.load(listHtml);
        const specificExclusions = config.scrapeOptions?.excludeSelectors || [];
        const allExclusions = [...new Set([...COMMON_EXCLUDED_SELECTORS, ...specificExclusions])];
        if (allExclusions.length > 0) {
            try {
                listPage(allExclusions.join(', ')).remove();
            }
            catch (exError) {
                console.warn(`[Service:processListPage] Error applying exclusions on ${startUrl}: ${exError}`);
            }
        }
        const items = listPage(config.itemSelector);
        console.log(`[Service:processListPage] Found ${items.length} items using selector "${config.itemSelector}".`);
        for (const [index, element] of items.toArray().entries()) {
            itemsProcessedCount++;
            const itemElement = listPage(element);
            const outcomes = await processSingleListItem(itemElement, index, config, startUrl, processedDetailUrls);
            if (outcomes.length === 0 && config.pageType === 'ListPage' && !config.scrapeDetailsFromList) {
                console.log(`[Service:processListPage Item ${index}] Mode=Direct Extract (Inline scraping disabled).`);
                const listItemData = extractDataFromElement(itemElement, config.fieldMappings, startUrl);
                if (Object.keys(listItemData).length > 0) {
                    processedResults.push({ url: startUrl + `#item${index}`, data: listItemData });
                }
            }
            else {
                for (const outcome of outcomes) {
                    if (outcome.type === 'combined') {
                        processedResults.push(outcome.result);
                        detailLinksProcessedCount++;
                    }
                }
            }
        }
        console.log(`[Service:processListPage] Finished ${startUrl}. Items processed: ${itemsProcessedCount}. Final results generated: ${processedResults.length} (from ${detailLinksProcessedCount} successful detail scrapes).`);
    }
    catch (error) {
        console.error(`[Service:processListPage] Failed to process list page ${startUrl}: ${error.message}`);
    }
    return { processedResults, detailUrlsToScrapeSeparately: [] };
}
async function saveResultsToDB(resultsToSave, configId) {
    let savedCount = 0;
    let errorCount = 0;
    console.log(`[Service:saveResults] Saving ${resultsToSave.length} items to DB for config ${configId}...`);
    for (const result of resultsToSave) {
        try {
            await ScrapedDataItemModel.updateOne({ configId: configId, url: result.url }, {
                $set: { data: result.data, scrapedAt: new Date() },
                $setOnInsert: { createdAt: new Date() }
            }, { upsert: true, timestamps: true });
            savedCount++;
        }
        catch (dbError) {
            console.error(`[Service:saveResults] DB Error saving ${result.url}:`, dbError.message);
            errorCount++;
        }
    }
    console.log(`[Service:saveResults] Finished saving for config ${configId}. Saved/Updated: ${savedCount}, Errors: ${errorCount}`);
    return savedCount;
}
export async function runScrapeJob(config) {
    console.log(`[Service:runScrapeJob] Starting job: ${config.name} (${config._id}), Type: ${config.pageType}, Scrape Details Inline: ${!!config.scrapeDetailsFromList}`);
    let allExtractedResults = [];
    const processedDetailUrls = new Set();
    for (const startUrl of config.startUrls) {
        console.log(`[Service:runScrapeJob] --- Processing Start URL: ${startUrl} ---`);
        try {
            if (config.pageType === 'DetailPage') {
                if (processedDetailUrls.size >= MAX_DETAIL_PAGES_PER_JOB) {
                    console.warn(`[Service:runScrapeJob] Reached detail page limit (${MAX_DETAIL_PAGES_PER_JOB}) before processing DetailPage start URL: ${startUrl}. Skipping.`);
                    continue;
                }
                if (!processedDetailUrls.has(startUrl)) {
                    processedDetailUrls.add(startUrl);
                    const result = await processDetailPage(startUrl, config);
                    if (result) {
                        allExtractedResults.push(result);
                    }
                }
                else {
                    console.log(`[Service:runScrapeJob] Skipping duplicate DetailPage start URL: ${startUrl}`);
                    continue;
                }
            }
            else if (config.pageType === 'ListPage') {
                const { processedResults } = await processListPage(startUrl, config, processedDetailUrls);
                allExtractedResults.push(...processedResults);
            }
        }
        catch (error) {
            console.error(`[Service:runScrapeJob] Failed to process start URL ${startUrl}: ${error.message}`);
        }
        console.log(`[Service:runScrapeJob] --- Finished Start URL: ${startUrl} ---`);
    }
    let filteredResults = allExtractedResults;
    if (config.keywordsToFilterBy && config.keywordsToFilterBy.length > 0) {
        console.log(`[Service:runScrapeJob] Filtering ${allExtractedResults.length} total extracted items by keywords...`);
        filteredResults = allExtractedResults.filter(result => checkStructuredDataForKeywords(result.data, config.keywordsToFilterBy));
        console.log(`[Service:runScrapeJob] ${filteredResults.length} items passed keyword filter.`);
    }
    else {
        console.log(`[Service:runScrapeJob] No keyword filter applied. Total items: ${allExtractedResults.length}`);
    }
    if (!mongoose.Types.ObjectId.isValid(config._id)) {
        console.error(`[Service:runScrapeJob] Invalid config._id (${config._id}) found for job ${config.name}. Cannot save results.`);
        throw new Error(`Invalid configuration ID found during save operation for job ${config.name}`);
    }
    const configObjectId = config._id;
    await saveResultsToDB(filteredResults, configObjectId);
    console.log(`[Service:runScrapeJob] Job ${config.name} finished. Processed ${config.startUrls.length} start URLs. Saved/Updated items passing filters: ${filteredResults.length}. Total detail URLs processed (inline or separate): ${processedDetailUrls.size}`);
    return filteredResults;
}
