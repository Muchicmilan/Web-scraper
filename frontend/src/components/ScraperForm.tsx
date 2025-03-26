import React from "react";

interface ScraperFormProps {
    input: string;
    setInput: (value: string) => void;
    handleSubmit: () => void;
    loading: boolean;
    showAdvanced: boolean;
    setShowAdvanced: (value: boolean) => void;
}

const ScraperForm: React.FC<ScraperFormProps> = ({
    input,
    setInput,
    handleSubmit,
    loading,
    showAdvanced,
    setShowAdvanced,
}) => {

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSubmit();
    };

    return (

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
        </form>
    );
};

export default ScraperForm;