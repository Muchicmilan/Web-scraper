import React, { useCallback, useState } from "react";
import ScraperForm from "./components/ScraperForm";
import AdvancedOptions from "./components/AdvancedOptions";
import ResultsDisplay from "./components/ResultDisplay";
import { useScraper } from "./hooks/useScraper";
import { ScrapeOptions, ScrapeRequestBodyOptions } from "./Types";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const UserInput: React.FC = () => {
    const [input, setInput] = useState<string>("");
    const [keywordsInput, setKeywordsInput] = useState<string>("");
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
    const [scrapeLinkedPages, setScrapeLinkedPages] = useState<boolean>(false);
    const [options, setOptions] = useState<ScrapeOptions>({
        contentSelector: "",
        headingSelectors: [],
        excludeSelectors: [],
        minContentLength: 100,
    });

    const { results, error, loading, scrapeUrl } = useScraper(`${API_BASE_URL}/api/scrape`);

    const handleSubmit = useCallback(() => {
        const keywords = keywordsInput
        .split(',')
        .map(kw => kw.trim())
        .filter(Boolean);

         let advancedOptionsPayload: Partial<ScrapeOptions> = {};

         if (showAdvanced) {
             if (options.contentSelector?.trim()) advancedOptionsPayload.contentSelector = options.contentSelector.trim();
             const fHeadings = options.headingSelectors?.map(s => s.trim()).filter(Boolean);
             if (fHeadings?.length) advancedOptionsPayload.headingSelectors = fHeadings;
             const fExclude = options.excludeSelectors?.map(s => s.trim()).filter(Boolean);
             if (fExclude?.length) advancedOptionsPayload.excludeSelectors = fExclude;
             if (options.minContentLength !== undefined && options.minContentLength !== 100) {
                advancedOptionsPayload.minContentLength = Math.max(0, options.minContentLength);
             }
         }

         const finalOptions: ScrapeRequestBodyOptions = {
            ...(Object.keys(advancedOptionsPayload).length > 0 && advancedOptionsPayload),
            ...(scrapeLinkedPages && {scrapeLinkedPages : true}),
            ...(keywords.length > 0 && {tags: keywords})
         };

         const payload = {
             url: input.trim(),
             ...( (Object.keys(finalOptions).length > 0 && finalOptions.scrapeLinkedPages !== undefined) ? { options: finalOptions } : {} )
         };


        scrapeUrl(payload.url, payload.options);
    }, [input, keywordsInput, options, showAdvanced, scrapeLinkedPages, scrapeUrl]);

    const handleOptionsChange = (newOptions: Partial<ScrapeOptions>) => {
        setOptions(prev => ({ ...prev, ...newOptions }));
    };

    return (
        <div className="scraper-container">
            <h1 className="scraper-title">Web Scraper</h1>

            <ScraperForm
                input={input}
                setInput={setInput}
                keywordsInput = {keywordsInput}
                setKeywordsInput = {setKeywordsInput}
                handleSubmit={handleSubmit}
                loading={loading}
                showAdvanced={showAdvanced}
                setShowAdvanced={setShowAdvanced}
                scrapeLinkedPages={scrapeLinkedPages}         
                setScrapeLinkedPages={setScrapeLinkedPages}
            />

            {showAdvanced && (
                <AdvancedOptions options={options} onOptionsChange={handleOptionsChange} />
            )}

            {/* Results display - Will need adjustment */}
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