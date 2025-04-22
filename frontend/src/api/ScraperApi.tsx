import axios, { AxiosError } from 'axios';
import {
    ApiErrorResponse,
    ApiPaginatedResponse,
    ApiSuccessResponse,
    JobAcceptedResponse,
    ScraperConfiguration,
    ScraperConfigurationData,
    ScrapedDataItem,
    EngineSettingsData,
    MultiJobAcceptedResponse,
    GetScrapedDataParams
} from "../Types"

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const API = axios.create({ baseURL: API_BASE_URL + '/api' });


export const getConfigurations = async (): Promise<ScraperConfiguration[]> => {
    try {
        const response = await API.get<ApiSuccessResponse<ScraperConfiguration[]>>('/configurations');
        return response.data.data;
    } catch (err) {
        console.error("API Error fetching configurations:", err);
        throw err; 
    }
};

export const getConfigurationById = async (id: string): Promise<ScraperConfiguration> => {
     try {
        const response = await API.get<ApiSuccessResponse<ScraperConfiguration>>(`/configurations/${id}`);
        return response.data.data;
    } catch (err) {
        console.error(`API Error fetching configuration ${id}:`, err);
        throw err;
    }
};

export const createConfiguration = async (configData: ScraperConfigurationData): Promise<ScraperConfiguration> => {
     try {
        const response = await API.post<ApiSuccessResponse<ScraperConfiguration>>('/configurations', configData);
        return response.data.data;
    } catch (err) {
        console.error("API Error creating configuration:", err);
        throw err;
    }
};

export const updateConfiguration = async (id: string, configData: Partial<ScraperConfigurationData>): Promise<ScraperConfiguration> => {
     try {
        const response = await API.put<ApiSuccessResponse<ScraperConfiguration>>(`/configurations/${id}`, configData);
        return response.data.data;
    } catch (err) {
        console.error(`API Error updating configuration ${id}:`, err);
        throw err;
    }
};

export const deleteConfiguration = async (id: string): Promise<{ message: string }> => {
     try {
        const response = await API.delete<ApiSuccessResponse<{ message: string }>>(`/configurations/${id}`);
        return { message: response.data.message || 'Configuration deleted successfully.' };
    } catch (err) {
        console.error(`API Error deleting configuration ${id}:`, err);
        throw err;
    }
};



export const runScrapeJob = async (configId: string): Promise<JobAcceptedResponse> => {
     try {
        const response = await API.post<JobAcceptedResponse>(`/scrape-jobs/${configId}/run`);
        return response.data;
    } catch (err) {
        console.error(`API Error running job for config ${configId}:`, err);
        throw err;
    }
};

export const runMultipleScrapeJobs = async (configIds: string[]): Promise<MultiJobAcceptedResponse> => {
    try {
        const response = await API.post<MultiJobAcceptedResponse>(`/scrape-jobs/run-multiple`, { configIds });
        return response.data;
    } catch (err) {
        console.error(`API Error running multiple jobs:`, err);
        throw err;
    }
};

export const getEngineSettings = async (): Promise<EngineSettingsData> => {
    try {
        const response = await API.get<ApiSuccessResponse<EngineSettingsData>>('/engine-settings');
        return response.data.data;
    } catch (err) {
        console.error("API Error fetching engine settings:", err);
        throw err;
    }
};

export const updateEngineSettings = async (settingsData: EngineSettingsData): Promise<EngineSettingsData> => {
    try {
        const response = await API.put<ApiSuccessResponse<EngineSettingsData>>('/engine-settings', settingsData);
         if(response.data.message) {
             console.info("Update Engine Settings Message:", response.data.message);
         }
        return response.data.data;
    } catch (err) {
        console.error("API Error updating engine settings:", err);
        throw err;
    }
};



export const getScrapedData = async (params: GetScrapedDataParams): Promise<ApiPaginatedResponse<ScrapedDataItem>> => {
     try {
        const response = await API.get<ApiPaginatedResponse<ScrapedDataItem>>('/scraped-data', { params });
        return response.data;
    } catch (err) {
        console.error(`API Error fetching scraped data for config ${params.configId}:`, err);
        throw err;
    }
};



export const getApiErrorMessage = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        if (axiosError.response?.data?.error) {
            return axiosError.response.data.error;
        }
        return axiosError.message;
    } else if (error instanceof Error) {
        return error.message;
    }
    return "An unknown error occurred.";
};