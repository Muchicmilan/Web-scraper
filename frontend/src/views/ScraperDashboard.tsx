import React, { useEffect, useState, useMemo } from 'react';
import { useScraperManager } from '../hooks/useScraperManager';
import ConfigurationList from '../components/ConfigurationList';
import ConfigurationForm from '../components/ConfigurationForm';
import ScrapedDataViewer from '../components/ScraperDataViewer';
import EngineSettings from '../components/EngineSettings'
import AccountManager from '../components/AccountManager';
import { ScraperConfiguration } from '../Types';

const ScraperDashboard: React.FC = () => {
    const {
        configurations,
        fetchConfigurations,
        selectedConfiguration,
        selectConfiguration,
        isLoading,
        error,
        clearError,
        jobStatus,
        clearJobStatus,
        settingsMessage,
        clearSettingsMessage
    } = useScraperManager();

    const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit' | 'create' | 'settings' | 'accounts' > ('list');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchConfigurations();
    }, [fetchConfigurations]);

     useEffect(() => {
         if (!selectedConfiguration && (viewMode === 'view' || viewMode === 'edit')) {
             setViewMode('list');
         }
     }, [selectedConfiguration, viewMode]);

     useEffect(() => {
         let timer: NodeJS.Timeout | null = null;
         if (error || jobStatus) {
             timer = setTimeout(() => {
                 clearError();
                 clearJobStatus();
             }, 5000); 
         }
         return () => { if (timer) clearTimeout(timer); };
     }, [error, jobStatus, clearError, clearJobStatus]);

     const filteredConfigurations = useMemo(() => {
        if(!searchTerm)
            return configurations;
        return configurations.filter(config =>
            config.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
     }, [configurations, searchTerm]);


    const handleSelectConfig = (config: ScraperConfiguration) => {
        selectConfiguration(config);
        setViewMode('view');
    };

    const handleEditConfig = (config: ScraperConfiguration) => {
         selectConfiguration(config);
         setViewMode('edit');
    };

     const handleCreateNew = () => {
         selectConfiguration(null);
         setViewMode('create');
     };

      const handleBackToList = () => {
         selectConfiguration(null);
         setSearchTerm("");
         setViewMode('list');
     };

     const handleSaveSuccess = (savedConfig: ScraperConfiguration) => {
         selectConfiguration(savedConfig);
         setViewMode('view');
     };

     const handleShowSettings = () => {
        selectConfiguration(null);
        setViewMode('settings');
    };

    const handleShowAccounts = () => {
        selectConfiguration(null);
        setViewMode('accounts');
    };


    return (
        <div className="scraper-dashboard" style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                <h1>Scraper Dashboard</h1>
                <div>
                    <button onClick={viewMode === 'accounts' ? handleBackToList : handleShowAccounts}
                            style={{padding: '8px 15px', marginRight: '10px'}}>
                        {viewMode === 'accounts' ? 'Back to List' : 'Account Management'}
                    </button>
                    <button onClick={viewMode === 'settings' ? handleBackToList : handleShowSettings}
                            style={{padding: '8px 15px'}}>
                        {viewMode === 'settings' ? 'Back to List' : 'Engine Settings'}
                    </button>
                </div>
            </div>

            {/* Status/Error Messages */}
            {isLoading && <div className="loading-indicator">Loading...</div>}
            {error && <div className="error-message">Error: {error}
                <button onClick={clearError}>×</button>
            </div>}
            {jobStatus && <div className="job-status">Status: {jobStatus}
                <button onClick={clearJobStatus}>×</button>
            </div>}
            {settingsMessage && viewMode !== 'settings' && <div className="job-status" style={{
                backgroundColor: '#d4edda',
                color: '#155724',
                borderColor: '#c3e6cb'
            }}> {settingsMessage}
                <button onClick={clearSettingsMessage}>×</button>
            </div>}

            {/* Conditional Rendering based on viewMode */}
            {viewMode === 'list' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1em', gap: '1em' }}>
                        <button onClick={handleCreateNew}>Create New Configuration</button>
                        {/* Search Input */}
                        <input
                            type="text"
                            placeholder="Search configurations by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: '4px', flexGrow: 1, maxWidth: '400px' }}
                        />
                    </div>
                    {/* Pass filtered configurations to the list */}
                    <ConfigurationList
                        configurations={filteredConfigurations}
                        onSelect={handleSelectConfig}
                        onEdit={handleEditConfig}
                    />
                </>
            )}

            {(viewMode === 'create' || viewMode === 'edit') && (
                <ConfigurationForm
                    initialData={viewMode === 'edit' ? selectedConfiguration : null}
                    onSaveSuccess={handleSaveSuccess}
                    onCancel={handleBackToList}
                />
            )}

            {viewMode === 'view' && selectedConfiguration && (
                <div>
                    {/* Sticky Button Container */}
                    <div style={{
                        position: 'sticky',
                        top: '0', // Stick to the top
                        backgroundColor: '#f4f7f9', // Match body background or choose another
                        padding: '10px 0', // Add some padding
                        zIndex: 10, // Ensure it's above other content
                        borderBottom: '1px solid #eee', // Optional separator
                        marginBottom: '1rem' // Space below the sticky bar
                    }}>
                        <button onClick={handleBackToList} style={{ marginRight: '1em' }}>Back to List</button>
                        <button onClick={() => handleEditConfig(selectedConfiguration)}>Edit Configuration</button>
                    </div>
                    {/* Data Viewer below the sticky bar */}
                    <ScrapedDataViewer config={selectedConfiguration} />
                </div>
            )}

            {viewMode === 'settings' && (
                <EngineSettings />
            )}

            {viewMode === 'accounts' && (
                <AccountManager />
            )}

        </div>
    );
};

export default ScraperDashboard;