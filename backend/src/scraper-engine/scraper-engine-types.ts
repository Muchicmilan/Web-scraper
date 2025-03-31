import * as cheerio from "cheerio";

export interface ScrapeOptions {
    contentSelector?: string;
    headingSelectors?: string[];
    contentSelectors?: string[];
    excludeSelectors?: string[];
    minContentLength?: number;
    scrapeLinkedPages? : boolean;
  }

  export interface ScrapedLink {
    text: string;
    url: string;
  }

  export interface ScrapedSection {
    heading : string | null;
    content: string;
  }

  export interface ScrapedData {
    url: string;
    title: string;
    sections: ScrapedSection[];
  }

