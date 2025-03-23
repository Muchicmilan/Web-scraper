import axios from "axios";
import * as cheerio from "cheerio";

interface ScrapeOptions {
  contentSelector?: string;  
  headingSelectors?: string[];    
  contentSelectors?: string[];    
  excludeSelectors?: string[];    
  minContentLength?: number;      
}

/**
 * Advanced scraper engine with customizable options
 * @param url - URL of website to scrape
 * @param options - Customization options for the scraper
 * @returns A JSON object containing filtered information about the website
 */
export async function scrapeWebsite(url: string, options: ScrapeOptions = {}): Promise<any | null> {
    try {
        const { data } = await axios.get(url);
        const cheerioRead = cheerio.load(data);
        
        const title = cheerioRead("title").text();
        
        // Default selectors if none provided
        const contentSelector = options.contentSelector || "article, section, main, .content, .article, .post";
        const headingSelectors = options.headingSelectors || ["h1", "h2", "h3", "h4"];
        const contentSelectors = options.contentSelectors || ["p, span"];
        const excludeSelectors = options.excludeSelectors || [".sidebar", ".comment", ".footer", ".nav", ".advertisement"];
        const minContentLength = options.minContentLength || 50;
        
        // Remove elements that should be excluded
        excludeSelectors.forEach(selector => {
            cheerioRead(selector).remove();
        });
        
        const sections = cheerioRead(contentSelector)
            .map((_, el) => {
                const section = cheerioRead(el);
                
                let heading = "";
                for (const selector of headingSelectors) {
                    heading = section.find(selector).first().text().trim();
                    if (heading) break;
                }
                
                const contentParts: string[] = [];
                for (const selector of contentSelectors) {
                    section.find(selector).each((_, el) => {
                        const text = cheerioRead(el).text().trim();
                        if (text) contentParts.push(text);
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
                
                if (heading && content.length >= minContentLength) {
                    return { heading, content, links };
                }
                
                return null;
            })
            .get()
            .filter(Boolean);
        
        return { url, title, sections };
    } catch (error) {
        console.error("Scraping error: ", error);
        return null;
    }
}