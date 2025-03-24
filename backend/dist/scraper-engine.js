import axios from "axios";
import * as cheerio from "cheerio";
/**
 * Advanced scraper engine with customizable options
 * @param url - URL of website to scrape
 * @param options - Customization options for the scraper
 * @returns A JSON object containing filtered information about the website
 */
export async function scrapeWebsite(url, options = {}) {
    try {
        const { data } = await axios.get(url);
        const cheerioRead = cheerio.load(data);
        const title = cheerioRead("title").text();
        const contentSelector = options.contentSelector || "article, section, main, .content, .article, .post";
        const headingSelectors = options.headingSelectors || ["h1", "h2", "h3", "h4"];
        const contentSelectors = options.contentSelectors || ["p, span"];
        const excludeSelectors = options.excludeSelectors || [".sidebar", ".comment", ".footer", ".nav", ".advertisement"];
        const minContentLength = options.minContentLength || 500;
        excludeSelectors.forEach(selector => {
            cheerioRead(selector).remove();
        });
        const sections = cheerioRead(contentSelector)
            .map((_, el) => {
            const section = cheerioRead(el);
            let heading = "";
            for (const selector of headingSelectors) {
                heading = section.find(selector).first().text().trim();
                if (heading)
                    break;
            }
            const contentParts = [];
            for (const selector of contentSelectors) {
                section.find(selector).each((_, el) => {
                    const text = cheerioRead(el).text().trim();
                    if (text)
                        contentParts.push(text);
                });
            }
            const content = contentParts.join(" ");
            const links = section
                .find("a")
                .map((_, a) => {
                const link = cheerioRead(a);
                const text = link.text().trim();
                const href = link.attr("href") || "";
                if (!text || !href || href === "#" || href.startsWith("javascript:")) {
                    return null;
                }
                return { text, url: href };
            })
                .get()
                .filter(Boolean);
            const linkTexts = links.map(link => link.text);
            const linkUrls = links.map(link => link.url);
            if (heading && content.length >= minContentLength) {
                return { heading, content, links, linkTexts, linkUrls };
            }
            return null;
        })
            .get()
            .filter(Boolean);
        return { url, title, sections };
    }
    catch (error) {
        console.error("Scraping error: ", error);
        return null;
    }
}
