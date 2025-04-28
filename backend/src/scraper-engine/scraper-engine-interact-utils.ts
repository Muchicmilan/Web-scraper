import puppeteer, {Page} from "puppeteer";
import {IInteractionOptions, IPageLoadWait, IScraperConfiguration} from "./scrape-engine-schema.js";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";

export async function applyPageWait(page: Page, waitOptions?: IPageLoadWait): Promise<void> {
    if (!waitOptions) return;

    const strategy = waitOptions.waitStrategy;
    const selector = waitOptions.waitForSelector;
    const timeout = waitOptions.waitForTimeout;
    const selectorTimeout = waitOptions.waitForTimeoutOnSelector || 1000;
    const logPrefix = `[Utils:applyPageLoadWait | ${page.url()}]`;

    try {
        if(strategy === 'selector' && selector) {
            console.log(`${logPrefix} Waiting for selector "${selector}" (max ${selectorTimeout}ms)...`);
            await page.waitForSelector(selector, { visible: true, timeout: selectorTimeout });
            console.log(`${logPrefix} Selector "${selector}" found.`);
        }
        else if (strategy === 'timeout' && timeout && timeout > 0) {
            console.log(`${logPrefix} Waiting for ${timeout}ms...`);
            await new Promise(resolve => setTimeout(resolve, timeout));
            console.log(`${logPrefix} Finished waiting ${timeout}ms.`);
        }
        else if (strategy !== 'none'){
            console.warn(`${logPrefix} Invalid wait configuration (Strategy: ${strategy}, Selector: ${selector}, Timeout: ${timeout}). Skipping wait.`);
        }
    }catch (waitError: any) {
        if (strategy === 'selector') {
            console.warn(`${logPrefix} Failed to find selector "${selector}" within ${selectorTimeout}ms: ${waitError.message}. Proceeding anyway.`);
        } else {
            console.error(`${logPrefix} Error during wait (${strategy}): ${waitError.message}. Proceeding anyway.`);
        }
    }
}

export async function closePopups(page: Page, selectors?: string[]): Promise<void> {
    if (!selectors || selectors.length === 0) {
        return;
    }
    const logPrefix = `[Utils:closePopups | ${page.url()}]`;
    console.log(`${logPrefix} Attempting to close popups matching: ${selectors.join(', ')}`);

    for (const selector of selectors) {
        try {
            const closedCount = await page.$$eval(selector, (elements, sel) => {
                let count = 0;
                elements.forEach(el => {
                    if (el && typeof (el as HTMLElement).click === 'function') {
                        try {
                            (el as HTMLElement).click();
                            console.log(`[Browser Context] Clicked popup element matching selector: ${sel}`);
                            count++;
                        } catch (clickError) {
                            console.warn(`[Browser Context] Failed to click popup ${sel}, attempting removal: ${(clickError as Error).message}`);
                            el.remove();
                            count++;
                        }
                    } else if (el) {
                        el.remove();
                        console.log(`[Browser Context] Removed popup element matching selector: ${sel}`);
                        count++;
                    }
                });
                return count;
            }, selector);

            if (closedCount > 0) {
                console.log(`${logPrefix} Actioned ${closedCount} element(s) for popup selector: ${selector}`);
                await new Promise(resolve => setTimeout(resolve, 500)); // Short delay after action
            }
            else {
                console.log(`${logPrefix} No elements found for popup selector: ${selector}`);
            }
        } catch (error: any) {
            if (!error.message.includes('failed to find element matching selector') && !error.message.includes('is not a valid selector')) {
                console.warn(`${logPrefix} Error processing popup selector "${selector}": ${error.message}`);
            } else {
                console.log(`${logPrefix} Selector "${selector}" not found on page.`);
            }
        }
    }

    console.log(`${logPrefix} Finished popup closure attempts.`);
}

