import React, { useEffect, useState } from 'react';
import { useScraperManager } from '../hooks/useScraperManager';
import ConfigurationList from '../components/ConfigurationList';
import ConfigurationForm from '../components/ConfigurationForm';
import ScrapedDataViewer from '../components/ScraperDataViewer';
import { ScraperConfiguration } from '../Types';

const ScraperDashboard: React.FC = () => {
    const {
        fetchConfigurations,
        selectedConfiguration,
        selectConfiguration,
        isLoading,
        error,
        clearError,
        jobStatus,
        clearJobStatus
    } = useScraperManager();

    const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit' | 'create'>('list');

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
         setViewMode('list');
     };

     const handleSaveSuccess = (savedConfig: ScraperConfiguration) => {
         selectConfiguration(savedConfig);
         setViewMode('view');
         fetchConfigurations(); 
     };


    return (
        <div className="scraper-dashboard">
            <h1>Scraper Dashboard</h1>

            {isLoading && <div className="loading">Loading...</div>}
            {error && <div className="error-message">Error: {error} <button onClick={clearError}>×</button></div>}
            {jobStatus && <div className="job-status">Status: {jobStatus} <button onClick={clearJobStatus}>×</button></div>}


            {viewMode === 'list' && (
                <>
                    <button onClick={handleCreateNew} style={{ marginBottom: '1em' }}>Create New Configuration</button>
                    <ConfigurationList onSelect={handleSelectConfig} onEdit={handleEditConfig} />
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
                     <button onClick={handleBackToList} style={{ marginRight: '1em' }}>Back to List</button>
                      <button onClick={() => handleEditConfig(selectedConfiguration)}>Edit Configuration</button>
                     <ScrapedDataViewer config={selectedConfiguration} />
                 </div>
             )}

        </div>
    );
};

export default ScraperDashboard;