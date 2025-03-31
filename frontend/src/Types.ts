export interface ScrapeOptions {
  contentSelector?: string;
  headingSelectors?: string[];
  contentSelectors?: string[];
  excludeSelectors?: string[];
  minContentLength?: number;
  scrapeLinkedPages?: boolean;
}


export interface ScrapedSection {
  _id?: string; 
  heading: string | null;
  content: string;
}


export interface ScrapedData {
  _id: string; 
  url: string;
  title: string; 
  sections: ScrapedSection[];
  tags?: string[];
  scrapedAt: string; 
  createdAt: string; 
  updatedAt: string; 

}


export interface ScrapeSuccessResponse {
  success: true;
  data: ScrapedData;
  message?: string;
}


export interface ScrapeErrorResponse {
  error: string;
}

export interface ScrapeMultiSuccessResponse {
  success: true;
  message: string;
  count: number;
  data: ScrapedData[];
}

export function isMultiScrapeResponse(response: ScrapeSuccessResponse | ScrapeMultiSuccessResponse): response is ScrapeMultiSuccessResponse {
  return Array.isArray(response.data);
}


export interface ScrapeErrorResponse {
error: string;
}

export type ScrapeRequestBodyOptions = Partial<ScrapeOptions> & {
  scrapeLinkedPages?: boolean;
  tags?: string[];
};