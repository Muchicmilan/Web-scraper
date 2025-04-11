import React, { createContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { ScraperConfiguration, ScrapedDataItem, ApiPaginatedResponse } from "../Types"
import * as api from "../api/ScraperApi"
import { getApiErrorMessage } from "../api/ScraperApi"

interface ScraperState {
    configurations: ScraperConfiguration[];
    selectedConfiguration: ScraperConfiguration | null;
    scrapedData: ScrapedDataItem[];
    pagination: ApiPaginatedResponse<any>['pagination'] | null;
    isLoading: boolean;
    error: string | null;
    jobStatus: string | null;
}

interface ScraperContextProps extends ScraperState {
    fetchConfigurations: () => Promise<void>;
    fetchConfigurationById: (id: string) => Promise<void>;
    createConfiguration: (data: Omit<ScraperConfiguration, '_id'|'createdAt'|'updatedAt'>) => Promise<ScraperConfiguration | null>;
    updateConfiguration: (id: string, data: Partial<Omit<ScraperConfiguration, '_id'|'createdAt'|'updatedAt'>>) => Promise<ScraperConfiguration | null>;
    deleteConfiguration: (id: string) => Promise<boolean>;
    runJob: (configId: string) => Promise<void>;
    fetchScrapedData: (configId: string, page?: number, limit?: number) => Promise<void>;
    selectConfiguration: (config: ScraperConfiguration | null) => void;
    clearError: () => void;
    clearJobStatus: () => void;
}

const initialState: ScraperState = {
    configurations: [],
    selectedConfiguration: null,
    scrapedData: [],
    pagination: null,
    isLoading: false,
    error: null,
    jobStatus: null,
};

export const ScraperContext = createContext<ScraperContextProps>(initialState as ScraperContextProps);

interface ScraperProviderProps {
    children: ReactNode;
}

export const ScraperProvider: React.FC<ScraperProviderProps> = ({ children }) => {
    const [state, setState] = useState<ScraperState>(initialState);

    const setLoading = (loading: boolean) => setState(prev => ({ ...prev, isLoading: loading }));
    const setError = (errorMessage: string | null) => setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
    const setJobStatus = (status: string | null) => setState(prev => ({ ...prev, jobStatus: status }));
    const clearError = () => setError(null);
    const clearJobStatus = () => setJobStatus(null);

    const fetchConfigurations = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const configs = await api.getConfigurations();
            setState(prev => ({ ...prev, configurations: configs, isLoading: false }));
        } catch (err) {
            setError(getApiErrorMessage(err));
        }
    }, []);

    const fetchConfigurationById = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);
        setState(prev => ({ ...prev, selectedConfiguration: null }));
        try {
            const config = await api.getConfigurationById(id);
            setState(prev => ({ ...prev, selectedConfiguration: config, isLoading: false }));
        } catch (err) {
            setError(getApiErrorMessage(err));
        }
    }, []);

     const selectConfiguration = useCallback((config: ScraperConfiguration | null) => {
         setState(prev => ({
             ...prev,
             selectedConfiguration: config,
             scrapedData: config ? prev.scrapedData : [],
             pagination: config ? prev.pagination : null,
             error: null 
            }));
     }, []);

    const createConfiguration = useCallback(async (data: Omit<ScraperConfiguration, '_id'|'createdAt'|'updatedAt'>): Promise<ScraperConfiguration | null> => {
         setLoading(true);
         setError(null);
         try {
            const newConfig = await api.createConfiguration(data);
            setState(prev => ({
                ...prev,
                configurations: [...prev.configurations, newConfig].sort((a,b) => a.name.localeCompare(b.name)),
                isLoading: false
            }));
            return newConfig;
         } catch (err) {
             setError(getApiErrorMessage(err));
             return null;
         }
     }, []);

    const updateConfiguration = useCallback(async (id: string, data: Partial<Omit<ScraperConfiguration, '_id'|'createdAt'|'updatedAt'>>): Promise<ScraperConfiguration | null> => {
        setLoading(true);
        setError(null);
        try {
            const updatedConfig = await api.updateConfiguration(id, data);
             setState(prev => ({
                 ...prev,
                 configurations: prev.configurations.map(c => c._id === id ? updatedConfig : c).sort((a,b) => a.name.localeCompare(b.name)),
                 selectedConfiguration: prev.selectedConfiguration?._id === id ? updatedConfig : prev.selectedConfiguration,
                 isLoading: false
             }));
            return updatedConfig;
        } catch (err) {
            setError(getApiErrorMessage(err));
             return null;
        }
    }, []);

     const deleteConfiguration = useCallback(async (id: string): Promise<boolean> => {
         setLoading(true);
         setError(null);
         try {
            await api.deleteConfiguration(id);
             setState(prev => ({
                 ...prev,
                 configurations: prev.configurations.filter(c => c._id !== id),
                 selectedConfiguration: prev.selectedConfiguration?._id === id ? null : prev.selectedConfiguration,
                 scrapedData: prev.selectedConfiguration?._id === id ? [] : prev.scrapedData,
                 pagination: prev.selectedConfiguration?._id === id ? null : prev.pagination,
                 isLoading: false
             }));
             return true;
         } catch (err) {
            setError(getApiErrorMessage(err));
             return false;
         }
     }, []);

     const runJob = useCallback(async (configId: string) => {
         setLoading(true);
         setError(null);
         setJobStatus(null);
         try {
            const response = await api.runScrapeJob(configId);
            setJobStatus(response.message); 
            setLoading(false);
         } catch (err) {
            setError(getApiErrorMessage(err)); 
            setLoading(false);
         }
     }, []);

    const fetchScrapedData = useCallback(async (configId: string, page: number = 1, limit: number = 10) => {
        setJobStatus(null);
         try {
            const response = await api.getScrapedData({ configId, page, limit });
            setState(prev => ({
                ...prev,
                scrapedData: response.data,
                pagination: response.pagination,
                isLoading: false
            }));
         } catch (err) {
            setError(getApiErrorMessage(err));
            setState(prev => ({ ...prev, isLoading: false }));
         }
     }, []);


    const contextValue = useMemo(() => ({
        ...state,
        fetchConfigurations,
        fetchConfigurationById,
        createConfiguration,
        updateConfiguration,
        deleteConfiguration,
        runJob,
        fetchScrapedData,
        selectConfiguration,
        clearError,
        clearJobStatus,
    }), [
        state,
        fetchConfigurations,
        fetchConfigurationById,
        createConfiguration,
        updateConfiguration,
        deleteConfiguration,
        runJob,
        fetchScrapedData,
        selectConfiguration
    ]);


    return (
        <ScraperContext.Provider value={contextValue}>
            {children}
        </ScraperContext.Provider>
    );
};