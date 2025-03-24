import React from "react";
import { ScrapedData } from "../Types"; // Import from types.ts

interface ResultsDisplayProps {
  results: { success: boolean; data: ScrapedData } | null;
  error?: string;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, error }) => {
  if (error) {
    return (
      <div className="results-container">
        <h2 className="results-title">Error</h2>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="results-container">
        <h2 className="results-title">No Results Yet</h2>
        <p>Enter a URL and click "Submit" to see results.</p>
      </div>
    );
  }

    if (!results.success) {
    return (
        <div className="results-container">
            <h2 className="results-title">Scraping Failed</h2>
            <p>An error occurred while scraping the website.</p>
        </div>
    )
  }

  return (
    <div className="results-container">
      <h2 className="results-title">Scraping Results</h2>
      <div className="results-content">
        <h3 className="results-heading">{results.data.title}</h3>
        <p className="results-url">
          <strong>URL:</strong>{" "}
          <a href={results.data.url} target="_blank" rel="noopener noreferrer">
            {results.data.url}
          </a>
        </p>
        <p className="results-section-count">
          <strong>Sections:</strong> {results.data.sections.length}
        </p>

        {results.data.sections.map((section, index) => (
          <div key={index} className="section-card">
            {section.heading && (
              <h4 className="section-heading">{section.heading}</h4>
            )}
            {section.content && (
              <p className="section-content">
                {section.content.substring(0, 150)}...
              </p>
            )}

            {section.links && section.links.length > 0 && (
              <div>
                <strong>Links ({section.links.length}):</strong>
                <ul className="links-list">
                  {section.links.slice(0, 3).map((link, i) => (
                    <li key={i}>
                      {link.text}:{" "}
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.url}
                      </a>
                    </li>
                  ))}
                  {section.links.length > 3 && (
                    <li>...and {section.links.length - 3} more</li>
                  )}
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