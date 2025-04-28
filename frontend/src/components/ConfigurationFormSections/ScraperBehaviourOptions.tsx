import React from 'react';
import EditableStringList from '../EditableStringList';
import {ListFieldKey, ScraperConfigurationData} from '../../Types';
import "styles.css"

interface Props {
    formData: Partial<ScraperConfigurationData>;
    isListPage: boolean;
    onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onListInputChange: (fieldName: ListFieldKey, index: number, value: string) => void;
    onAddListItem: (fieldName: ListFieldKey) => void;
    onRemoveListItem: (fieldName: ListFieldKey, index: number) => void;
}

const ScrapeBehaviourOptionsSection: React.FC<Props> = ({formData, isListPage, onCheckboxChange, onListInputChange, onAddListItem, onRemoveListItem}) => (
    <div className="form-section">
        <h3>Scraping Behaviour</h3>
        {isListPage && (
            <div className="form-field">
                <label htmlFor="scrapeDetailsFromList" style={{ display: 'inline-block', marginRight: '10px' }}>
                    Scrape Detail Pages Found on List?
                </label>
                <input
                    type="checkbox"
                    id="scrapeDetailsFromList"
                    name="scrapeDetailsFromList"
                    checked={!!formData.scrapeDetailsFromList}
                    onChange={onCheckboxChange}
                />
                <small style={{ display: 'block' }}>
                    If checked, the scraper will attempt to find a link within each item block and visit it. Requires 'List Page' type.
                </small>
            </div>
        )}
        <EditableStringList
            label="Exclude Selectors (Optional)"
            items={formData.scrapeOptions?.excludeSelectors || []}
            fieldName="excludeSelectors"
            placeholder="e.g., footer, .ads"
            minItems={0} // Can have zero exclude selectors
            onChange={onListInputChange}
            onAdd={onAddListItem}
            onRemove={onRemoveListItem}
            helpText="Elements matching these selectors will be removed before data extraction."
        />
        <EditableStringList
            label="Keywords to Filter By (Optional)"
            items={formData.keywordsToFilterBy || []}
            fieldName="keywordsToFilterBy"
            placeholder="e.g., scraping, data"
            minItems={0} // Can have zero keywords
            onChange={onListInputChange}
            onAdd={onAddListItem}
            onRemove={onRemoveListItem}
            helpText="If added, only items containing at least one keyword will be saved."
        />
    </div>
);
export default ScrapeBehaviourOptionsSection;