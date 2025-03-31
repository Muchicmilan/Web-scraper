import React from "react";
import {
    ScrapeSuccessResponse,
    ScrapeMultiSuccessResponse,
    ScrapedData,
    isMultiScrapeResponse
} from "../Types";

interface ResultsDisplayProps {
    results: ScrapeSuccessResponse | ScrapeMultiSuccessResponse | null;
    error?: string | null;
}

const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try { return new Date(dateString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (e) { return dateString; }
};

const SingleResultCard: React.FC<{ data: ScrapedData }> = ({ data }) => {
    return (
        <div className="results-content" style={{ marginBottom: '20px' }}>
            <h3 className="results-heading">{data.title || "Untitled Page"}</h3>
            <p className="results-url">
                <strong>URL:</strong>{' '}
                <a href={data.url} target="_blank" rel="noopener noreferrer">{data.url}</a>
            </p>
            <div className="results-meta">
                <span>Scraped: {formatDate(data.scrapedAt)}</span> | {' '}
                <span>DB Created: {formatDate(data.createdAt)}</span> | {' '}
                <span>DB Updated: {formatDate(data.updatedAt)}</span>
            </div>
            <p className="results-section-count">
                <strong>Sections Found:</strong> {data.sections.length}
            </p>
            {data.sections.length > 0 ? (
                data.sections.map((section, index) => (
                    <div key={section._id || `section-${index}`} className="section-card">
                        {section.heading && section.heading.trim() && ( <h4 className="section-heading">{section.heading}</h4> )}
                        {section.content && ( <p className="section-content">{section.content.substring(0, 250)}{section.content.length > 250 ? '...' : ''}</p> )}
                    </div>
                ))
            ) : (
                 <p className="no-sections-message">No content sections meeting the criteria were found on this page.</p>
            )}
        </div>
    );
};


const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, error }) => {
    if (error) {
        return ( <div className="results-container"><p className="error-message">{error}</p></div> );
    }
    if (!results) { return null; }

    return (
        <div className="results-container">
            <h2 className="results-title">Scraping Results</h2>

            {results.message && (
                <p style={{ textAlign: 'center', fontStyle: 'italic', marginBottom: '15px' }}>
                    {results.message}
                </p>
            )}

            {isMultiScrapeResponse(results) ? (
                <div>
                    <p style={{ textAlign: 'center', marginBottom: '15px' }}>
                        Displaying {results.data.length} scraped pages:
                    </p>
                    {results.data.length > 0 ? (
                        results.data.map(dataItem => (
                            <SingleResultCard key={dataItem._id} data={dataItem} />
                        ))
                    ) : (
                        <p className="no-sections-message">No linked pages were successfully scraped or retrieved.</p>
                    )}
                </div>
            ) : (
                 <SingleResultCard data={results.data} />
            )}
        </div>
    );
};

export default ResultsDisplay;