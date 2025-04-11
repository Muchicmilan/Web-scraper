export interface ScrapeOptions {
  excludeSelectors?: string[];
}

export type ExtractedData = Record<string, any>;

export interface ProcessingResult {
  url: string;
  data: ExtractedData;
}

export type SingleItemOutcome =
    | { type: 'combined'; result: ProcessingResult }
    | { type: 'queue'; url: string }          
    | { type: 'direct'; result: ProcessingResult }
    | { type: 'skip'; reason: string }; 