import React, { useState } from "react";
import ScraperForm from "./components/ScraperForm";
import AdvancedOptions from "./components/AdvancedOptions";
import ResultsDisplay from "./components/ResultDisplay";
import { useScraper } from "./hooks/useScraper"; 
import { ScrapeOptions } from "./Types";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const UserInput: React.FC = () => {
    const [input, setInput] = useState<string>("");
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
    const [options, setOptions] = useState<ScrapeOptions>({
        contentSelector: "",
        headingSelectors: [],
        contentSelectors: [],
        excludeSelectors: [],
        minContentLength: 100,
    });

    const { results, error, loading, scrapeUrl } = useScraper(`${API_BASE_URL}/api/scrape`);

    const handleSubmit = () => {
         let optionsToSend: Partial<ScrapeOptions> | undefined = undefined;
         if (showAdvanced) {
             const cleanOptions: Partial<ScrapeOptions> = {};
             if (options.contentSelector?.trim()) cleanOptions.contentSelector = options.contentSelector.trim();
             const fHeadings = options.headingSelectors?.map(s => s.trim()).filter(Boolean);
             if (fHeadings?.length) cleanOptions.headingSelectors = fHeadings;
             const fContent = options.contentSelectors?.map(s => s.trim()).filter(Boolean);
             if (fContent?.length) cleanOptions.contentSelectors = fContent;
             const fExclude = options.excludeSelectors?.map(s => s.trim()).filter(Boolean);
             if (fExclude?.length) cleanOptions.excludeSelectors = fExclude;
             if (options.minContentLength !== undefined && options.minContentLength !== 100) {
                cleanOptions.minContentLength = Math.max(0, options.minContentLength);
             }
             if (Object.keys(cleanOptions).length > 0) {
                 optionsToSend = cleanOptions;
             }
         }

        scrapeUrl(input, optionsToSend);
    };

    const handleOptionsChange = (newOptions: ScrapeOptions) => {
        setOptions(newOptions);
    };

    return (
        <div className="scraper-container">
            <h1 className="scraper-title">Web Scraper</h1>

            <ScraperForm
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                loading={loading} // Use loading state from hook
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
            />

            {showAdvanced && (
                <AdvancedOptions options={options} onOptionsChange={handleOptionsChange} />
            )}

            {loading && <div className="loading-indicator">Scraping...</div>}

            {!loading && error && <ResultsDisplay results={null} error={error} />}
            {!loading && !error && results && <ResultsDisplay results={results} />}

            {!loading && !error && !results && (
                <div className="results-container initial-message">
                    Enter a URL to start scraping.
                </div>
            )}
        </div>
    );
};

export default UserInput;