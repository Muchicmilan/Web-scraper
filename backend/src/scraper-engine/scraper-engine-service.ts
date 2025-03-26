import axios from "axios";
import * as cheerio from "cheerio";
import {
    ScrapeOptions,
    ScrapedData,
    ScrapedSection,
    ScrapedLink
} from "./scraper-engine-types.js"
import {
    COMMON_EXCLUDED_SELECTORS,
    DEFAULT_HEADING_SELECTORS,
    DEFAULT_TEXT_CONTAINER_SELECTORS,
    DEFAULT_CONTENT_SELECTORS,
    DEFAULT_MIN_CONTENT_LENGTH,
    AXIOS_REQUEST_TIMEOUT,
    DEFAULT_USER_AGENT
} from "./scraper-engine-constants.js"

/*
@param element - element for searching
@param baseURL - URL for resolving links
@param cheerioRead - CheerioAPI
@returns - Array of extracted links
*/

function extractLinks(
    //trenutni workaround za cheerio<any>
    element: cheerio.Cheerio<any>,
    baseURL: string,
    cheerioRead: cheerio.CheerioAPI
): ScrapedLink[] {
    const links: ScrapedLink[] = [];
    const uniqueURLs = new Set<string>();

    element.find("a").each((_,a) => {
        const link = cheerioRead(a);
        const text = link.text().trim();
        let href = link.attr("href")?.trim();

        if(!href || href === "#" || href.startsWith("javascript:") || href.startsWith("mailto:"))
            return;
        
        try{
            if(href.startsWith("//")){
                href = new URL(baseURL).protocol + href;
            }
            const absoluteURL = new URL(href, baseURL).href;

            if(absoluteURL.startsWith("http") && !uniqueURLs.has(absoluteURL)){
                const linkText = text || absoluteURL
                links.push({text: linkText, url: absoluteURL});
                uniqueURLs.add(absoluteURL);
            }
        }catch (error){
            console.warn(`Invalid URL found: ${link.attr("href")}, skipping`);
        }
    });
    return links;
}

/*
@param url - url from which to fetch the html document
@returns html document
*/
async function fetchHTML(url: string): Promise<string> {
    try{
        const {data} = await axios.get(url, {
            headers: {
                "User-Agent": DEFAULT_USER_AGENT
            },
            timeout: AXIOS_REQUEST_TIMEOUT,
        });
        return data;
    }catch(error: any){
        if(axios.isAxiosError(error)){
            console.error(`Axios Error fetching ${url}: ${error.message} (Status: ${error.response?.status})`);
            throw new Error(`Failed to fetch URL: ${url}. Status: ${error.response?.status || 'N/A'}`);
        }else {
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

function parseHTML(html: string, url: string, options: ScrapeOptions): ScrapedData | null {
    const cheerioRead = cheerio.load(html);

    if(!cheerioRead("body").length){
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

    const sections : ScrapedSection[] = [];
    const mainContentElements = cheerioRead(contentSelector);

    if (mainContentElements.length === 0){
        console.warn(`Content selector "${contentSelector}" did not match any elements on ${url}. Trying body fallback.`);
    }

    mainContentElements.each((_,el) =>{
        const elementCheerio = cheerioRead(el);
        
        if (elementCheerio.parents(contentSelector).length > 0 && mainContentElements.length > 1)
            return;
        
        let heading: string | null = null;
        for (const selector of headingSelectors){
            heading = elementCheerio.find(selector).first().text().trim();
            if(heading) break;
        }

        const content = elementCheerio.text().replace("/\s+g", " ").trim()

        if(content.length >= minContentLength && content !== heading){
            const links = extractLinks(elementCheerio, url, cheerioRead);
            sections.push({heading: heading || null, content, links});
        }
    });

    if (sections.length === 0){
        console.warn(`Scraping yielded no content sections for URL: ${url}`);
        return null;
    }
    return {url, title, sections}
}

export async function scrapeWebsite(url: string, options: ScrapeOptions = {}): Promise<ScrapedData | null> {
    try {
        const html = await fetchHTML(url);
        const ScrapedData = parseHTML(html, url, options);
        return ScrapedData;
    }catch (error: any){
        console.error(`Scraping failed for ${url}: ${error.message}`);
        return null;
    }
}
