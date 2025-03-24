import React from "react";

interface ResultsDisplayProps {
    results: any;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
    return (
        <div className="results-container">
            <h2 className="results-title">Scraping Results</h2>
            <div className="results-content">
                <h3>{results.data.title}</h3>
                <p className="results-url"><strong>URL:</strong> {results.data.url}</p>
                <p><strong>Sections:</strong> {results.data.sections.length}</p>
                
                {results.data.sections.map((section: any, index: number) => (
                    <div key={index} className="section-card">
                        {section.heading && <h4 className="section-heading">{section.heading}</h4>}
                        {section.content && <p className="section-content">{section.content.substring(0, 150)}...</p>}
                        
                        {}
                        {(section.links?.length > 0 || section.linkTexts?.length > 0) && (
                            <div>
                                <strong>Links ({section.links?.length || section.linkTexts?.length}):</strong>
                                <ul className="links-list">
                                    {section.links ? 
                                        
                                        section.links.slice(0, 3).map((link: any, i: number) => (
                                            <li key={i}>{link.text}: {link.url}</li>
                                        ))
                                        :
                                        
                                        section.linkTexts?.slice(0, 3).map((text: string, i: number) => (
                                            <li key={i}>{text}: {section.linkUrls[i]}</li>
                                        ))
                                    }
                                    {(section.links?.length > 3 || section.linkTexts?.length > 3) && 
                                        <li>...and {(section.links?.length || section.linkTexts?.length) - 3} more</li>
                                    }
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResultsDisplay;