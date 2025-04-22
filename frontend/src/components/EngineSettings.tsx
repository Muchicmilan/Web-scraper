import React, { useState, useEffect, useCallback } from 'react';
import { useScraperManager } from '../hooks/useScraperManager';
import { EngineSettingsData } from '../Types';

const EngineSettings: React.FC = () => {
    const {
        engineSettings,
        fetchEngineSettings,
        updateEngineSettings,
        isLoadingSettings,
        error,
        settingsMessage,
        clearError,
        clearSettingsMessage
     } = useScraperManager();

    const [formData, setFormData] = useState<Partial<Record<keyof EngineSettingsData, number | ''>>>({});
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        fetchEngineSettings();
        return () => {
            clearError();
            clearSettingsMessage();
        }
    }, [fetchEngineSettings, clearError, clearSettingsMessage]);

    useEffect(() => {
        if (engineSettings) {
            setFormData({
                maxPoolSize: engineSettings.maxPoolSize,
                minPoolSize: engineSettings.minPoolSize,
                idleTimeoutMs: engineSettings.idleTimeoutMs,
                retryLimit: engineSettings.retryLimit,
            });
        }
    }, [engineSettings]);

     useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (settingsMessage || error) {
            timer = setTimeout(() => {
                clearSettingsMessage();
                clearError();
            }, 5000);
        }
        return () => { if (timer) clearTimeout(timer); };
    }, [settingsMessage, error, clearSettingsMessage, clearError]);


    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseInt(value, 10);
        setFormData(prev => ({
            ...prev,
            [name]: isNaN(numValue) ? '' : numValue
        }));
         setLocalError(null);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        clearError();
        clearSettingsMessage();

        const { maxPoolSize, minPoolSize, idleTimeoutMs, retryLimit } = formData;

        if (maxPoolSize === undefined || minPoolSize === undefined || idleTimeoutMs === undefined || retryLimit === undefined ||
            maxPoolSize === '' || minPoolSize === '' || idleTimeoutMs === '' || retryLimit === '') {
            setLocalError("All fields are required and must be numbers.");
            return;
        }
         if (minPoolSize < 0 || maxPoolSize < 1 || idleTimeoutMs < 1000 || retryLimit < 0) {
             setLocalError("Invalid values (e.g., minPoolSize >= 0, maxPoolSize >= 1, timeout >= 1000ms).");
             return;
        }
        if (minPoolSize > maxPoolSize) {
            setLocalError("Minimum pool size cannot be greater than maximum pool size.");
            return;
        }

        const dataToSave: EngineSettingsData = {
            maxPoolSize: Number(maxPoolSize),
            minPoolSize: Number(minPoolSize),
            idleTimeoutMs: Number(idleTimeoutMs),
            retryLimit: Number(retryLimit),
        };

        await updateEngineSettings(dataToSave);
    };

    if (isLoadingSettings && !engineSettings) {
        return <div className="loading">Loading engine settings...</div>;
    }

    return (
        <div className="engine-settings-form" style={{ border: '1px solid #ccc', padding: '20px', marginTop: '20px', backgroundColor: '#f9f9f9' }}>
            <h3>Browser Pool Settings</h3>
            {error && <div className="error-message">Error: {error} <button onClick={clearError}>×</button></div>}
            {localError && <div className="error-message">{localError} <button onClick={() => setLocalError(null)}>×</button></div>}
            {settingsMessage && <div className="job-status" style={{backgroundColor: '#d4edda', color: '#155724', borderColor: '#c3e6cb'}}> {settingsMessage} <button onClick={clearSettingsMessage}>×</button></div>}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="minPoolSize">Min Browsers:</label>
                    <input
                        type="number"
                        id="minPoolSize"
                        name="minPoolSize"
                        value={formData.minPoolSize ?? ''}
                        onChange={handleInputChange}
                        min="0"
                        required
                        disabled={isLoadingSettings}
                    />
                    <small style={{ marginLeft: '10px' }}>Minimum number of browser instances to keep running.</small>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="maxPoolSize">Max Browsers:</label>
                    <input
                        type="number"
                        id="maxPoolSize"
                        name="maxPoolSize"
                        value={formData.maxPoolSize ?? ''}
                        onChange={handleInputChange}
                        min="1"
                        required
                        disabled={isLoadingSettings}
                    />
                     <small style={{ marginLeft: '10px' }}>Maximum number of concurrent browser instances.</small>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="idleTimeoutMs">Idle Timeout (ms):</label>
                    <input
                        type="number"
                        id="idleTimeoutMs"
                        name="idleTimeoutMs"
                        value={formData.idleTimeoutMs ?? ''}
                        onChange={handleInputChange}
                        min="1000"
                        required
                        disabled={isLoadingSettings}
                    />
                     <small style={{ marginLeft: '10px' }}>Time in milliseconds before an idle browser is closed (down to min pool size).</small>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="retryLimit">Get Browser Retry Limit:</label>
                    <input
                        type="number"
                        id="retryLimit"
                        name="retryLimit"
                        value={formData.retryLimit ?? ''}
                        onChange={handleInputChange}
                        min="0"
                        required
                        disabled={isLoadingSettings}
                    />
                     <small style={{ marginLeft: '10px' }}>How many times to retry getting a browser when the pool is full.</small>
                </div>
                <button type="submit" disabled={isLoadingSettings}>
                    {isLoadingSettings ? 'Saving...' : 'Save Settings'}
                </button>
                <p style={{fontSize: '0.9em', color: '#666', marginTop: '10px'}}>
                     Note: Changes require an application restart to take effect on the browser pool.
                </p>
            </form>
        </div>
    );
};

export default EngineSettings;