import React, { useState } from 'react';
import { useScraperManager } from '../hooks/useScraperManager';
import { ScraperConfiguration } from '../Types';

interface Props {
    configurations: ScraperConfiguration[];
    onSelect: (config: ScraperConfiguration) => void;
    onEdit: (config: ScraperConfiguration) => void;
}

const ConfigurationList: React.FC<Props> = ({configurations, onSelect, onEdit }) => {
    const {
        deleteConfiguration,
        runJob,
        runMultipleJobs,
        isLoading        
    } = useScraperManager();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete configuration "${name}"?`)) {
            const success = await deleteConfiguration(id);
            if (success) {
                setSelectedIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(id);
                    return newSet;
                });
            }
        }
    };
    const handleRunJob = async (id: string, name: string) => {
        if (window.confirm(`Start scraping job for "${name}" now?`)) {
            await runJob(id);

        }
    };

    const handleCheckboxChange = (id: string, checked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    const handleRunSelected = async () => {
        const idsToRun = Array.from(selectedIds);
        if (idsToRun.length === 0) {
            alert("Please select at least one configuration to run.");
            return;
        }
        if (window.confirm(`Start scraping jobs for ${idsToRun.length} selected configuration(s) now?`)) {
            await runMultipleJobs(idsToRun);
            setSelectedIds(new Set());
        }
    };

        if (isLoading && configurations.length === 0) {
            return <div className="loading-indicator">Loading configurations...</div>;
        }

    if (!isLoading && (!configurations || configurations.length === 0)) {
        return <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>No configurations found. Create one to get started.</div>;
    }

    return (
        <> {/* Use React Fragment to group elements */}
            {/* Button to run selected jobs */}
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleRunSelected}
                    disabled={isLoading || selectedIds.size === 0}
                    title={selectedIds.size === 0 ? "Select configurations below to run" : `Run ${selectedIds.size} selected job(s)`}
                    style={{ padding: '8px 15px' }}
                >
                    Run Selected ({selectedIds.size})
                </button>
            </div>

            {/* Table to display configurations */}
            <table className="configurations-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8f8f8' }}>
                        <th style={{ width: '40px', padding: '8px' }}> {/* Checkbox column header */} </th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Type</th>
                        <th style={{ textAlign: 'left', padding: '8px' }}>Start URL(s)</th>
                        <th style = {{textAlign: 'left', padding: '8px'}}>Schedule Status</th>
                        <th style={{ textAlign: 'center', padding: '8px', width: '280px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Map through configurations and render a row for each */}
                    {configurations.map(config => (
                        <tr key={config._id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ textAlign: 'center', padding: '8px' }}>
                                {/* Checkbox for selecting the configuration */}
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(config._id)}
                                    onChange={(e) => handleCheckboxChange(config._id, e.target.checked)}
                                    disabled={isLoading}
                                    aria-label={`Select configuration ${config.name}`}
                                />
                            </td>
                            <td style={{ padding: '8px' }}>{config.name}</td>
                            <td style={{ padding: '8px' }}>{config.pageType}</td>
                            {/* Display first URL and count if multiple, or just the first URL */}
                            <td style={{ padding: '8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={config.startUrls.join(', ')}>
                                {config.startUrls.length > 1 ? `${config.startUrls[0]}... (${config.startUrls.length})` : config.startUrls[0]}
                            </td>
                                 {/* Schedule Status Column */}
                                 <td style={{ padding: '8px', fontSize: '0.9em' }} title={config.cronEnabled ? config.cronSchedule : 'Scheduling disabled'}>
                                {config.cronEnabled
                                    ? (<span style={{ color: 'green', fontWeight: 'bold' }}>✓ Enabled</span>)
                                    : (<span style={{ color: '#6c757d' }}>✗ Disabled</span>)
                                }
                                {config.cronEnabled && config.cronSchedule && (
                                    <span style={{ marginLeft: '5px', fontFamily: 'monospace', color: '#555' }}>({config.cronSchedule})</span>
                                )}
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px' }}>
                                {/* Action buttons for each configuration */}
                                <button onClick={() => onSelect(config)} disabled={isLoading} title="View Data" style={{ marginRight: '5px' }}>View</button>
                                <button onClick={() => onEdit(config)} disabled={isLoading} title="Edit Config" style={{ marginRight: '5px' }}>Edit</button>
                                <button onClick={() => handleRunJob(config._id, config.name)} disabled={isLoading} title="Run Scrape Job" style={{ marginRight: '5px' }}>Run Job</button>
                                <button onClick={() => handleDelete(config._id, config.name)} disabled={isLoading} title="Delete Config" style={{ color: 'red' }}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
};

export default ConfigurationList;

