import React, { createContext, useState, ReactNode, useCallback, useMemo } from 'react';
import {
    ScraperConfiguration,
    ScrapedDataItem,
    ApiPaginatedResponse,
    EngineSettingsData,
    IAccount,
    NewAccountData
} from "../Types"
import * as api from "../api/ScraperApi"
import { getApiErrorMessage } from "../api/ScraperApi"

interface ScraperState {
    configurations: ScraperConfiguration[];
    selectedConfiguration: ScraperConfiguration | null;
    scrapedData: ScrapedDataItem[];
    pagination: ApiPaginatedResponse<any>['pagination'] | null;
    engineSettings : EngineSettingsData | null;
    accounts: IAccount[];
    isLoading: boolean;
    isLoadingSettings: boolean;
    error: string | null;
    jobStatus: string | null;
    settingsMessage : string | null;
}

interface ScraperContextProps extends ScraperState {
    fetchConfigurations: () => Promise<void>;
    fetchConfigurationById: (id: string) => Promise<void>;
    createConfiguration: (data: Omit<ScraperConfiguration, '_id'|'createdAt'|'updatedAt'>) => Promise<ScraperConfiguration | null>;
    updateConfiguration: (id: string, data: Partial<Omit<ScraperConfiguration, '_id'|'createdAt'|'updatedAt'>>) => Promise<ScraperConfiguration | null>;
    deleteConfiguration: (id: string) => Promise<boolean>;
    runJob: (configId: string) => Promise<void>;
    runMultipleJobs: (configIds: string[]) => Promise<void>;
    fetchScrapedData: (configId: string, page?: number, limit?: number) => Promise<void>;
    fetchEngineSettings: () => Promise<void>;
    updateEngineSettings: (data: EngineSettingsData) => Promise<boolean>;
    selectConfiguration: (config: ScraperConfiguration | null) => void;
    fetchAccounts: () => Promise<void>;
    createAccount: (data: NewAccountData) => Promise<IAccount | null>;
    clearError: () => void;
    clearJobStatus: () => void;
    clearSettingsMessage: () => void;
}

const initialState: ScraperState = {
    configurations: [],
    selectedConfiguration: null,
    scrapedData: [],
    pagination: null,
    engineSettings : null,
    accounts: [],
    isLoading: false,
    isLoadingSettings: false,
    error: null,
    jobStatus: null,
    settingsMessage: null,
};

export const ScraperContext = createContext<ScraperContextProps>(initialState as ScraperContextProps);

interface ScraperProviderProps {
    children: ReactNode;
}

export const ScraperProvider: React.FC<ScraperProviderProps> = ({ children }) => {
    const [state, setState] = useState<ScraperState>(initialState);

    const setLoading = (loading: boolean) => setState(prev => ({ ...prev, isLoading: loading }));
    const setLoadingSettings = (loading: boolean) => setState(prev => ({ ...prev, isLoadingSettings: loading }));
    const setError = (errorMessage: string | null) => setState(prev => ({ ...prev, error: errorMessage, isLoading: false, isLoadingSettings: false }));
    const setJobStatus = (status: string | null) => setState(prev => ({ ...prev, jobStatus: status }));
    const setSettingsMessage = (message: string | null) => setState(prev => ({ ...prev, settingsMessage: message }));
    const clearError = useCallback(() => setError(null), []);
    const clearJobStatus = useCallback(() => setJobStatus(null), []);
    const clearSettingsMessage = useCallback(() => setSettingsMessage(null), []);

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

    const runMultipleJobs = useCallback(async (configIds: string[]) => {
        if (configIds.length === 0) return;
        setLoading(true); // Use main loading indicator
        setError(null);
        setJobStatus(null);
        try {
            const response = await api.runMultipleScrapeJobs(configIds);
            setJobStatus(response.message); // Display the acceptance message
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

     const fetchEngineSettings = useCallback(async () => {
        setLoadingSettings(true);
        setError(null);
        try {
            const settings = await api.getEngineSettings();
            setState(prev => ({ ...prev, engineSettings: settings, isLoadingSettings: false }));
        } catch (err) {
            setError(getApiErrorMessage(err));
        }
    }, []);

    const updateEngineSettings = useCallback(async (data: EngineSettingsData): Promise<boolean> => {
        setLoadingSettings(true);
        setError(null);
        setSettingsMessage(null);
        try {
            const updatedSettings = await api.updateEngineSettings(data);
            setState(prev => ({
                ...prev,
                engineSettings: updatedSettings,
                isLoadingSettings: false,
            }));
            setSettingsMessage("Settings saved successfully. Restart required for changes to apply.");
            return true;
        } catch (err) {
            setError(getApiErrorMessage(err));
            return false;
        }
    }, []);

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedAccounts = await api.getAccounts();
            setState(prev => ({ ...prev, accounts: fetchedAccounts, isLoading: false }));
        } catch (err) {
            setError(getApiErrorMessage(err));
        }
    }, []);

    const createAccount = useCallback(async (data: NewAccountData): Promise<IAccount | null> => {
        setLoading(true);
        setError(null);
        try {
            const newAccount = await api.createAccount(data);
            setState(prev => ({
                ...prev,
                accounts: [...prev.accounts, newAccount].sort((a, b) => a.platform.localeCompare(b.platform)),
                isLoading: false
            }));
            return newAccount;
        } catch (err) {
            setError(getApiErrorMessage(err));
            return null;
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
        runMultipleJobs,
        fetchScrapedData,
        fetchEngineSettings,
        updateEngineSettings,
        fetchAccounts,
        createAccount,
        selectConfiguration,
        clearError,
        clearJobStatus,
        clearSettingsMessage,
    }), [
        state,
        fetchConfigurations,
        fetchConfigurationById,
        createConfiguration,
        updateConfiguration,
        deleteConfiguration,
        runJob, runMultipleJobs,
        fetchScrapedData,
        fetchEngineSettings, updateEngineSettings,
        fetchAccounts, createAccount,
        selectConfiguration,
        clearError, clearJobStatus, clearSettingsMessage
    ]);


    return (
        <ScraperContext.Provider value={contextValue}>
            {children}
        </ScraperContext.Provider>
    );
};