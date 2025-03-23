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
    setShowAdvanced
}) => {
    return (
        <>
            <div className="url-input-container">
                <input 
                    type="text"
                    placeholder="Enter the URL here"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="url-input"
                />
                <button 
                    onClick={handleSubmit}
                    className="submit-button"
                    disabled={loading}
                >
                    {loading ? "Scraping..." : "Submit"}
                </button>
            </div>
            
            <div>
                <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="options-toggle"
                >
                    {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
                </button>
            </div>
        </>
    );
};

export default ScraperForm;