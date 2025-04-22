import React from 'react';
import { FieldMapping } from '../Types';

interface Props {
    index: number;
    mapping: FieldMapping;
    onChange: (index: number, mapping: FieldMapping) => void;
    onRemove: (index: number) => void;
}

const FieldMappingInput: React.FC<Props> = ({ index, mapping, onChange, onRemove }) => {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onChange(index, { ...mapping, [name]: value });
    };

    return (
        <div className="field-mapping-row" style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px' }}> {/* Add styles */}
            <div>
                <label>Field Name (e.g., title, author.name):</label>
                <input type="text" name="fieldName" value={mapping.fieldName} onChange={handleChange} required />
            </div>
            <div>
                <label>Selector (relative to Item Selector):</label>
                <input type="text" name="selector" value={mapping.selector} onChange={handleChange} required />
            </div>
            <div>
                <label>Extract From:</label>
                <select name="extractFrom" value={mapping.extractFrom} onChange={handleChange}>
                    <option value="text">Text Content</option>
                    <option value="attribute">Attribute</option>
                    <option value="html">Inner HTML</option>
                </select>
            </div>
            {mapping.extractFrom === 'attribute' && (
                <div>
                    <label>Attribute Name (e.g., href, src):</label>
                    <input type="text" name="attributeName" value={mapping.attributeName || ''} onChange={handleChange} required />
                </div>
            )}
            <button type="button" onClick={() => onRemove(index)}>Remove Mapping</button>
        </div>
    );
};

export default FieldMappingInput;