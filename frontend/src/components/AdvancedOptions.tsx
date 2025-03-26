import React from "react";
import { ScrapeOptions } from "../Types"; // Adjust path if needed

interface AdvancedOptionsProps {
    options: ScrapeOptions;
    onOptionsChange: (options: ScrapeOptions) => void;
}

const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
    options,
    onOptionsChange,
}) => {
    const handleArrayInputChange = (
        field: keyof Pick<ScrapeOptions, 'headingSelectors' | 'contentSelectors' | 'excludeSelectors'>,
        value: string
    ) => {
        const arrayValue = value.split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        onOptionsChange({ ...options, [field]: arrayValue });
    };

    return (
        <div className="advanced-options">
            <h3>Advanced Scraping Options</h3>
            <p className="options-helper-text">
                Specify CSS selectors. Leave blank for defaults. Use commas for multiple.
            </p>

            <div className="option-row">
                <label htmlFor="contentSelector" className="option-label">
                    Content Container(s):
                </label>
                <input
                    id="contentSelector"
                    type="text"
                    placeholder="article, .post-content, main"
                    value={options.contentSelector || ""}
                    onChange={(e) =>
                        onOptionsChange({ ...options, contentSelector: e.target.value })
                    }
                    className="option-input"
                />
            </div>

            <div className="option-row">
                <label htmlFor="headingSelectors" className="option-label">
                    Heading Selector(s):
                </label>
                <input
                    id="headingSelectors"
                    type="text"
                    placeholder="h1, h2, .section-title"
                    value={options.headingSelectors?.join(", ") ?? ""}
                    onChange={(e) => handleArrayInputChange('headingSelectors', e.target.value)}
                    className="option-input"
                />
            </div>

            <div className="option-row">
                <label htmlFor="contentSelectors" className="option-label">
                    Text Element Selector(s):
                </label>
                <input
                    id="contentSelectors"
                    type="text"
                    placeholder="p, li, .text-block (less common)"
                    value={options.contentSelectors?.join(", ") ?? ""}
                    onChange={(e) => handleArrayInputChange('contentSelectors', e.target.value)}
                    className="option-input"
                />
            </div>

            <div className="option-row">
                <label htmlFor="excludeSelectors" className="option-label">
                    Exclude Element Selector(s):
                </label>
                <input
                    id="excludeSelectors"
                    type="text"
                    placeholder=".sidebar, .ad-banner, footer"
                    value={options.excludeSelectors?.join(", ") ?? ""}
                    onChange={(e) => handleArrayInputChange('excludeSelectors', e.target.value)}
                    className="option-input"
                />
            </div>

            <div className="option-row">
                <label htmlFor="minContentLength" className="option-label">
                    Min. Section Length:
                </label>
                <input
                    id="minContentLength"
                    type="number"
                    min="0" 
                    value={options.minContentLength ?? 100}
                    onChange={(e) =>
                        onOptionsChange({
                            ...options,
                            minContentLength: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                    }
                    className="number-input"
                    style={{maxWidth: '100px'}} 
                />
                 <span className="input-unit-label">characters</span>
            </div>
        </div>
    );
};

export default AdvancedOptions;