import React from 'react';
import EditableStringList from '../EditableStringList';
import {ListFieldKey} from "@/Types";
import "styles.css"

interface Props {
    selectors: string[];
    onListInputChange: (fieldName: ListFieldKey, index: number, value: string) => void;
    onAddListItem: (fieldName: ListFieldKey) => void;
    onRemoveListItem: (fieldName: ListFieldKey, index: number) => void;
}

const ClosePopupsSection: React.FC<Props> = ({ selectors, onListInputChange, onAddListItem, onRemoveListItem }) => (
    <div className="form-section">
        <h3>Close Popups (Before Interactions)</h3>
        <EditableStringList
            label="Popup Selectors (Optional)"
            items={selectors}
            fieldName="closePopupSelectors"
            placeholder="e.g., .cookie-consent .accept-button"
            minItems={0}
            onChange={onListInputChange}
            onAdd={onAddListItem}
            onRemove={onRemoveListItem}
            helpText="Selectors for elements to click/remove (e.g., cookie banners, modals) after page wait but before interactions/scraping."
        />
    </div>
);
export default ClosePopupsSection;