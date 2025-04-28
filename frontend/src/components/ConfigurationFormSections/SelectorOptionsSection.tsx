import React from 'react';
import { ScraperConfigurationData } from '../../Types';
import "styles.css"

interface Props {
    formData: Partial<ScraperConfigurationData>;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isListPage: boolean;
    showInlineDetailOptions: boolean;
}

const SelectorOptionsSection: React.FC<Props> = ({ formData, onInputChange, isListPage, showInlineDetailOptions }) => (
    <div className="form-section">
        <h3>Selectors</h3>
        <div className="form-field">
            <label htmlFor="itemSelector">Item Selector: <span style={{color: 'red'}}>*</span></label>
            <input type="text" id="itemSelector" name="itemSelector" value={formData.itemSelector || ''} onChange={onInputChange} required placeholder={isListPage ? "Selector for each item block on list" : "Selector for main content block"}/>
            <small>
                {isListPage
                    ? 'Selector finding each article/item block on the list page.'
                    : 'Selector finding the main content area on the detail page.'}
            </small>
        </div>
        {/* Conditionally show Detail Item Selector */}
        {showInlineDetailOptions && (
            <div className="form-field">
                <label htmlFor="detailItemSelector">Detail Page Item Selector (Optional):</label>
                <input type="text" id="detailItemSelector" name="detailItemSelector" value={formData.detailItemSelector || ''} onChange={onInputChange} placeholder="e.g., article.main-content" />
                <small>
                    Selector for the main content block on the linked DETAIL page. If blank, the primary 'Item Selector' above will be used.
                </small>
            </div>
        )}
    </div>
);
export default SelectorOptionsSection;