import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { 
    ScrapeSuccessResponse,
    ScrapeErrorResponse,
    ScrapeMultiSuccessResponse,
    ScrapeRequestBodyOptions
    } from '../Types';

type ScraperResults = ScrapeSuccessResponse | ScrapeMultiSuccessResponse | null;

interface UseScraperReturn {
    results: ScraperResults
    error: string | null;
    loading: boolean;
    scrapeUrl: (url: string, options?: ScrapeRequestBodyOptions) => Promise<void>;
}

export const useScraper = (apiUrl: string): UseScraperReturn => {
    const [results, setResults] = useState<ScraperResults>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const scrapeUrl = async (url: string, options?: ScrapeRequestBodyOptions): Promise<void> => {
        if (!url.trim()) {
            setError("URL cannot be empty.");
            return;
        }
        try {
            new URL(url);
        } catch (_) {
            setError("Invalid URL format. Please include http:// or https://");
            return;
        }

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const payload = options && Object.keys(options).length > 0
                ? { url: url.trim(), options }
                : { url: url.trim() };

            console.log("Sending request to:", apiUrl, "Payload:", payload);

            const response = await axios.post<ScrapeSuccessResponse | ScrapeMultiSuccessResponse>(apiUrl, payload);

            console.log("Received response Status:", response.status, "Data:", response.data);

            if ((response.status === 200 || response.status === 201) && response.data.success) {
                setResults(response.data);
            } else {
                setError(`Received unexpected success response status: ${response.status}`);
                console.error("Unexpected success response:", response);
            }
        } catch (err: any) {
            console.error("API Request Error in hook:", err);
            let errorMessage = "An unexpected error occurred.";
            if (axios.isAxiosError(err)) {
                const axiosError = err as AxiosError<ScrapeErrorResponse>;
                if (axiosError.response) {
                    const backendError = axiosError.response.data?.error;
                    errorMessage = `Error ${axiosError.response.status}: ${backendError || axiosError.message}`;
                } else if (axiosError.request) {
                    errorMessage = "No response received from server.";
                } else {
                    errorMessage = `Request setup error: ${axiosError.message}`;
                }
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            setResults(null);
        } finally {
            setLoading(false);
        }
    };

    return { results, error, loading, scrapeUrl };
};