import axios from "axios";
import { AXIOS_REQUEST_TIMEOUT, DEFAULT_USER_AGENT } from "./scraper-engine-constants.js";
import { ScrapedDataModel } from "./scrape-engine-schema.js";
import { extractLinks, isKeywordFound, parseHTML } from "./scraper-engine-utils.js";
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
@param url - url of the website for scraping
@param options - parameters set by the user for customizable scraping
@param tags - optinal user defined input for keyword based scraping
@returns - content in the form of a json file
scrapes a website from a user inputed url, and saves it to the scrapeddatas schema
*/
export async function scrapeAndSave(url, options = {}, keywords) {
    let parsedData;
    try {
        const html = await fetchHTML(url);
        parsedData = parseHTML(html, url, options);
    }
    catch (error) {
        console.error("Error during fetch ", error);
        throw error;
    }
    if (!parsedData) {
        throw new Error("Parsing failed or yielded no content");
    }
    let passedFilter = true;
    if (keywords && keywords.length > 0)
        passedFilter = isKeywordFound(parsedData, keywords);
    if (!passedFilter) {
        console.log(`[scrapeAndSave] Content from ${url} did not pass keyword filter. Not saving.`);
        return null;
    }
    try {
        const dataForStoring = new ScrapedDataModel({
            ...parsedData,
            tags: keywords && keywords.length > 0 ? keywords : undefined,
            scrapedAt: new Date()
        });
        await dataForStoring.save();
        return dataForStoring;
    }
    catch (error) {
        console.error("Error saving data ", error);
        throw error;
    }
}
/*
@param baseUrl - homepage url which will be used to fetch all the links from the homepage
@param option - user defined parameters for scraping
@param tags - optinal user defined input for keyword based scraping
@return - returns an array of scraped content
*/
export async function scrapeEveryLinkFromWebsite(baseUrl, options = {}, keywords) {
    const filteredScrapedData = [];
    const processedUrls = new Set();
    processedUrls.add(baseUrl);
    let extractedUrls;
    const html = await fetchHTML(baseUrl);
    extractedUrls = extractLinks(html, baseUrl);
    for (const url of extractedUrls) {
        const urlString = url.href;
        if (processedUrls.has(urlString))
            continue;
        processedUrls.add(urlString);
        console.log(`[scrapeEveryLink] Processing link (${filteredScrapedData.length} saved so far): ${urlString}`);
        try {
            const linkData = await scrapeAndSave(urlString, options, keywords);
            if (linkData) {
                filteredScrapedData.push(linkData);
            }
        }
        catch (error) {
            if (error.code === 11000) {
                console.warn(`[scrapeEveryLink] Data for linked URL ${urlString} already exists. Retrieving.`);
                try {
                    const existingLinkData = await findOneByUrl(urlString);
                    if (existingLinkData)
                        filteredScrapedData.push(existingLinkData);
                }
                catch (findError) {
                    console.error(`[scrapeEveryLink] Error retrieving existing data for ${urlString} after conflict:`, findError);
                }
            }
            else {
                console.error(`[scrapeEveryLink] Failed to process linked URL ${urlString}: ${error.message}`);
            }
        }
    }
    return filteredScrapedData;
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
