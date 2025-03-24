import React, { useState } from "react";
import axios from "axios";
import "./styles.css";
import ScraperForm from "./components/ScraperForm";
import AdvancedOptions from "./components/AdvancedOptions";
import ResultsDisplay from "./components/ResultDisplay";

export interface ScrapeOptions {
  contentSelector?: string;
  headingSelectors?: string[];
  contentSelectors?: string[];
  excludeSelectors?: string[];
  minContentLength?: number;
}

const UserInput: React.FC = () => {
    const [input, setInput] = useState<string>("");
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
    const [options, setOptions] = useState<ScrapeOptions>({
      contentSelector: "",
      headingSelectors: [],
      contentSelectors: [],
      excludeSelectors: [],
      minContentLength: 500
    });
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const handleSubmit = async () => {
        if(!input.trim()) return;
        
        setLoading(true);
        try {

          const cleanOptions: ScrapeOptions = {};
          
          if (options.contentSelector) cleanOptions.contentSelector = options.contentSelector;
          if (options.headingSelectors?.length) cleanOptions.headingSelectors = options.headingSelectors.filter(Boolean);
          if (options.contentSelectors?.length) cleanOptions.contentSelectors = options.contentSelectors.filter(Boolean);
          if (options.excludeSelectors?.length) cleanOptions.excludeSelectors = options.excludeSelectors.filter(Boolean);
          if (options.minContentLength) cleanOptions.minContentLength = options.minContentLength;
          

          const payload = showAdvanced 
            ? { url: input, options: cleanOptions }
            : { url: input };
            
          const response = await axios.post("http://localhost:5000/api/scrape", payload);
          setResults(response.data);
          console.log("Server Response: ", response.data);
        } catch(error) {
          console.error("Error: ", error);
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
                <AdvancedOptions 
                    options={options}
                    onOptionsChange={handleOptionsChange}
                />
            )}
            
            {results && (
                <ResultsDisplay results={results} />
            )}
        </div>
    );
};

export default UserInput;