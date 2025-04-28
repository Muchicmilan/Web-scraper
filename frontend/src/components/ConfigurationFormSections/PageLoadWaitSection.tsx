import React from 'react';
import { PageLoadWaitOptions } from '../../Types';
import "styles.css"

interface Props {
    options: PageLoadWaitOptions | undefined;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const defaultOptions: Required<Omit<PageLoadWaitOptions, 'waitForSelector' | 'waitForTimeout'>> & Pick<PageLoadWaitOptions, 'waitForSelector' | 'waitForTimeout'> = {
    waitStrategy: 'none',
    waitForTimeout: undefined,
    waitForSelector: '',
    waitForTimeoutOnSelector: 30000,
};

const PageLoadWaitSection: React.FC<Props> = ({ options, onChange }) => {
    const currentOptions = { ...defaultOptions, ...(options ?? {}) };
    const strategy = currentOptions.waitStrategy;

    return (
        <div className="form-section">
            <h3>Page Load Waiting Strategy</h3>
            <small style={{ display: 'block', marginBottom: '10px', color: '#666' }}>
                Optional: Wait for conditions after initial load but before interactions/scraping.
            </small>
            <div className="form-field">
                <label htmlFor="pageLoadWaitStrategy">Wait Strategy:</label>
                <select id="pageLoadWaitStrategy" name="waitStrategy" value={strategy} onChange={onChange}>
                    <option value="none">None (Default)</option>
                    <option value="timeout">Wait for Fixed Timeout</option>
                    <option value="selector">Wait for CSS Selector</option>
                </select>
            </div>
            {strategy === 'timeout' && (
                <div className="form-field options-subsection">
                    <label htmlFor="pageLoadWaitForTimeout">Wait Timeout (ms): <span style={{color: 'red'}}>*</span></label>
                    <input type="number" id="pageLoadWaitForTimeout" name="waitForTimeout" min="1"
                           value={currentOptions.waitForTimeout ?? ''} onChange={onChange} required />
                </div>
            )}
            {strategy === 'selector' && (
                <div className="options-subsection">
                    <div className="form-field">
                        <label htmlFor="pageLoadWaitForSelector">Wait For Selector: <span style={{color: 'red'}}>*</span></label>
                        <input type="text" id="pageLoadWaitForSelector" name="waitForSelector"
                               value={currentOptions.waitForSelector} onChange={onChange}
                               placeholder="e.g., #main-content" required style={{ width: '95%' }}/>
                    </div>
                    <div className="form-field">
                        <label htmlFor="pageLoadWaitForTimeoutOnSelector">Selector Wait Timeout (ms):</label>
                        <input type="number" id="pageLoadWaitForTimeoutOnSelector" name="waitForTimeoutOnSelector" min="500"
                               value={currentOptions.waitForTimeoutOnSelector} onChange={onChange} />
                        <small>Max time to wait for the selector.</small>
                    </div>
                </div>
            )}
        </div>
    );
};
export default PageLoadWaitSection;