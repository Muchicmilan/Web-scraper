import axios from "axios";
import * as cheerio from "cheerio";
import { COMMON_EXCLUDED_SELECTORS, DEFAULT_HEADING_SELECTORS, DEFAULT_CONTENT_SELECTORS, DEFAULT_MIN_CONTENT_LENGTH, AXIOS_REQUEST_TIMEOUT, DEFAULT_USER_AGENT } from "./scraper-engine-constants.js";
import { ScrapedDataModel } from "./scrape-engine-schema.js";
/*
@param htmlContent - html content for extracting links from
@param baseURL - the starting url from which to compare if the domain names are matching
*/
function extractLinks(htmlContent, baseURL) {
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
@param url - url from which to fetch the html document
@returns html document
*/
async function fetchHTML(url) {
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
/*
@param html - html document to parse from
@param url - url from which the html document was fetched from
@param options - user or default selected parameters for html parsing
@returns - json schema of parsed content
*/
function parseHTML(html, url, options) {
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
        const content = elementCheerio.text().replace(/\s+/g, " ").trim();
        if (content.length >= minContentLength && content !== heading) {
            sections.push({ heading: heading || null, content });
        }
    });
    if (sections.length === 0) {
        console.warn(`Scraping yielded no content sections for URL: ${url}`);
        return null;
    }
    return { url, title, sections };
}
/*
@param url - url of the website for scraping
@param options - parameters set by the user for customizable scraping
@returns - content in the form of a json file
scrapes a website from a user inputed url, and saves it to the scrapeddatas schema
*/
export async function scrapeAndSave(url, options = {}) {
    let parsedData;
    try {
        const html = await fetchHTML(url);
        parsedData = parseHTML(html, url, options);
    }
    catch (error) {
        console.error("Error during fetch ", error);
        throw error;
    }
    if (!parsedData)
        throw new Error("Parsing failed or yielded no content");
    try {
        const dataForStoring = new ScrapedDataModel(parsedData);
        await dataForStoring.save();
        return dataForStoring;
    }
    catch (error) {
        console.error("Error saving data ", error);
        throw error;
    }
}
export async function scrapeEveryLinkFromWebsite(baseUrl, options = {}) {
    const scrapedDatas = [];
    const processedUrls = new Set();
    let extractedUrls;
    try {
        const html = await fetchHTML(baseUrl);
        extractedUrls = extractLinks(html, baseUrl);
    }
    catch (error) {
        console.error(`failed to fetch html from ${baseUrl}, ${error}`);
        return [];
    }
    for (const url of extractedUrls) {
        try {
            const linkData = await scrapeAndSave(url.href, options);
            scrapedDatas.push(linkData);
            processedUrls.add(url.href);
        }
        catch (error) {
            if (error.code === 11000) {
                console.error(`Data for this url: ${url.href} already exists`);
                processedUrls.add(url.href);
            }
            else
                console.error(`failed to scrape ${url.href}: ${error.message}`);
        }
    }
    return scrapedDatas;
}
export async function findOne(id) {
    try {
        const scrapedData = await ScrapedDataModel.findById(id);
        return scrapedData;
    }
    catch (error) {
        console.error("Database error in function findOne", error);
        throw error;
    }
}
export async function findAll() {
    try {
        const allData = await ScrapedDataModel.find().sort({ createdAt: -1 });
        return allData;
    }
    catch (error) {
        console.error("Database error in findAll", error);
        throw error;
    }
}
export async function findOneByUrl(url) {
    try {
        const scrapedData = await ScrapedDataModel.findOne({ url: url });
        return scrapedData;
    }
    catch (error) {
        console.error("Error in findOneByUrl", error);
        throw error;
    }
}
