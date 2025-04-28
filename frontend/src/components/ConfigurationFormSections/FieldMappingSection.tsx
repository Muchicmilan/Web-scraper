import React from 'react';
import FieldMappingInput from '../FieldMappingInput';
import { FieldMapping } from '../../Types';
import "styles.css"

interface Props {
    label: string;
    helpText: string;
    mappings: FieldMapping[];
    onMappingChange: (index: number, mapping: FieldMapping) => void;
    onAddMapping: () => void;
    onRemoveMapping: (index: number) => void;
    isDetailSection?: boolean; // Optional prop for styling/logic differences
}

const FieldMappingsSection: React.FC<Props> = ({
                                                   label, helpText, mappings, onMappingChange, onAddMapping, onRemoveMapping, isDetailSection = false
                                               }) => (
    <div className={`form-section field-mappings-section ${isDetailSection ? 'detail-mappings' : 'primary-mappings'}`}>
        <h3>{label} {mappings.length === 0 && !isDetailSection ? <span style={{color: 'red'}}>*</span> : ''}</h3>
        <small style={{ display: 'block', marginBottom: '10px', color: '#666' }}>{helpText}</small>
        {mappings.map((mapping, index) => (
            <FieldMappingInput
                key={`mapping-${isDetailSection ? 'detail-' : ''}${index}`}
                index={index}
                mapping={mapping}
                onChange={onMappingChange}
                onRemove={onRemoveMapping}
            />
        ))}
        <button type="button" onClick={onAddMapping} style={{ padding: '6px 12px', marginTop: '5px' }}>
            Add {isDetailSection ? 'Detail' : 'Primary'} Field Mapping
        </button>
    </div>
);
export default FieldMappingsSection;