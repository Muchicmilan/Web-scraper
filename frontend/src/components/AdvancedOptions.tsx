import React from "react";
import { ScrapeOptions } from "../UserInput";

interface AdvancedOptionsProps {
    options: ScrapeOptions;
    onOptionsChange: (options: ScrapeOptions) => void;
}

const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({ options, onOptionsChange }) => {
    return (
        <div className="advanced-options">
            <h3>Advanced Scraping Options</h3>
            
            <div className="option-row">
                <label className="option-label">
                    Content Container Selector (e.g., "article, .content"):
                </label>
                <input 
                    type="text"
                    value={options.contentSelector}
                    onChange={(e) => onOptionsChange({...options, contentSelector: e.target.value})}
                    className="option-input"
                />
            </div>
            
            <div className="option-row">
                <label className="option-label">
                    Heading Selectors (comma separated, e.g., "h1, h2"):
                </label>
                <input 
                    type="text"
                    value={options.headingSelectors?.join(", ")}
                    onChange={(e) => onOptionsChange({
                        ...options, 
                        headingSelectors: e.target.value.split(",").map(s => s.trim())
                    })}
                    className="option-input"
                />
            </div>
            
            <div className="option-row">
                <label className="option-label">
                    Content Selectors (comma separated, e.g., "p, .text"):
                </label>
                <input 
                    type="text"
                    value={options.contentSelectors?.join(", ")}
                    onChange={(e) => onOptionsChange({
                        ...options, 
                        contentSelectors: e.target.value.split(",").map(s => s.trim())
                    })}
                    className="option-input"
                />
            </div>
            
            <div className="option-row">
                <label className="option-label">
                    Exclude Selectors (comma separated, e.g., ".sidebar, .footer"):
                </label>
                <input 
                    type="text"
                    value={options.excludeSelectors?.join(", ")}
                    onChange={(e) => onOptionsChange({
                        ...options, 
                        excludeSelectors: e.target.value.split(",").map(s => s.trim())
                    })}
                    className="option-input"
                />
            </div>
            
            <div className="option-row">
                <label className="option-label">
                    Minimum Content Length (characters):
                </label>
                <input 
                    type="number"
                    value={options.minContentLength}
                    onChange={(e) => onOptionsChange({
                        ...options, 
                        minContentLength: parseInt(e.target.value) || 0
                    })}
                    className="number-input"
                />
            </div>
        </div>
    );
};

export default AdvancedOptions;