import React from 'react';
import { ScraperConfigurationData } from '../../Types';
import "styles.css"

interface Props {
    formData: Partial<ScraperConfigurationData>;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SchedulingSection: React.FC<Props> = ({ formData, onInputChange, onCheckboxChange }) => (
    <div className="form-section">
        <h3>Scheduling (Cron)</h3>
        <div className="form-field">
            <label htmlFor="cronEnabled" style={{ display: 'inline-block', marginRight: '10px' }}>
                Enable Automatic Scheduling?
            </label>
            <input
                type="checkbox"
                id="cronEnabled"
                name="cronEnabled" // Top-level state key
                checked={!!formData.cronEnabled}
                onChange={onCheckboxChange} // Handler for top-level bools
            />
        </div>
        {formData.cronEnabled && (
            <div className="form-field">
                <label htmlFor="cronSchedule">Cron Schedule: <span style={{color: 'red'}}>*</span></label>
                <input
                    style={{ fontFamily: 'monospace' }}
                    type="text"
                    id="cronSchedule"
                    name="cronSchedule"
                    value={formData.cronSchedule || ''}
                    onChange={onInputChange}
                    placeholder="e.g., 0 9 * * 1 (Every Monday at 9:00 AM)"
                    required={formData.cronEnabled}
                />
                <small>
                    Use standard cron syntax. Server timezone applies. See <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer">crontab.guru</a>.
                </small>
            </div>
        )}
    </div>
);
export default SchedulingSection;