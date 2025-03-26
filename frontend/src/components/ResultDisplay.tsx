import React from "react";
import { ScrapeSuccessResponse, ScrapedData } from "../Types";

interface ResultsDisplayProps {
    results: ScrapeSuccessResponse | null;
    error?: string | null;
}

const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) { return dateString; }
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, error }) => {
    if (error) {
        return ( <div className="results-container"><p className="error-message">{error}</p></div> );
    }
    if (!results) { return null; }

    const data: ScrapedData = results.data;

    return (
        <div className="results-container">
            <h2 className="results-title">Scraping Results</h2>
            <div className="results-content">
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
                            {section.links && section.links.length > 0 ? (
                                <div>
                                    <strong>Links ({section.links.length}):</strong>
                                    <ul className="links-list">
                                         {section.links.slice(0, 5).map((link, i) => ( <li key={link.url || `link-${i}`}> </li> ))}
                                         {section.links.length > 5 && ( <li>...and {section.links.length - 5} more link(s)</li> )}
                                    </ul>
                                </div>
                             ) : (
                                section.content && <p className="section-no-links">No links found in this section.</p>
                             )}
                        </div>
                    ))
                ) : (
                     <p className="no-sections-message">No content sections meeting the criteria were found on this page.</p>
                )}
            </div>
        </div>
    );
};

export default ResultsDisplay;