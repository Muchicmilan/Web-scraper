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
    const maxContentPreviewLength = 300;

    return (
        <div className="results-content">
            <h3 className="results-heading">{data.title || "Untitled Page"}</h3>
            <p className="results-url">
                {/* ... URL link */}
                 <strong>URL:</strong>{' '}
                <a href={data.url} target="_blank" rel="noopener noreferrer" title={`Open ${data.url} in new tab`}>
                    {data.url}
                </a>
            </p>
             {/* Display Tags */}
             {data.tags && data.tags.length > 0 && (
                 <div className="results-tags" style={{ marginBottom: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #eee' }}>
                    <strong>Tags:</strong>{' '}
                    {data.tags.map((tag, index) => (
                        <span key={index} className="tag-badge"> {/* Basic inline style example */}
                            {tag}
                        </span>
                    ))}
                </div>
             )}
             {/* --- End Tags Display --- */}

            <div className="results-meta">
                {/* Date spans */}
                 <span>Scraped: {formatDate(data.scrapedAt)}</span>
                <span>Created: {formatDate(data.createdAt)}</span>
                <span>Updated: {formatDate(data.updatedAt)}</span>
            </div>

            <p className="results-section-count">
                <strong>Sections Found:</strong> {data.sections.length}
            </p>

            {/* Sections mapping */}
             {data.sections.length > 0 ? (
                data.sections.map((section, index) => (
                    <div key={`section-${data._id}-${index}`} className="section-card">
                        {section.heading && section.heading.trim() && (
                            <h4 className="section-heading">{section.heading.trim()}</h4>
                        )}
                        {section.content && (
                            <p className="section-content">
                                {section.content.length > maxContentPreviewLength
                                    ? `${section.content.substring(0, maxContentPreviewLength)}...`
                                    : section.content
                                }
                             </p>
                        )}
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
    if (!results) {
        return null;
    }

    return (
        <div className="results-container">
            <h2 className="results-title">Scraping Results</h2>

            {/* Display global message if present */}
            {results.message && (
                <p style={{ textAlign: 'center', fontStyle: 'italic', marginBottom: '15px', color: '#555' }}>
                    {results.message}
                </p>
            )}

            {isMultiScrapeResponse(results) ? (
                <div>
                     <p style={{ textAlign: 'center', marginBottom: '15px', fontWeight: '500' }}>
                        Displaying {results.data.length} scraped page(s) that passed filters:
                    </p>
                    {results.data.length > 0 ? (
                        results.data.map(dataItem => (
                            dataItem ? <SingleResultCard key={dataItem._id} data={dataItem} /> : null
                        ))
                    ) : (
                        <p className="no-sections-message">No linked pages met the keyword filter criteria or could be parsed.</p>
                    )}
                </div>
            ) : (
                 results.data ? (
                     <SingleResultCard data={results.data} />
                 ) : (
                     <p className="no-sections-message" style={{ fontStyle: 'italic', marginTop: '10px' }}>
                         (No specific page data to display, likely filtered out.)
                     </p>
                 )
            )}
        </div>
    );
};

export default ResultsDisplay;