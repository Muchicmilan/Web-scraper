import React from "react";

interface ScraperFormProps {
    input: string;
    setInput: (value: string) => void;
    keywordsInput: string;
    setKeywordsInput: (value: string) => void;
    handleSubmit: () => void;
    loading: boolean;
    showAdvanced: boolean;
    setShowAdvanced: (value: boolean) => void;
    scrapeLinkedPages: boolean;        
    setScrapeLinkedPages: (value: boolean) => void; 
}

const ScraperForm: React.FC<ScraperFormProps> = ({
    input,
    setInput,
    keywordsInput,
    setKeywordsInput,
    handleSubmit,
    loading,
    showAdvanced,
    setShowAdvanced,
    scrapeLinkedPages,      
    setScrapeLinkedPages      
}) => {

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSubmit();
    };

    return (
        //URL input and submit button
        <form onSubmit={onSubmit}>
            <div className="url-input-container">
                <input
                    type="url"
                    placeholder="Enter website URL (e.g., https://example.com)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="url-input"
                    required
                    disabled={loading}
                    aria-label="Website URL Input"
                />
                <button
                    type="submit"
                    className="submit-button"
                    disabled={loading || !input.trim()}
                    aria-live="polite"
                >
                    {loading ? "Scraping..." : "Submit"}
                </button>
            </div>
            {/*Keyword(Tag) input*/}
            <div className="option-row" style={{ marginBottom: '15px' }}>
                 <label htmlFor="keywordsInput" className="option-label" style={{width: 'auto', marginRight: '10px'}}>
                    Analyze for Keywords:
                </label>
                <input
                    id="keywordsInput"
                    type="text"
                    placeholder="e.g., Nis, politics (comma-separated) for filtering"
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                    className="option-input"
                    disabled={loading}
                    aria-label="Keywords to analyze (comma-separated)"
                />
            </div>            

            <div className="form-toggle-container">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="options-toggle"
                    disabled={loading}
                    aria-expanded={showAdvanced}
                >
                    {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
                </button>
            </div>

             <div className="form-toggle-container" style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}> {/* Basic styling */}
                <input
                    type="checkbox"
                    id="scrapeLinkedPagesCheckbox"
                    checked={scrapeLinkedPages}
                    onChange={(e) => setScrapeLinkedPages(e.target.checked)}
                    disabled={loading}
                    style={{ marginRight: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}
                    aria-describedby="scrapeLinkedPagesLabel"
                />
                <label
                    htmlFor="scrapeLinkedPagesCheckbox"
                    id="scrapeLinkedPagesLabel"
                    style={{ cursor: loading ? 'not-allowed' : 'pointer', userSelect: 'none' }}
                >
                    Scrape Same-Domain Links Found on Page? (Sequential)
                </label>
            </div>
        </form>
    );
};

export default ScraperForm;