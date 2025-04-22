import puppeteer, {Browser, Page, ElementHandle} from "puppeteer";
import { DEFAULT_USER_AGENT, AXIOS_REQUEST_TIMEOUT } from "./scraper-engine-constants.js";
import crypto from 'crypto'
import {
    PUPPETEER_TIMEOUT
} from "./scraper-engine-constants.js";
import { IFieldMapping } from "./scrape-engine-schema.js";
import { ExtractedData, SingleItemOutcome, ListItemEvalResult} from "./scraper-engine-types.js";
import path from 'path';
import fs from 'fs/promises'
import { IScraperConfiguration } from "./scrape-engine-schema.js";


export async function launchBrowser(): Promise<Browser> {
    console.log("[Utils:launchBrowser] Launching browser...");
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        console.log("[Utils:launchBrowser] Browser launched successfully.");
        return browser;
    } catch (error: any) {
        console.error(`[Utils:launchBrowser] Failed to launch browser: ${error.message}`);
        throw error;
    }
}   

export async function navigatePage(browser: Browser, url: string): Promise<Page> {
    console.log(`[Utils:navigatePage] Creating new page and navigating to: ${url}`);
    let page: Page | null = null;
    try {
        page = await browser.newPage();
        await page.setUserAgent(DEFAULT_USER_AGENT);
        await page.setViewport({ width: 1366, height: 768 });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: PUPPETEER_TIMEOUT });
        console.log(`[Utils:navigatePage] Navigation successful for: ${url}`);
        return page;
    } catch (error: any) {
        console.error(`[Utils:navigatePage] Navigation failed for ${url}: ${error.message}`);
        if (page) {
            try { await page.close(); } catch (closeError) { /* ignore */ }
        }
        throw new Error(`Navigation failed for ${url}: ${error.message}`);
    }
}

export function browserProcessListItem(
    listItemElement: Element,
    primaryMappings: IFieldMapping[],
    pageUrl: string 
): ListItemEvalResult { 

    function set(obj: any, path: string | string[], value: any): void {
        const keys = Array.isArray(path) ? path : path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (current[key] === undefined || current[key] === null) {
                current[key] = {};
            }
            current = current[key];
        }
         if (keys.length > 0) {
             current[keys[keys.length - 1]] = value;
        }
    }

    function extractData(targetElement: Element | null, mappings: IFieldMapping[]): ExtractedData {
        if (!targetElement) return {};
        const resultData: ExtractedData = {};
        for (const mapping of mappings) {
             if (!mapping || !mapping.fieldName || !mapping.selector || !mapping.extractFrom) continue;
             let value: string | null | undefined = undefined;
             try {
                 const elementsToQuery = (mapping.selector === ':scope' || mapping.selector === '*')
                     ? [targetElement]
                     : Array.from(targetElement.querySelectorAll(mapping.selector));

                 if (elementsToQuery.length > 0) {
                     if (mapping.extractFrom === 'text') {
                         const textParts: string[] = [];
                         elementsToQuery.forEach(elem => {
                             const text = (elem as HTMLElement).innerText?.trim();
                             if (text) textParts.push(text);
                         });
                         if (textParts.length > 0) value = textParts.join(' ').replace(/\s+/g, ' ').trim();
                     } else {
                         const firstTarget = elementsToQuery[0];
                         if (mapping.extractFrom === 'attribute' && mapping.attributeName) {
                             value = firstTarget.getAttribute(mapping.attributeName)?.trim();
                             if (value && (mapping.attributeName === 'href' || mapping.attributeName === 'src')) {
                                 try { value = new URL(value, pageUrl).href; } catch (e) {}
                             }
                         } else if (mapping.extractFrom === 'html') {
                             value = firstTarget.innerHTML?.trim();
                         }
                     }
                 }
             } catch (e: any) { console.error(`[Browser Context] Error processing selector "${mapping.selector}" for field "${mapping.fieldName}": ${e.message}`); }
             if (value !== undefined && value !== null && value !== '') set(resultData, mapping.fieldName, value);
        }
        return resultData;
    }

    const listData = extractData(listItemElement, primaryMappings);

    let detailUrl: string | null = null;
    try {
        const links = Array.from(listItemElement.querySelectorAll('a'));
        const baseDomain = new URL(pageUrl).hostname.toLowerCase();

        for (const link of links) {
            const href = link.getAttribute('href')?.trim();
            if (href && href !== '#' && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
                try {
                    const absoluteURL = new URL(href, pageUrl);
                    if (absoluteURL.protocol.startsWith('http') && absoluteURL.hostname.toLowerCase() === baseDomain) {
                        detailUrl = absoluteURL.href;
                        break;
                    }
                } catch (e) {}
            }
        }
    } catch (e: any) {
         console.error(`[Browser Context] Error extracting links: ${e.message}`);
         return { listData, detailUrl: null, error: `Link extraction failed: ${e.message}` };
    }

    return { listData, detailUrl };
}

