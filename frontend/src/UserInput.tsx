import React, { useState } from "react";
import axios from "axios";
import ScraperForm from "./components/ScraperForm";
import AdvancedOptions from "./components/AdvancedOptions";
import ResultsDisplay from "./components/ResultDisplay";
import { ScrapeOptions, ScrapedData } from "./Types";

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
  const [results, setResults] = useState<{ success: boolean; data: ScrapedData } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null); 
    try {
      const cleanOptions: ScrapeOptions = {};

      if (options.contentSelector)
        cleanOptions.contentSelector = options.contentSelector;
      if (options.headingSelectors?.length)
        cleanOptions.headingSelectors = options.headingSelectors.filter(Boolean);
      if (options.contentSelectors?.length)
        cleanOptions.contentSelectors = options.contentSelectors.filter(Boolean);
      if (options.excludeSelectors?.length)
        cleanOptions.excludeSelectors = options.excludeSelectors.filter(Boolean);
      if (options.minContentLength)
        cleanOptions.minContentLength = options.minContentLength;

      const payload = showAdvanced
        ? { url: input, options: cleanOptions }
        : { url: input };

      const response = await axios.post(
        "http://localhost:5000/api/scrape",
        payload
      );

        if (response.status === 201){
            setResults(response.data);
        } else if (response.status === 409) {
            setError("This URL has already been scraped."); // Set the error state.
            console.error("Duplicate URL:", response.data);
        }

    } catch (err: any) {
        console.error("Error: ", err);

        if (axios.isAxiosError(err)) {
            if (err.response) {
                  if(err.response.status === 409){
                    setError(err.response.data.message || "This URL has already been scraped");
                  } else {
                    setError(`Server Error: ${err.response.status} - ${err.response.data.error || err.response.data}`);
                }
            } else if (err.request) {
                setError("No response received from server.  Please check your network connection.");
            } else {
                setError("An unexpected error occurred: " + err.message);
            }
        } else {
            setError("An unexpected error occurred: " + err.message);
        }
        setResults(null);
    } finally {
      setLoading(false);
    }
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
        loading={loading}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
      />

      {showAdvanced && (
        <AdvancedOptions options={options} onOptionsChange={handleOptionsChange} />
      )}

      {error && <ResultsDisplay results={null} error={error} />}
      {results && <ResultsDisplay results={results} />}
    </div>
  );
};

export default UserInput;