import React from 'react';
import {ListFieldKey} from "@/Types";

interface Props {
    label: string;
    items: string[];
    fieldName: ListFieldKey;
    placeholder?: string;
    required?: boolean;
    minItems?: number;
    onChange: (fieldName: ListFieldKey, index: number, value: string) => void;
    onAdd: (fieldName: ListFieldKey) => void;
    onRemove: (fieldName: ListFieldKey, index: number) => void;
    helpText?: string;
    inputType?: 'text' | 'url';
}

const EditableStringList: React.FC<Props> = ({label, items, fieldName, placeholder, required = false, minItems = 1, onChange, onAdd, onRemove, helpText, inputType = 'text'}) => {
    const canRemove = items.length > minItems;

    return (
        <div className="form-field-list" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{label}:</label>
            {items.map((item, index) => (
                <div key={`${fieldName}-${index}`} style={{ display: 'flex', marginBottom: '5px', alignItems: 'center' }}>
                    <input
                        type={inputType}
                        value={item}
                        onChange={(e) => onChange(fieldName, index, e.target.value)}
                        placeholder={placeholder}
                        required={required && index === 0 && items.length === 1}
                        style={{ flexGrow: 1, marginRight: '5px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    {canRemove && (
                        <button
                            type="button"
                            // Pass fieldName back up
                            onClick={() => onRemove(fieldName, index)}
                            title={`Remove ${label.replace(':', '')}`}
                            style={{ padding: '5px 8px', cursor: 'pointer', border: '1px solid #dc3545', color: '#dc3545', backgroundColor: 'white', borderRadius: '4px' }}
                        >
                            X
                        </button>
                    )}
                </div>
            ))}
            <button
                type="button"
                onClick={() => onAdd(fieldName)}
                style={{ padding: '6px 12px', marginTop: '5px', cursor: 'pointer', border: '1px solid #007bff', color: '#007bff', backgroundColor: 'white', borderRadius: '4px' }}
            >
                Add {label.replace(':', '').replace('(s)', '').replace('(Optional)', '').trim()}
            </button>
            {helpText && <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>{helpText}</small>}
        </div>
    );
};

export default EditableStringList;