export async function extractDetailData(
    page: Page,
    config: IScraperConfiguration
): Promise<ExtractedData> {
    const logPrefix = `[Utils:extractDetailData | ${page.url()}]`;
    console.log(`${logPrefix} Extracting data...`);

    const itemSelectorToUse = config.detailItemSelector || config.itemSelector;
    const mappingsToUse = (config.detailFieldMappings && config.detailFieldMappings.length > 0)
        ? config.detailFieldMappings
        : config.fieldMappings;
    const pageUrl = page.url();

    const exclusions = config.scrapeOptions?.excludeSelectors;
    if (exclusions && exclusions.length > 0) {
        try {
            await page.evaluate((selectorsToRemove) => {
                selectorsToRemove.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => el.remove());
                });
            }, exclusions);
             console.log(`${logPrefix} Applied ${exclusions.length} exclusion selectors.`);
        } catch (error: any) {
             console.warn(`${logPrefix} Error applying exclusions: ${error.message}`);
        }
    }

    try {
        const extractedData = await page.evaluate(
            (selector: string, mappings: IFieldMapping[], currentUrl: string) => {
                function set(obj: any, path: string | string[], value: any): void {
                    const keys = Array.isArray(path) ? path : path.split('.');
                    let current = obj;
                    for (let i = 0; i < keys.length - 1; i++) {
                        const key = keys[i];
                        if (current[key] === undefined || current[key] === null) {
                            current[key] = {};
                        }
                        current = current[key];
                    }
                     if (keys.length > 0) {
                         current[keys[keys.length - 1]] = value;
                    }
                 }

                 function extractData(targetElement: Element | null, mappings: IFieldMapping[], pageUrl: string): ExtractedData {
                     if (!targetElement) return {};
                     const resultData: ExtractedData = {};
                     for (const mapping of mappings) { /* ... extraction logic ... */
                         if (!mapping || !mapping.fieldName || !mapping.selector || !mapping.extractFrom) continue;
                         let value: string | null | undefined = undefined;
                         try {
                             const elementsToQuery = (mapping.selector === ':scope' || mapping.selector === '*')
                                 ? [targetElement]
                                 : Array.from(targetElement.querySelectorAll(mapping.selector));

                             if (elementsToQuery.length > 0) {
                                 if (mapping.extractFrom === 'text') {
                                     const textParts: string[] = [];
                                     elementsToQuery.forEach(elem => {
                                         const text = (elem as HTMLElement).innerText?.trim();
                                         if (text) textParts.push(text);
                                     });
                                     if (textParts.length > 0) value = textParts.join(' ').replace(/\s+/g, ' ').trim();
                                 } else {
                                     const firstTarget = elementsToQuery[0];
                                     if (mapping.extractFrom === 'attribute' && mapping.attributeName) {
                                         value = firstTarget.getAttribute(mapping.attributeName)?.trim();
                                         if (value && (mapping.attributeName === 'href' || mapping.attributeName === 'src')) {
                                             try { value = new URL(value, pageUrl).href; } catch (e) {}
                                         }
                                     } else if (mapping.extractFrom === 'html') {
                                         value = firstTarget.innerHTML?.trim();
                                     }
                                 }
                             }
                         } catch (e: any) { console.error(`[Browser Context] Error processing selector "${mapping.selector}" for field "${mapping.fieldName}": ${e.message}`); }
                         if (value !== undefined && value !== null && value !== '') set(resultData, mapping.fieldName, value);
                     }
                     return resultData;
                 }
                const mainElement = document.querySelector(selector);
                if (!mainElement) {
                    console.warn(`[Browser Context] Detail item selector "${selector}" not found.`);
                    return {};
                }
                return extractData(mainElement, mappings, currentUrl);
            },
            itemSelectorToUse,
            mappingsToUse,
            pageUrl
        );

        console.log(`${logPrefix} Extracted ${Object.keys(extractedData).length} fields.`);
        return extractedData || {};

    } catch (error: any) {
        console.error(`${logPrefix} Error during page.evaluate for data extraction: ${error.message}`);
        throw new Error(`Data extraction failed via Puppeteer evaluate: ${error.message}`);
    }
}