export async function takeScreenshot(
    page: Page,
    config: IScraperConfiguration,
    context: 'list' | 'detail' | string = 'detail'
): Promise<void> {
    if (!config.enableScreenshots) {
        return;
    }

    const options = config.screenshotOptions || {};
    const url = page.url();
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');

    let safeUrlPart = 'url-error';
    try {
        safeUrlPart = crypto.createHash('sha1').update(url).digest('hex').substring(0, 16);
    } catch (e) {
        console.warn(`[Service:takeScreenshot] Could not generate hash for URL: ${url}`);
        safeUrlPart = crypto.createHash('sha1').update(Date.now().toString()).digest('hex').substring(0, 16);
    }

    const safeConfigName = config.name
        .replace(/[<>:"/\\|?* ]+/g, '_')
        .substring(0, 50);
    const screenshotDir = path.resolve(process.cwd(), 'screenshots', safeConfigName);

    const filename = `${dateStr}_${timeStr}_${context}_${safeUrlPart}.png`;
    let fullPath = path.join(screenshotDir, filename);

    try {
        await fs.mkdir(screenshotDir, { recursive: true });
        console.log(`[Service:takeScreenshot] Taking screenshot for ${url}. Save path: ${fullPath}`);
        await page.screenshot({
            path: fullPath,
            fullPage: options.fullPage ?? true,
            type: options.type ==='jpeg' ? 'jpeg' : options.type === "webp" ? 'webp' : 'png'
        });
        console.log(`[Service:takeScreenshot] Screenshot saved successfully: ${fullPath}`);
    } catch (error: any) {
        console.error(`[Service:takeScreenshot] Failed to take or save screenshot for ${url} at path ${fullPath}: ${error.message}`);
        console.error(error.stack);
    }
}

export async function scrollToBottomUntilStable(
    page: Page,
    safetyMaxScrolls: number = 20,
    scrollDelayMs: number = 500,
    stagnationTimeoutMs: number = 3000
): Promise<number> {
    const logPrefix = `[Utils:scrollToBottomUntilStable | ${page.url()}]`;
    let scrollsMade = 0;
    let lastHeight = 0;
    let currentHeight = 0;
    let stableCount = 0;
    const requiredStableCount = Math.ceil(stagnationTimeoutMs / scrollDelayMs);

    console.log(`${logPrefix} Starting infinite scroll process. Safety Max scrolls: ${safetyMaxScrolls}, Delay: ${scrollDelayMs}ms, Stagnation Timeout: ${stagnationTimeoutMs}ms`);
    while (scrollsMade < safetyMaxScrolls){
        lastHeight = await page.evaluate(() => document.body.scrollHeight)
        await page.evaluate(()=> window.scrollTo(0, document.body.scrollHeight));
        scrollsMade++;

        await new Promise(resolve => setTimeout(resolve, scrollDelayMs));
        currentHeight = await page.evaluate(() => document.body.scrollHeight)

        if(currentHeight === lastHeight){
            stableCount++;
            if(stableCount >= requiredStableCount){
                console.log(`${logPrefix} Page height stabilized after ${scrollsMade} scrolls. Stopping.`);
                break;
            }
        }
        else {
            stableCount = 0;
        }
        if (scrollsMade >= safetyMaxScrolls){
            console.log(`${logPrefix} Reached safety scroll limit (${safetyMaxScrolls}). Stopping scroll.`);
        }
    }
    console.log(`${logPrefix} Finished infinite scroll process. Total scrolls made: ${scrollsMade}. Final height: ${currentHeight}`);
    return scrollsMade;
}

export async function handleLoadMoreButtonInteraction(
    page: Page,
    options: Required<Pick<IInteractionOptions, 'loadMoreButtonSelector' | 'maxClicks' | 'clickDelayMs' | 'scrollDelayMs' | 'scrollStagnationTimeoutMs' >> // Use main scroll delays here
        & Pick<IInteractionOptions, 'maxItemsToScrape' | 'maxScrolls'>, // Optional limits
    itemSelector: string
): Promise<number> {
    const {
        loadMoreButtonSelector,
        maxClicks,
        clickDelayMs,
        scrollDelayMs,
        scrollStagnationTimeoutMs,
        maxScrolls,
        maxItemsToScrape
    } = options;

    const logPrefix = `[Utils:handleLoadMoreButton | ${page.url()}]`;
    let clicksMade = 0;
    const safetyMaxScrolls = maxScrolls ?? 20;

    console.log(`${logPrefix} Starting "Load More Button" interaction. Max clicks: ${maxClicks}, Button: "${loadMoreButtonSelector}", Click Delay: ${clickDelayMs}ms, Max Items: ${maxItemsToScrape ?? 'Unlimited'}`);

    let previousItemCount = -1;
    try {
        previousItemCount = await page.$$eval(itemSelector, els => els.length);
        console.log(`${logPrefix} Initial item count: ${previousItemCount}`);
    } catch (e: any) {
        console.warn(`${logPrefix} Could not get initial item count for selector "${itemSelector}": ${e.message}. Stagnation check might be less reliable.`);
        previousItemCount = -1;
    }

    for (let clickAttempt = 0; clickAttempt < maxClicks; clickAttempt++) {
        console.log(`${logPrefix} --- Starting Click Attempt ${clickAttempt + 1} / ${maxClicks} ---`);
        let currentItemCountBeforeClick = -1;
        let button: puppeteer.ElementHandle | null = null;
        let buttonFoundAndVisible = false;

        try {
            currentItemCountBeforeClick = await page.$$eval(itemSelector, els => els.length);
            console.log(`${logPrefix} Current item count before finding button: ${currentItemCountBeforeClick}`);
            if (maxItemsToScrape !== undefined && maxItemsToScrape > 0 && currentItemCountBeforeClick >= maxItemsToScrape) {
                console.log(`${logPrefix} Reached item limit (${currentItemCountBeforeClick}/${maxItemsToScrape}). Stopping.`);
                break;
            }
            console.log(`${logPrefix} Starting scroll cycle to find button "${loadMoreButtonSelector}" (Max scrolls: ${safetyMaxScrolls})...`);
            let scrollsInCycle = 0;
            let lastHeight = 0;
            let currentHeight = 0;
            let stableCount = 0;
            const requiredStableCount = Math.ceil((scrollStagnationTimeoutMs ?? 3000) / (scrollDelayMs ?? 500));

            while (scrollsInCycle < safetyMaxScrolls) {
                button = await page.$(loadMoreButtonSelector);
                if (button && await button.isIntersectingViewport()) {
                    console.log(`${logPrefix} Button found and visible after ${scrollsInCycle} scrolls this cycle.`);
                    buttonFoundAndVisible = true;
                    break;
                }
                if(button) {
                    await button.dispose();
                    button = null;
                }
                lastHeight = await page.evaluate(() => document.body.scrollHeight);

                console.log(`${logPrefix} Scrolling down (Scroll ${scrollsInCycle + 1}/${safetyMaxScrolls})...`); // Verbose
                await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); });
                scrollsInCycle++;

                await new Promise(resolve => setTimeout(resolve, scrollDelayMs ?? 500));

                currentHeight = await page.evaluate(() => document.body.scrollHeight);

                if (currentHeight === lastHeight) {
                    stableCount++;
                    console.log(`${logPrefix} Height stable (${currentHeight}). Stable count: ${stableCount}/${requiredStableCount}`);
                    if (stableCount >= requiredStableCount) {
                        console.log(`${logPrefix} Page height stabilized after ${scrollsInCycle} scrolls, button still not visible. Stopping scroll cycle.`);
                        break;
                    }
                } else {
                    stableCount = 0;
                }
            }

            if (scrollsInCycle >= safetyMaxScrolls) {
                console.log(`${logPrefix} Reached max scroll limit (${safetyMaxScrolls}) while searching for button.`);
            }

            if (!buttonFoundAndVisible) {
                button = await page.$(loadMoreButtonSelector);
                if (button && await button.isIntersectingViewport()) {
                    console.log(`${logPrefix} Button became visible just after scroll stabilization check.`);
                    buttonFoundAndVisible = true;
                } else {
                    console.log(`${logPrefix} Button "${loadMoreButtonSelector}" NOT found or not visible after scroll cycle. Stopping clicks.`);
                    if (button) await button.dispose();
                    break;
                }
            }

            console.log(`${logPrefix} Clicking button "${loadMoreButtonSelector}" (Click ${clicksMade + 1}/${maxClicks})...`);
            try {
                await button!.click();
                clicksMade++;
            } catch (clickError: any) {
                console.error(`${logPrefix} Error clicking button: ${clickError.message}. Stopping clicks.`);
                await button!.dispose();
                break;
            }
            await button!.dispose();

            console.log(`${logPrefix} Waiting ${clickDelayMs}ms after click...`);
            await new Promise(resolve => setTimeout(resolve, clickDelayMs));

            const currentItemCountAfterWait = await page.$$eval(itemSelector, els => els.length);
            console.log(`${logPrefix} Item count after wait: ${currentItemCountAfterWait} (Before this click: ${currentItemCountBeforeClick})`);
            if (currentItemCountAfterWait === currentItemCountBeforeClick) {
                console.log(`${logPrefix} Item count (${currentItemCountAfterWait}) did not increase after click ${clicksMade}. Assuming no more items or button ineffective. Stopping.`);
                break;
            }

        } catch (error: any) {
            console.warn(`${logPrefix} Error during interaction cycle (click attempt ${clickAttempt + 1}): ${error.message}. Stopping.`);
            if (button) await button.dispose();
            break;
        }
        console.log(`${logPrefix} --- Finished Click Attempt ${clickAttempt + 1} ---`);
    }

    console.log(`${logPrefix} Finished "Load More Button" interaction. Total clicks made: ${clicksMade}.`);
    return clicksMade;
}

export async function handleFixedScrollsInteraction(
    page: Page,
    options: Required<Pick<IInteractionOptions, 'maxScrolls' | 'scrollDelayMs'>>
): Promise<number> {
    const {maxScrolls, scrollDelayMs} = options;
    const logPrefix = `[Utils:handleFixedScrolls | ${page.url()}]`;
    let scrollsMade = 0;
    console.log(`${logPrefix} Starting fixed scroll process. Scrolls: ${maxScrolls}, Delay: ${scrollDelayMs}ms`);

    for(let i=0; i<maxScrolls; i++){
        try {
            await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); });
            scrollsMade++;
            await new Promise(resolve => setTimeout(resolve, scrollDelayMs));
        }catch(error : any){
            console.warn(`${logPrefix} Error during scroll ${scrollsMade + 1}: ${error.message}. Stopping.`);
            break;
        }
    }
    console.log(`${logPrefix} Finished fixed scroll process. Total scrolls made: ${scrollsMade}.`);
    return scrollsMade;
}