export interface ScrapeOptions {
  contentSelector?: string;
  headingSelectors?: string[];
  contentSelectors?: string[];
  excludeSelectors?: string[];
  minContentLength?: number;
}

export interface ScrapedLink {
  text: string;
  url: string;
}


export interface ScrapedSection {
  _id?: string; 
  heading: string | null;
  content: string;
  links: ScrapedLink[];
}


export interface ScrapedData {
  _id: string; 
  url: string;
  title: string; 
  sections: ScrapedSection[];
  scrapedAt: string; 
  createdAt: string; 
  updatedAt: string; 

}


export interface ScrapeSuccessResponse {
  success: true;
  data: ScrapedData;
}


export interface ScrapeErrorResponse {
  error: string;

}