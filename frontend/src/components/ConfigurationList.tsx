import React from 'react';
import { useScraperManager } from '../hooks/useScraperManager';
import { ScraperConfiguration } from '../Types';

interface Props {
    onSelect: (config: ScraperConfiguration) => void;
    onEdit: (config: ScraperConfiguration) => void;
}

const ConfigurationList: React.FC<Props> = ({ onSelect, onEdit }) => {
    const { configurations, deleteConfiguration, runJob, isLoading } = useScraperManager();

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete configuration "${name}"?`)) {
            await deleteConfiguration(id);
        }
    };

     const handleRunJob = async (id: string, name: string) => {
         if (window.confirm(`Start scraping job for "${name}" now?`)) {
            await runJob(id);
         }
     };

    if (isLoading && configurations.length === 0) {
        return <div>Loading configurations...</div>;
    }

    if (!configurations || configurations.length === 0) {
        return <div>No configurations found. Create one to get started.</div>;
    }

    return (
        <table className="configurations-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Start URL(s)</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {configurations.map(config => (
                    <tr key={config._id}>
                        <td>{config.name}</td>
                        <td>{config.pageType}</td>
                        <td>{config.startUrls.join(', ')}</td>
                        <td>
                            <button onClick={() => onSelect(config)} disabled={isLoading} title="View Data">View</button>
                            <button onClick={() => onEdit(config)} disabled={isLoading} title="Edit Config">Edit</button>
                             <button onClick={() => handleRunJob(config._id, config.name)} disabled={isLoading} title="Run Scrape Job">Run Job</button>
                            <button onClick={() => handleDelete(config._id, config.name)} disabled={isLoading} title="Delete Config">Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ConfigurationList;