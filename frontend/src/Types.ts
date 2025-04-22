import { ObjectId } from 'mongoose';


export interface FieldMapping {
    fieldName: string;
    selector: string;
    extractFrom: 'text' | 'attribute' | 'html';
    attributeName?: string;
}


export interface ScrapedDataItem {
    _id: string;
    configId: string; 
    url: string;
    scrapedAt: string;
    data: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}


export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
    count?: number; 
}

export interface ApiPaginatedResponse<T> extends ApiSuccessResponse<T[]> {
     pagination: {
        totalItems: number;
        itemCount: number;
        itemsPerPage: number;
        currentPage: number;
        totalPages: number;
    };
}

export interface ScraperConfiguration {
    _id: string;
    name: string;
    startUrls: string[];
    pageType: 'ListPage' | 'DetailPage';
    itemSelector: string;
    scrapeDetailsFromList?: boolean;
    scrapeOptions?: {
        excludeSelectors?: string[];
    };
    targetSchema: any;
    fieldMappings: FieldMapping[];
    detailItemSelector?: string;
    detailTargetSchema?: any;
    detailFieldMappings?: FieldMapping[];
    keywordsToFilterBy?: string[];
    cronSchedule?: string,
    cronEnabled?: boolean,
    enableScreenshots?: boolean,
    screenshotOptions?: {
        fullPage?: boolean;
    }
    createdAt: string;
    updatedAt: string;
  }


export interface ApiErrorResponse {
    success?: false;
    error: string;
}

export interface JobAcceptedResponse extends ApiSuccessResponse<null>{
    message: string;
} 

export interface MultiJobAcceptedResponse extends ApiSuccessResponse<null>{
    message: string;
    job_requested: string[];
    job_found: string[];
}

export interface EngineSettingsData {
    maxPoolSize: number;
    minPoolSize: number;
    idleTimeoutMs: number;
    retryLimit: number;
}

export interface GetScrapedDataParams {
    configId: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: number;
}

export type ScraperConfigurationData = Omit<ScraperConfiguration, '_id' | 'createdAt' | 'updatedAt'>;