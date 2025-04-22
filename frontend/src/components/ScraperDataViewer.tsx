import React, { useEffect } from 'react';
import { useScraperManager } from '../hooks/useScraperManager';
import { ScraperConfiguration } from '../Types';

interface Props {
    config: ScraperConfiguration;
}

const ScrapedDataViewer: React.FC<Props> = ({ config }) => {
    const { scrapedData, pagination, fetchScrapedData, isLoading } = useScraperManager();

    useEffect(() => {
        if (config?._id) {
            fetchScrapedData(config._id, 1); 
        }
    }, [config?._id]); 

    const handlePageChange = (newPage: number) => {
        if (config?._id) {
            fetchScrapedData(config._id, newPage);
        }
    };

    const headers = scrapedData.length > 0 ? Object.keys(scrapedData[0].data) : [];

    return (
        <div className="data-viewer">
            <h2>Scraped Data for: {config.name}</h2>
            {isLoading && <div>Loading data...</div>}
            {!isLoading && scrapedData.length === 0 && <div>No data found for this configuration. Run the job to scrape.</div>}

            {scrapedData.length > 0 && (
                <>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>URL</th>
                                {headers.map(header => <th key={header}>{header}</th>)}
                                <th>Scraped At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scrapedData.map(item => (
                                <tr key={item._id}>
                                    <td><a href={item.url} target="_blank" rel="noopener noreferrer" title={item.url}>{item.url.substring(0, 50)}...</a></td>
                                    {headers.map(header => (
                                        <td key={header}>
                                            {JSON.stringify(item.data[header])?.substring(0, 100)}
                                            {JSON.stringify(item.data[header])?.length > 100 ? '...' : ''}
                                         </td>
                                    ))}
                                    <td>{new Date(item.scrapedAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {pagination && pagination.totalPages > 1 && (
                         <div>
                             Page {pagination.currentPage} of {pagination.totalPages} (Total: {pagination.totalItems})
                             <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage <= 1}>Previous</button>
                             <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage >= pagination.totalPages}>Next</button>
                         </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ScrapedDataViewer;