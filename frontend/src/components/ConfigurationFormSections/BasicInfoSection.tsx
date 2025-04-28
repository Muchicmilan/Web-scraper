import React from 'react';
import EditableStringList from "../EditableStringList";
import {ListFieldKey, ScraperConfigurationData} from "@/Types";
import "styles.css"

interface Props {
    formData: Partial<ScraperConfigurationData>;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onListInputChange: (fieldName: ListFieldKey, index: number, value: string) => void;
    onAddListItem: (fieldName: ListFieldKey) => void;
    onRemoveListItem: (fieldName: ListFieldKey, index: number) => void;
}

const BasicInfoSection: React.FC<Props> =({
    formData,
    onInputChange,
    onListInputChange,
    onAddListItem,
    onRemoveListItem
}) => {
    return (
        <div className="form-section">
            <h3>Basic Information</h3>
            <div style={{marginBottom: '10px'}}>
                <label htmlFor="name" style={{display: 'block', marginBottom: '3px'}}>Name: <span
                    style={{color: 'red'}}>*</span></label>
                <input style={{width: '95%', padding: '8px'}} type="text" id="name" name="name"
                       value={formData.name || ''} onChange={onInputChange} required/>
            </div>

            <EditableStringList
                label="Start URL(s):"
                items={formData.startUrls || ['']}
                fieldName="startUrls"
                placeholder="https://example.com"
                required={true}
                minItems={1}
                onChange={onListInputChange}
                onAdd={onAddListItem}
                onRemove={onRemoveListItem}
            />

            <div style={{marginBottom: '10px'}}>
                <label htmlFor="pageType" style={{display: 'block', marginBottom: '3px'}}>Page Type: <span
                    style={{color: 'red'}}>*</span></label>
                <select id="pageType" name="pageType" value={formData.pageType || 'DetailPage'} onChange={onInputChange}
                        style={{padding: '8px'}}>
                    <option value="DetailPage">Detail Page (Each Start URL has the item)</option>
                    <option value="ListPage">List Page (Start URL has list of items/links)</option>
                </select>
            </div>
        </div>
    );
};

export default BasicInfoSection;