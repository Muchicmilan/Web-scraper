import {ProcessingResult} from "../scraper-engine-types.js";
import {Page} from "puppeteer";
import {IScraperConfiguration} from "../models/scraperConfig.model.js";
import {initializeBrowserPool} from "../browserPooling/browserPoolInstancing.js";
import {applyPageWait, closePopups} from "../utils/pagePreparation.js";
import {takeScreenshot} from "../utils/screenshotPage.js";
import {extractDetailData} from "../utils/dataExtraction.js";

export async function processDetailPage(
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
        await applyPageWait(page, config.pageLoadWaitOptions);
        await closePopups(page, config.closePopupSelectors);
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
                await pool.releasePage(pageObj?.page);
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