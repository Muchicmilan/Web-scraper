import React from 'react';
import "styles.css"
interface Props {
    schemaString: string;
    detailSchemaString: string;
    schemaError: string | null;
    detailSchemaError: string | null;
    onSchemaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onDetailSchemaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    showDetailSchema: boolean;
}

const SchemaDefinitionSection: React.FC<Props> = ({schemaString, detailSchemaString, schemaError, detailSchemaError, onSchemaChange, onDetailSchemaChange, showDetailSchema}) => (
    <div className="form-section">
        <h3>Target Schemas</h3>
        <div className="form-field">
            <label htmlFor="targetSchema">Target JSON Schema: <span style={{color: 'red'}}>*</span></label>
            <textarea id="targetSchema" name="targetSchema" value={schemaString} onChange={onSchemaChange} rows={8} placeholder='Define your desired JSON output structure here (e.g., { "title": "", "price": 0 }). Must be valid JSON.' style={{ fontFamily: 'monospace' }}/>
            {schemaError && <small style={{ color: 'red', display: 'block' }}>{schemaError}</small>}
            <small>Defines the structure for each scraped item. Use dot.notation in Field Mappings for nested fields.</small>
        </div>
        {showDetailSchema && (
            <div className="form-field">
                <label htmlFor="detailTargetSchema">Detail Target Schema (Optional):</label>
                <textarea id="detailTargetSchema" name="detailTargetSchema" value={detailSchemaString} onChange={onDetailSchemaChange} rows={5} placeholder='Optional JSON structure for detail page data (e.g., { "fullDescription": "" }). Merged with list data.' style={{ fontFamily: 'monospace' }}/>
                {detailSchemaError && <small style={{ color: 'red', display: 'block' }}>{detailSchemaError}</small>}
                <small>Optional JSON structure specifically for data extracted from the DETAIL page. Data extracted here will be merged with data from the list page.</small>
            </div>
        )}
    </div>
);
export default SchemaDefinitionSection;