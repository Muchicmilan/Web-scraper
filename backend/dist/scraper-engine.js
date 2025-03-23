import axios from "axios";
import * as cheerio from "cheerio";
/*
Basic scraper engine
@param URL - Functions paramater is the url of a website to scrape
@returns A JSON object containing information about the website

*/
export async function scrapeWebsite(url) {
    try {
        const { data } = await axios.get(url);
        const cheerioRead = cheerio.load(data);
        const title = cheerioRead("title").text();
        const sections = cheerioRead("article, section, div")
            .map((_, el) => {
            const section = cheerioRead(el);
            const heading = section
                .find("h1, h2, h3, h4, h5, h6")
                .first()
                .text()
                .trim();
            const content = section
                .find("p, span")
                .map((_, p) => cheerioRead(p).text().trim())
                .get()
                .join(" ");
            const links = section
                .find("a")
                .map((_, a) => ({
                text: cheerioRead(a).text().trim(),
                url: cheerioRead(a).attr("href") || "",
            }))
                .get();
            if (heading || content || links.length) {
                return { heading, content, links };
            }
            return null;
        })
            .get();
        return { url, title, sections };
    }
    catch (error) {
        console.error("Scraping error: ", error);
        return null;
    }
}
