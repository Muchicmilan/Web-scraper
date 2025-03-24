//Implementirano jer mi nije radila relativna putanja iz scraper-engine

export interface ScrapeOptions {
    contentSelector?: string;
    headingSelectors?: string[];
    contentSelectors?: string[];
    excludeSelectors?: string[];
    minContentLength?: number;
  }
  
  export interface ScrapedSection {
    heading: string;
    content: string;
    links: { text: string; url: string }[];
  }
  
  export interface ScrapedData {
    url: string;
    title: string;
    sections: ScrapedSection[];
  }