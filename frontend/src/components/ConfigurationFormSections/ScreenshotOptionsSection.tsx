import React from 'react';
import { ScraperConfigurationData } from '../../Types';
import "styles.css"

interface Props {
    options: ScraperConfigurationData['screenshotOptions'];
    enabled: boolean;
    onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // For the enable checkbox
    onOptionChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; // For other options
}

const ScreenshotOptionsSection: React.FC<Props> = ({ options, enabled, onCheckboxChange, onOptionChange }) => (
    <div className="form-section">
        <h3>Screenshots</h3>
        <div className="form-field">
            <label htmlFor="enableScreenshots" style={{ display: 'inline-block', marginRight: '10px' }}>
                Enable Screenshots?
            </label>
            <input
                type="checkbox"
                id="enableScreenshots"
                name="enableScreenshots" // Name matches top-level state key
                checked={enabled}
                onChange={onCheckboxChange} // Use the specific handler for top-level bools
            />
            <small style={{ display: 'block' }}>Saves screenshots to the server filesystem.</small>
        </div>
        {enabled && (
            <div className="options-subsection">
                <div className="form-field">
                    <label htmlFor="screenshotFullPage" style={{ display: 'inline-block', marginRight: '10px' }}>
                        Full Page Screenshot?
                    </label>
                    <input
                        type="checkbox"
                        id="screenshotFullPage"
                        name="fullPage" // Key within screenshotOptions
                        checked={options?.fullPage ?? true}
                        onChange={onOptionChange} // Use the handler for nested options
                    />
                </div>
                {/* Add inputs for type/quality/pathTemplate here if needed, using onOptionChange */}
                {/* Example for type:
                 <div className="form-field">
                    <label htmlFor="screenshotType">Type:</label>
                    <select id="screenshotType" name="type" value={options?.type || 'png'} onChange={onOptionChange}>
                        <option value="png">PNG</option>
                        <option value="jpeg">JPEG</option>
                        <option value="webp">WEBP</option>
                    </select>
                 </div>
                 */}
            </div>
        )}
    </div>
);
export default ScreenshotOptionsSection;