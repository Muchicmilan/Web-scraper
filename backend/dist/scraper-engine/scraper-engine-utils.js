import * as cheerio from "cheerio";
import { DEFAULT_CONTENT_SELECTORS, DEFAULT_HEADING_SELECTORS, COMMON_EXCLUDED_SELECTORS, DEFAULT_MIN_CONTENT_LENGTH } from "./scraper-engine-constants.js";
/*
@param htmlContent - html content for extracting links from
@param baseURL - the starting url from which to compare if the domain names are matching
*/
export function extractLinks(htmlContent, baseURL) {
    let targetDomain;
    try {
        const base = new URL(baseURL);
        targetDomain = base.hostname.toLowerCase();
    }
    catch (e) {
        console.error(`[extractLinks] Invalid baseURL provided: "${baseURL}". Cannot extract domain-specific links.`);
        return [];
    }
    const cheerioRead = cheerio.load(htmlContent);
    const matchingDomainUrls = [];
    const uniqueURLStrings = new Set();
    cheerioRead("a").each((_, element) => {
        const link = cheerioRead(element);
        let href = link.attr("href")?.trim();
        if (!href || href === "#" || href.startsWith("javascript:") || href.startsWith("mailto:")) {
            return;
        }
        try {
            const absoluteURL = new URL(href, baseURL);
            const linkDomain = absoluteURL.hostname.toLowerCase();
            if (absoluteURL.href.startsWith("http") &&
                linkDomain === targetDomain &&
                !uniqueURLStrings.has(absoluteURL.href)) {
                matchingDomainUrls.push(absoluteURL);
                uniqueURLStrings.add(absoluteURL.href);
            }
        }
        catch (error) {
            if (error instanceof TypeError) {
                console.warn(`[extractLinks] Invalid URL format: "${link.attr("href")}" relative to "${baseURL}". Skipping.`);
            }
            else {
                console.warn(`[extractLinks] Error processing link "${link.attr("href")}":`, error);
            }
        }
    });
    console.log(`[extractLinks] Found ${matchingDomainUrls.length} unique HTTP/S links matching domain "${targetDomain}".`);
    return matchingDomainUrls;
}
/*
@param html - html document to parse from
@param url - url from which the html document was fetched from
@param options - user or default selected parameters for html parsing
@returns - json schema of parsed content
*/
export function parseHTML(html, url, options) {
    const cheerioRead = cheerio.load(html);
    if (!cheerioRead("body").length) {
        console.warn(`No <body> tag found for URL: ${url}. Possibly not HTML.`);
        return null;
    }
    const title = cheerioRead("title").text().trim() ||
        cheerioRead("h1").first().text().trim() ||
        "Untitled";
    const contentSelector = options.contentSelector || DEFAULT_CONTENT_SELECTORS.join(", ");
    const headingSelectors = options.headingSelectors && options.headingSelectors.length > 0 ?
        options.headingSelectors : DEFAULT_HEADING_SELECTORS;
    const baseExcludeSelectors = options.excludeSelectors && options.excludeSelectors.length > 0 ?
        options.excludeSelectors : COMMON_EXCLUDED_SELECTORS;
    const excludeSelectors = [...new Set([...baseExcludeSelectors, 'script', 'style', 'noscript', 'iframe', 'header', 'footer', 'nav', '.nav', '.navbar', 'aside', '.sidebar'])];
    const minContentLength = options.minContentLength !== undefined ? options.minContentLength : DEFAULT_MIN_CONTENT_LENGTH;
    cheerioRead(excludeSelectors.join(", ")).remove();
    const sections = [];
    const mainContentElements = cheerioRead(contentSelector);
    if (mainContentElements.length === 0) {
        console.warn(`Content selector "${contentSelector}" did not match any elements on ${url}. Trying body fallback.`);
    }
    mainContentElements.each((_, el) => {
        const elementCheerio = cheerioRead(el);
        if (elementCheerio.parents(contentSelector).length > 0 && mainContentElements.length > 1)
            return;
        let heading = null;
        for (const selector of headingSelectors) {
            heading = elementCheerio.find(selector).first().text().trim();
            if (heading)
                break;
        }
        const contentElement = elementCheerio.clone();
        if (heading) {
            contentElement.find(headingSelectors.join(',')).filter((i, headEl) => cheerioRead(headEl).text().trim() === heading).remove();
        }
        const content = elementCheerio.text().replace(/\s+/g, " ").trim();
        if (content.length >= minContentLength) {
            if (content !== heading)
                sections.push({ heading: heading || null, content });
            else if (!heading) {
                sections.push({ heading: null, content });
            }
        }
    });
    if (sections.length === 0) {
        console.warn(`Scraping yielded no content sections for URL: ${url}`);
        return null;
    }
    return { url, title, sections };
}
export function isKeywordFound(content, keywords) {
    if (!keywords || keywords.length === 0)
        return true;
    if (!content)
        return false;
    let searchableContent = content.title ? content.title.toLowerCase() : "";
    content.sections.forEach(section => {
        searchableContent += " " + (section.content ? section.content.toLowerCase() : "");
    });
    if (!searchableContent.trim())
        return false;
    for (const keyword of keywords) {
        const lowerCaseKeyword = keyword.toLowerCase().trim();
        if (!lowerCaseKeyword)
            continue;
        if (searchableContent.includes(lowerCaseKeyword))
            return true;
    }
    return false;
}
