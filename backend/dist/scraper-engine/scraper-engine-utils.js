import * as cheerio from "cheerio";
import axios from "axios";
import { DEFAULT_USER_AGENT, AXIOS_REQUEST_TIMEOUT } from "./scraper-engine-constants.js";
import { COMMON_EXCLUDED_SELECTORS, MAX_DETAIL_PAGES_PER_JOB } from "./scraper-engine-constants.js";
import set from "lodash.set";
export async function fetchHTML(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                "User-Agent": DEFAULT_USER_AGENT
            },
            timeout: AXIOS_REQUEST_TIMEOUT,
        });
        return data;
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`Axios Error fetching ${url}: ${error.message} (Status: ${error.response?.status})`);
            throw new Error(`Failed to fetch URL: ${url}. Status: ${error.response?.status || 'N/A'}`);
        }
        else {
            console.error(`Error fetching ${url}: `, error);
            throw new Error(`Failed to fetch URL: ${url}. Reason: ${error.message || 'Unknown error'}`);
        }
    }
}
function extractSameDomainLinks(htmlContent, baseUrl) {
    if (!htmlContent)
        return [];
    let baseDomain;
    try {
        baseDomain = new URL(baseUrl).hostname.toLowerCase();
    }
    catch (e) {
        console.error(`[extractSameDomainLinks] Invalid baseUrl: "${baseUrl}". Cannot extract links.`);
        return [];
    }
    const cheerioRead = cheerio.load(htmlContent);
    const links = new Set();
    cheerioRead('a').each((_, element) => {
        const link = cheerioRead(element);
        const href = link.attr('href')?.trim();
        if (href && href !== '#' && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
            try {
                const absoluteURL = new URL(href, baseUrl);
                if (absoluteURL.protocol.startsWith('http') && absoluteURL.hostname.toLowerCase() === baseDomain) {
                    links.add(absoluteURL.href);
                }
            }
            catch (error) {
                console.warn(`[extractSameDomainLinks] Skipping invalid link "${href}" relative to "${baseUrl}"`);
            }
        }
    });
    return Array.from(links);
}
export function checkStructuredDataForKeywords(data, keywordsToCheck) {
    if (!keywordsToCheck || keywordsToCheck.length === 0) {
        return true;
    }
    if (!data || typeof data !== 'object') {
        return false;
    }
    const lowerCaseKeywords = keywordsToCheck.map(k => k.toLowerCase().trim()).filter(Boolean);
    if (lowerCaseKeywords.length === 0)
        return true;
    let found = false;
    function traverse(currentData) {
        if (found)
            return;
        if (typeof currentData === 'string') {
            const lowerCaseData = currentData.toLowerCase();
            for (const keyword of lowerCaseKeywords) {
                if (lowerCaseData.includes(keyword)) {
                    found = true;
                    return;
                }
            }
        }
        else if (Array.isArray(currentData)) {
            for (const item of currentData) {
                if (found)
                    return;
                traverse(item);
            }
        }
        else if (typeof currentData === 'object' && currentData !== null) {
            for (const key in currentData) {
                if (found)
                    return;
                if (Object.prototype.hasOwnProperty.call(currentData, key)) {
                    traverse(currentData[key]);
                }
            }
        }
    }
    traverse(data);
    return found;
}
export function extractDataFromElement($element, fieldMappings, pageUrl) {
    const resultData = {};
    for (const mapping of fieldMappings) {
        const $targetElements = $element.find(mapping.selector);
        let value = undefined;
        if ($targetElements.length > 0) {
            if (mapping.extractFrom === 'text') {
                if (!mapping.selector || mapping.selector.trim() === '*' || mapping.fieldName === 'fulltext') {
                    value = $element.text()?.trim();
                    if (value) {
                        value = value.replace(/\s+/g, ' ').trim();
                    }
                    console.log(`[Utils:extractData] Field '${mapping.fieldName}', Extracting FULL TEXT directly from item element. Text Length: ${value?.length || 0}`);
                }
                else {
                    const $targetElements = $element.find(mapping.selector);
                    if ($targetElements.length > 0) {
                        const textParts = [];
                        $targetElements.each((_, elem) => {
                            const text = cheerio.load(elem).text()?.trim();
                            if (text) {
                                textParts.push(text);
                            }
                        });
                        if (textParts.length > 0) {
                            value = textParts.join(' ').replace(/\s+/g, ' ').trim();
                            console.log(`[Utils:extractData] Field '${mapping.fieldName}', Selector '${mapping.selector}', Found ${$targetElements.length} elements, Concatenated Text Length: ${value?.length || 0}`);
                        }
                        else {
                            console.log(`[Utils:extractData] Field '${mapping.fieldName}', Selector '${mapping.selector}', Found ${$targetElements.length} elements, but NO text content extracted.`);
                        }
                    }
                }
                const textParts = [];
                $targetElements.each((_, elem) => {
                    const $elemContext = cheerio.load(elem);
                    const text = $elemContext.text()?.trim();
                    if (text) {
                        textParts.push(text);
                    }
                });
                if (textParts.length > 0) {
                    value = textParts.join(' ').replace(/\s+/g, ' ').trim();
                    console.log(`[Utils:extractData] Field '${mapping.fieldName}', Selector '${mapping.selector}', Found ${$targetElements.length} elements, Concatenated Text Length: ${value?.length || 0}`); // Added log
                }
                else {
                    console.log(`[Utils:extractData] Field '${mapping.fieldName}', Selector '${mapping.selector}', Found ${$targetElements.length} elements, but NO text content extracted.`); // Added log
                }
            }
            else {
                const firstTarget = $targetElements.first();
                if (mapping.extractFrom === 'attribute') {
                    if (mapping.attributeName) {
                        value = firstTarget.attr(mapping.attributeName)?.trim();
                        if (value && (mapping.attributeName === 'href' || mapping.attributeName === 'src')) {
                            try {
                                value = new URL(value, pageUrl).href;
                            }
                            catch (e) {
                                console.warn(`[Utils:extractData] Could not resolve URL: "${value}" on "${pageUrl}"`);
                            }
                        }
                    }
                }
                else if (mapping.extractFrom === 'html') {
                    value = firstTarget.html()?.trim();
                }
            }
        }
        if (value !== undefined && value !== null && value !== '') {
            set(resultData, mapping.fieldName, value);
        }
        else {
            console.log(`[Utils:extractData] Field '${mapping.fieldName}' got no value (selector: ${mapping.selector})`);
        }
    }
    return resultData;
}
export async function scrapeDetailInline(detailUrl, config) {
    console.log(`[Service:scrapeDetailInline] Scraping: ${detailUrl}`);
    try {
        await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250)); // Delay
        const detailHtml = await fetchHTML(detailUrl);
        const detailPage = cheerio.load(detailHtml);
        const specificExclusions = config.scrapeOptions?.excludeSelectors || [];
        const allExclusions = [...new Set([...COMMON_EXCLUDED_SELECTORS, ...specificExclusions])];
        if (allExclusions.length > 0) {
            try {
                detailPage(allExclusions.join(', ')).remove();
            }
            catch (exError) {
                console.warn(`[Service:scrapeDetailInline] Error applying exclusions on ${detailUrl}: ${exError}`);
            }
        }
        const itemSelectorToUse = config.detailItemSelector || config.itemSelector;
        const selectorSource = itemSelectorToUse === config.detailItemSelector ? 'detailItemSelector' :
            'itemSelector (fallback)';
        console.log(`[Service:scrapeDetailInline] Using selector for detail content (${selectorSource}): "${itemSelectorToUse}"`);
        const detailContentElement = detailPage(config.itemSelector).first();
        if (detailContentElement.length === 0) {
            return { error: `Item selector "${config.itemSelector}" not found on detail page.` };
        }
        if (detailContentElement.length > 0) {
            console.log(`[Service:scrapeDetailInline] DEBUG: Detail Content Element HTML (sample): ${detailContentElement.html()?.substring(0, 500)}...`);
            console.log(`[Service:scrapeDetailInline] DEBUG: Detail Content Element Text (sample): ${detailContentElement.text()?.substring(0, 500)}...`); // See what .text() gets here
        }
        const mappingsToUse = (config.detailFieldMappings && config.detailFieldMappings.length > 0)
            ? config.detailFieldMappings
            : config.fieldMappings;
        const mappingSource = mappingsToUse === config.detailFieldMappings ? 'detail' : 'primary (fallback)';
        console.log(`[Service:scrapeDetailInline] Extracting detail data using ${mappingSource} mappings.`);
        const extractedData = extractDataFromElement(detailContentElement, mappingsToUse, detailUrl);
        if (Object.keys(extractedData).length === 0) {
            console.warn(`[Service:scrapeDetailInline] No data extracted from ${detailUrl} using ${mappingSource} mappings.`);
        }
        return { data: extractedData };
    }
    catch (error) {
        console.error(`[Service:scrapeDetailInline] Error fetching/processing ${detailUrl}: ${error.message}`);
        return { error: `Failed to fetch/process detail page: ${error.message}` };
    }
}
export async function processSingleListItem(itemElement, index, config, startUrl, processedDetailUrls) {
    const logPrefix = `[Service:processSingleListItem Item ${index}]`;
    const outcomes = [];
    const listItemData = extractDataFromElement(itemElement, config.fieldMappings, startUrl);
    console.log(`${logPrefix} Extracted list data: ${Object.keys(listItemData).length > 0 ? 'Yes' : 'No'}`);
    if (config.pageType !== 'ListPage' || !config.scrapeDetailsFromList) {
        console.log(`${logPrefix} Inline detail scraping disabled. Skipping link search.`);
        return [];
    }
    const itemHtml = itemElement.html();
    const detailUrls = extractSameDomainLinks(itemHtml, startUrl);
    console.log(`${logPrefix} Found ${detailUrls.length} same-domain links within item block.`);
    if (detailUrls.length === 0) {
        console.log(`${logPrefix} No same-domain links found to scrape inline.`);
        return [];
    }
    for (const detailUrl of detailUrls) {
        console.log(`${logPrefix} Processing link: ${detailUrl}`);
        if (processedDetailUrls.size >= MAX_DETAIL_PAGES_PER_JOB) {
            console.warn(`${logPrefix} Reached detail page limit (${MAX_DETAIL_PAGES_PER_JOB}). Skipping further links for this item and job.`);
            outcomes.push({ type: 'skip', reason: `Detail page limit reached before processing ${detailUrl}` });
            break;
        }
        if (processedDetailUrls.has(detailUrl)) {
            console.log(`${logPrefix} Already processed detail URL: ${detailUrl}. Skipping duplicate.`);
            outcomes.push({ type: 'skip', reason: `Duplicate detail URL: ${detailUrl}` });
            continue;
        }
        processedDetailUrls.add(detailUrl);
        const detailResult = await scrapeDetailInline(detailUrl, config);
        const combinedData = {
            listData: listItemData,
            detailUrl: detailUrl,
            detailData: detailResult.error ? { error: detailResult.error } : detailResult.data ?? {}
        };
        outcomes.push({
            type: 'combined',
            result: {
                url: detailUrl,
                data: combinedData
            }
        });
    }
    return outcomes;
}