export function checkStructuredDataForKeywords(data: Record<string, any> | null | undefined, keywordsToCheck: string[]): boolean {
    if (!keywordsToCheck || keywordsToCheck.length === 0) {
        return true;
    }
    if (!data || typeof data !== 'object') {
        return false;
    }

    const lowerCaseKeywords = keywordsToCheck.map(k => k.toLowerCase().trim()).filter(Boolean);
    if (lowerCaseKeywords.length === 0) return true;

    let found = false;

    function traverse(currentData: any) {
        if (found) return;

        if (typeof currentData === 'string') {
            const lowerCaseData = currentData.toLowerCase();
            for (const keyword of lowerCaseKeywords) {
                if (lowerCaseData.includes(keyword)) {
                    found = true;
                    return;
                }
            }
        } else if (Array.isArray(currentData)) {
            for (const item of currentData) {
                if (found) return;
                traverse(item);
            }
        } else if (typeof currentData === 'object' && currentData !== null) {
            for (const key in currentData) {
                 if (found) return;
                if (Object.prototype.hasOwnProperty.call(currentData, key)) {
                    traverse(currentData[key]);
                }
            }
        }
    }
    traverse(data);
    return found;
}

export function simpleDeepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }
    if (Array.isArray(obj)) {
      const clonedArr = [];
      for (let i = 0; i < obj.length; i++) {
        clonedArr[i] = simpleDeepClone(obj[i]);
      }
      return clonedArr as any;
    }
    const clonedObj = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = simpleDeepClone(obj[key]);
      }
    }
    return clonedObj;
  }

export async function takeScreenshot(
    page: Page,
    config: IScraperConfiguration,
    context: 'list' | 'detail' | string = 'detail'
): Promise<void> {
    if (!config.enableScreenshots) {
        return;
    }

    const screenshotDelayMs = 1000; 
    try {
        console.log(`[Service:takeScreenshot] Waiting ${screenshotDelayMs}ms for content to potentially load before screenshot for ${page.url()}...`);
        await new Promise(resolve => setTimeout(resolve, screenshotDelayMs));
        console.log(`[Service:takeScreenshot] Finished waiting delay. Proceeding with screenshot.`);
    } catch (delayError: any) {
        console.error(`[Service:takeScreenshot] Error during fixed delay: ${delayError.message}`);
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
        });
        console.log(`[Service:takeScreenshot] Screenshot saved successfully: ${fullPath}`);

    } catch (error: any) {
        console.error(`[Service:takeScreenshot] Failed to take or save screenshot for ${url} at path ${fullPath}: ${error.message}`);
        console.error(error.stack);
    }
}