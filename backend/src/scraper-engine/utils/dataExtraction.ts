import {IFieldMapping, IScraperConfiguration} from "../models/scraperConfig.model.js";
import {ExtractedData, ListItemEvalResult} from "../scraper-engine-types.js";
import {Page} from "puppeteer";

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