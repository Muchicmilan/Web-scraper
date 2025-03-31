export interface ScrapeOptions {
    contentSelector?: string;
    headingSelectors?: string[];
    contentSelectors?: string[];
    excludeSelectors?: string[];
    minContentLength?: number;
    scrapeLinkedPages? : boolean;
    tags?: string[];
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

  export interface CreateScrapeRequestBody{
    url?: string;
    options?: Partial<ScrapeOptions> & {
      scrapeLinkedPages?: boolean;
      tags?: string[]; // or keywords
    }
  }
