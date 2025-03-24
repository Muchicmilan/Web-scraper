import axios from "axios";
import * as cheerio from "cheerio";
//Kontstante kao trenutno resenje za neke ceste selektore
const COMMON_EXCLUDED_SELECTORS = [
  ".sidebar",
  ".comment",
  ".footer",
  ".nav",
  ".advertisement",
  ".code-block",
  ".newsletter-form-wrapper",
  "script",
  "style",
  "noscript",
  "iframe",
  ".hidden",
  "[style*='display: none']",
];
const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"];
const TEXT_CONTAINERS = ["p", "span", "li", "div"];

interface ScrapeOptions {
  contentSelector?: string;
  headingSelectors?: string[];
  contentSelectors?: string[];
  excludeSelectors?: string[];
  minContentLength?: number;
}

interface ScrapedSection {
  heading: string;
  content: string;
  links: { text: string; url: string }[];
}

export interface ScrapedData {
  url: string;
  title: string;
  sections: ScrapedSection[];
}

export async function scrapeWebsite(url: string,options: ScrapeOptions = {}): Promise<ScrapedData | null> {
  try {
    const { data } = await axios.get(url, {
      headers: {
        //Has to have a user agent, some websites require it
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/58.0.3029.110 Safari/537.3",
      },
    });
    const cheerioRead = cheerio.load(data);

    const title = cheerioRead("title").text();

    const contentSelector =
      options.contentSelector ||
      "article, section, main, .content, .article, .post, .entry-content, .prose";
    const headingSelectors = options.headingSelectors || HEADINGS;
    const contentSelectors = options.contentSelectors || TEXT_CONTAINERS;
    const excludeSelectors = options.excludeSelectors || COMMON_EXCLUDED_SELECTORS;
    const minContentLength = options.minContentLength || 100;

    cheerioRead(excludeSelectors.join(", ")).remove(); //Uklanjanje datih selektore pri pretrazi

    const sections: ScrapedSection[] = [];

    cheerioRead(contentSelector).each((_, el) => {
      const section = cheerioRead(el);
      let heading = "";
      //Trazi prvi heading kao naslov za dat section
      for (const selector of headingSelectors) {
        heading = section
          .find(selector)
          .first()
          .text()
          .trim();
        if (heading) break;
      }
      //Obilazi celinu
      const contentParts: string[] = [];
      for (const selector of contentSelectors) {
        section.find(selector).each((_, el) => {
          const text = cheerioRead(el).text().trim();
          if (text) {
            contentParts.push(text);
          }
        });
      }

      const content = contentParts.join(" ").replace(/\s+/g, " ").trim(); // Clean up whitespace
      //Zavrsava datu celinu kada dostignemo content limit, zatim vuce sve linkove
      if (heading && content.length >= minContentLength) {
        const links: { text: string; url: string }[] = [];

        section.find("a").each((_, a) => {
          const link = cheerioRead(a);
          const text = link.text().trim();
          let href = link.attr("href") || "";

          if (!text || !href || href === "#" || href.startsWith("javascript:")) {
            return;
          }

          // Relative url handling
          try {
            href = new URL(href, url).href;
          } catch (error) {
            console.warn(`Invalid URL: ${href}, skipping`);
            return; // Skip invalid URLs
          }

          links.push({ text, url: href });
        });

        sections.push({ heading, content, links });
      }
    });

    return { url, title, sections };
  } catch (error) {
    console.error("Scraping error: ", error);
    return null;
  }
}
export default scrapeWebsite
