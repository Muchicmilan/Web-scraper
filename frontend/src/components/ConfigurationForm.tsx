import React, { useState, useEffect, useCallback } from 'react';
import { ScraperConfiguration, ScraperConfigurationData, FieldMapping } from "../Types"
import { useScraperManager } from '../hooks/useScraperManager'; 
import FieldMappingInput from './FieldMappingInput';
import { getApiErrorMessage } from '../api/ScraperApi';


interface Props {
    initialData: ScraperConfiguration | null; 
    onSaveSuccess: (savedConfig: ScraperConfiguration) => void;
    onCancel: () => void;
}

type ListFieldKey = 'startUrls' | 'excludeSelectors' | 'keywordsToFilterBy';

const ConfigurationForm: React.FC<Props> = ({ initialData, onSaveSuccess, onCancel }) => {
    const { createConfiguration, updateConfiguration, isLoading } = useScraperManager();
    const [formData, setFormData] = useState<Partial<ScraperConfigurationData>>({});
    const [schemaString, setSchemaString] = useState<string>('{}');
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const [detailSchemaString, setDetailSchemaString] = useState<string>('{}');
    const [detailSchemaError, setDetailSchemaError] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            const { _id, createdAt, updatedAt, ...editData } = initialData;
            setFormData({
                name: editData.name || '',
                startUrls: editData.startUrls || [''],
                pageType: editData.pageType || 'DetailPage',
                itemSelector: editData.itemSelector || '',
                scrapeDetailsFromList: editData.scrapeDetailsFromList ?? false,
                scrapeOptions: editData.scrapeOptions || { excludeSelectors: [] },
                keywordsToFilterBy: editData.keywordsToFilterBy || [],
                fieldMappings: editData.fieldMappings || [],
                detailItemSelector: editData.detailItemSelector || '',
                detailTargetSchema: editData.detailTargetSchema || {},
                detailFieldMappings : editData.detailFieldMappings || [],
                targetSchema: editData.targetSchema || {},
                cronSchedule : editData.cronSchedule || '',
                cronEnabled : editData.cronEnabled || false,
                enableScreenshots : editData.enableScreenshots ?? false,
                screenshotOptions: editData.screenshotOptions ?? {fullPage: true}
            });
            setSchemaString(JSON.stringify(editData.targetSchema || {}, null, 2));
            setDetailSchemaString(JSON.stringify(editData.detailTargetSchema || {}, null, 2));
            setSchemaError(null);
            setDetailSchemaError(null);
        } else {
            setFormData({
                name: '',
                startUrls: [''], 
                pageType: 'DetailPage',
                itemSelector: '',
                scrapeDetailsFromList: false,
                fieldMappings: [],
                detailItemSelector: '',
                detailTargetSchema: {},
                detailFieldMappings: [],
                scrapeOptions: { excludeSelectors: [] },
                keywordsToFilterBy: [],
                targetSchema: {},
                cronSchedule: '',
                cronEnabled: false,
                enableScreenshots: false,
                screenshotOptions: {fullPage: true}
            });
            setSchemaString('{}');
            setDetailSchemaString('{}');
            setSchemaError(null);
            setDetailSchemaError(null);
        }
    }, [initialData]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSchemaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newSchemaString = e.target.value;
        setSchemaString(newSchemaString);
        try {
            JSON.parse(newSchemaString);
            setSchemaError(null);
        } catch (error) {
            setSchemaError("Invalid JSON format."); 
        }
    }, []);

    const handleDetailSchemaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newSchemaString = e.target.value;
        setDetailSchemaString(newSchemaString);
        try { JSON.parse(newSchemaString); setDetailSchemaError(null); }
        catch (error) { setDetailSchemaError("Invalid JSON format for Detail Schema."); }
    }, []);

    const handleListInputChange = useCallback((
        fieldName: ListFieldKey,
        index: number,
        value: string
    ) => {
        setFormData(prev => {
            let currentList: string[] = [];
            if (fieldName === 'excludeSelectors') {
                currentList = [...(prev.scrapeOptions?.excludeSelectors || [])];
            } else {
                currentList = [...(prev[fieldName] || [])];
            }

            currentList[index] = value;

            if (fieldName === 'excludeSelectors') {
                return { ...prev, scrapeOptions: { ...prev.scrapeOptions, excludeSelectors: currentList } };
            } else {
                return { ...prev, [fieldName]: currentList };
            }
        });
    }, []);

    const addListItem = useCallback((fieldName: ListFieldKey) => {
        setFormData(prev => {
            let currentList: string[] = [];
            if (fieldName === 'excludeSelectors') {
                currentList = [...(prev.scrapeOptions?.excludeSelectors || [])];
            } else {
                currentList = [...(prev[fieldName] || [])];
            }
            const newList = [...currentList, ''];

            if (fieldName === 'excludeSelectors') {
                return { ...prev, scrapeOptions: { ...prev.scrapeOptions, excludeSelectors: newList } };
            } else {
                return { ...prev, [fieldName]: newList };
            }
        });
    }, []);

    const removeListItem = useCallback((fieldName: ListFieldKey, index: number) => {
        setFormData(prev => {
             let currentList: string[] = [];
            if (fieldName === 'excludeSelectors') {
                currentList = [...(prev.scrapeOptions?.excludeSelectors || [])];
            } else {
                currentList = [...(prev[fieldName] || [])];
            }
             if (fieldName === 'startUrls' && currentList.length <= 1) {
                 return prev;
             }

            const newList = currentList.filter((_, i) => i !== index);

            if (fieldName === 'excludeSelectors') {
                return { ...prev, scrapeOptions: { ...prev.scrapeOptions, excludeSelectors: newList } };
            } else {
                return { ...prev, [fieldName]: newList };
            }
        });
    }, []);


    const handleMappingChange = useCallback((index: number, updatedMapping: FieldMapping) => {
        setFormData(prev => {
            const newMappings = [...(prev.fieldMappings || [])];
            newMappings[index] = updatedMapping;
            return { ...prev, fieldMappings: newMappings };
        });
    }, []);

    const addMapping = useCallback(() => {
        const newMapping: FieldMapping = { fieldName: '', selector: '', extractFrom: 'text' };
        setFormData(prev => ({ ...prev, fieldMappings: [...(prev.fieldMappings || []), newMapping] }));
    }, []);

    const removeMapping = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            fieldMappings: (prev.fieldMappings || []).filter((_, i) => i !== index)
        }));
    }, []);

    const handleDetailMappingChange = useCallback((index: number, updatedMapping: FieldMapping) =>{
        setFormData(prev => {
            const newMappings = [...(prev.detailFieldMappings || [])];
            newMappings[index] = updatedMapping;
            return {...prev, detailFieldMappings: newMappings};
        });
    }, []);

    const addDetailMapping = useCallback(() => {
        const newMapping: FieldMapping = { fieldName: '', selector: '', extractFrom: 'text' };
        setFormData(prev => ({ ...prev, detailFieldMappings: [...(prev.detailFieldMappings || []), newMapping] }));
    }, []);    

    const removeDetailMapping = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            detailFieldMappings: (prev.detailFieldMappings || []).filter((_, i) => i !== index)
        }));
    }, []);

    const handleCheckboxChange = useCallback((e : React.ChangeEvent<HTMLInputElement>)=>{
        const {name, checked} = e.target;
        setFormData(prev => ({...prev,[name]: checked}));
    }, []);

    const handleScreenshotOptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            screenshotOptions: {
                ...(prev.screenshotOptions ?? {}),
                [name]: checked
            }
        }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSchemaError(null);
        setDetailSchemaError(null);

        const finalStartUrls = formData.startUrls?.map(s => s.trim()).filter(Boolean) || [];
        if (!formData.name || finalStartUrls.length === 0 || !formData.itemSelector || !formData.fieldMappings || formData.fieldMappings.length === 0) {
            alert("Please fill in Name, at least one Start URL, Item Selector, and at least one Field Mapping.");
            return;
        }
        if (formData.scrapeDetailsFromList && (!formData.detailFieldMappings || formData.detailFieldMappings.length === 0)) {
            alert("When 'Scrape Detail Pages' is checked, at least one Detail Field Mapping is required.");
            return;
        }
        let finalSchema = {};
        let finalDetailSchema = {};
        try {
            finalSchema = JSON.parse(schemaString);
        } catch {
            setSchemaError("Target Schema contains invalid JSON. Please fix before saving.");
            alert("Target Schema contains invalid JSON. Please fix before saving.");
            return;
        }

        if(formData.pageType === 'ListPage' && formData.scrapeDetailsFromList){
            try{
                finalDetailSchema = JSON.parse(detailSchemaString);
            }catch{
                setDetailSchemaError("Detail Target Schema contains invalid JSON");
            }
        }

        if(schemaError || detailSchemaError){
            alert("One or more Target Schemas contain invalid JSON. Please fix before saving.");
            return;
        }

         if (typeof finalSchema !== 'object' || finalSchema === null || Array.isArray(finalSchema)) {
            setSchemaError("Target Schema must be a valid JSON object (e.g., {}).");
            alert("Target Schema must be a valid JSON object (e.g., {}).");
             return;
         }

         if (formData.pageType === 'ListPage' && formData.scrapeDetailsFromList && (typeof finalDetailSchema !== 'object' || finalDetailSchema === null || Array.isArray(finalDetailSchema))) {
            setDetailSchemaError("Detail Target Schema must be a valid JSON object.");
            alert("Detail Target Schema must be a valid JSON object.");
            return;

       }

       if (formData.cronEnabled && !formData.cronSchedule?.trim()){
        alert("Please provide a valid Cron Schedule when scheduling is enabled.");
        return;
       }

       if (formData.cronEnabled && formData.cronSchedule && formData.cronSchedule.split(' ').length < 5){
        alert("Cron Schedule format seems incorrect. Use format like '* * * * *' (minute hour day-of-month month day-of-week).");
        return;
       }

         const finalFieldMappings = formData.fieldMappings?.filter(m => m.fieldName && m.selector) || [];
         const finalDetailFieldMappings = formData.detailFieldMappings?.filter(m => m.fieldName && m.selector) || [];


        const dataToSave: ScraperConfigurationData = {
            name: formData.name,
            startUrls: finalStartUrls,
            pageType: formData.pageType || 'DetailPage',
            itemSelector: formData.itemSelector,
            scrapeDetailsFromList: formData.scrapeDetailsFromList ?? false,
            scrapeOptions: {
                 excludeSelectors: formData.scrapeOptions?.excludeSelectors?.map(s => s.trim()).filter(Boolean) || [],
            },
            targetSchema: finalSchema,
            fieldMappings: finalFieldMappings,
            detailItemSelector: formData.detailItemSelector || undefined,
            detailTargetSchema: Object.keys(finalDetailSchema).length > 0 ? finalDetailSchema : undefined,
            detailFieldMappings: finalDetailFieldMappings.length > 0 ? finalDetailFieldMappings : undefined,
            keywordsToFilterBy: formData.keywordsToFilterBy?.map(s => s.trim()).filter(Boolean) || [],
            cronSchedule: formData.cronSchedule?.trim() || '',
            cronEnabled: formData.cronEnabled ?? false,
            enableScreenshots: formData.enableScreenshots ?? false,
            screenshotOptions: formData.screenshotOptions ? {
                fullPage: formData.screenshotOptions?.fullPage ?? true
            } : undefined
        };

        let savedConfig: ScraperConfiguration | null = null;
        try {
            if (initialData?._id) {
                savedConfig = await updateConfiguration(initialData._id, dataToSave);
            } else {
                savedConfig = await createConfiguration(dataToSave);
            }

            if (savedConfig) {
                onSaveSuccess(savedConfig);
            }
        } catch (err) {
             console.error("Save failed:", err);
             alert(`Failed to save configuration: ${getApiErrorMessage(err)}`);
        }
    };

    const isListPage = formData.pageType === 'ListPage';
    const canScrapeDetails = isListPage;
    const showInlineDetailOptions = isListPage && !!formData.scrapeDetailsFromList;

    return (
        <form onSubmit={handleSubmit} className="configuration-form" style={{ border: '1px solid #ccc', padding: '15px', margin: '15px 0' }}>
            <h2>{initialData ? 'Edit' : 'Create'} Scraper Configuration</h2>

            {/* --- Basic Info: Name, URLs, Page Type --- */}
            {/* ... (Name, Start URLs, Page Type inputs - unchanged) ... */}
             <div style={{ marginBottom: '10px' }}>
                <label htmlFor="name" style={{ display: 'block', marginBottom: '3px' }}>Name:</label>
                <input style={{ width: '95%'}} type="text" id="name" name="name" value={formData.name || ''} onChange={handleInputChange} required />
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '3px' }}>Start URL(s):</label>
                {(formData.startUrls || []).map((url, index) => (
                    <div key={`startUrl-${index}`} style={{ display: 'flex', marginBottom: '5px', alignItems: 'center' }}>
                        <input type="url" value={url} onChange={(e) => handleListInputChange('startUrls', index, e.target.value)} placeholder="https://example.com" required={index === 0 && (formData.startUrls || []).length === 1} style={{ flexGrow: 1, marginRight: '5px' }} />
                        {(formData.startUrls || []).length > 1 && (<button type="button" onClick={() => removeListItem('startUrls', index)} title="Remove URL">X</button>)}
                    </div>
                ))}
                <button type="button" onClick={() => addListItem('startUrls')}>Add Start URL</button>
            </div>
             <div style={{ marginBottom: '10px' }}>
                <label htmlFor="pageType" style={{ display: 'block', marginBottom: '3px' }}>Page Type:</label>
                <select id="pageType" name="pageType" value={formData.pageType || 'DetailPage'} onChange={handleInputChange}>
                    <option value="DetailPage">Detail Page (Each Start URL has the item)</option>
                    <option value="ListPage">List Page (Start URL has list of items/links)</option>
                </select>
            </div>



            {/* --- Selectors --- */}
             <div style={{ marginBottom: '10px' }}>
                <label htmlFor="itemSelector" style={{ display: 'block', marginBottom: '3px' }}>Item Selector:</label>
                <input style={{ width: '95%'}} type="text" id="itemSelector" name="itemSelector" value={formData.itemSelector || ''} onChange={handleInputChange} required placeholder={isListPage ? "Selector for each item block on list" : "Selector for main content block"}/>
                 <small style={{ display: 'block' }}>
                     {isListPage
                        ? 'Selector finding each article/item block on the list page. Also used on the detail page (if scraping inline) to find the main content area.'
                        : 'Selector finding the main content area on the detail page.'}
                 </small>
            </div>
            {/* --- Scrape Details Option --- */}
            {isListPage && (
                 <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="scrapeDetailsFromList" style={{ marginRight: '10px' }}>
                        Scrape Detail Pages Found on List?
                    </label>
                    <input
                        type="checkbox"
                        id="scrapeDetailsFromList"
                        name="scrapeDetailsFromList"
                        checked={!!formData.scrapeDetailsFromList}
                        onChange={(e) => setFormData(prev => ({ ...prev, scrapeDetailsFromList: e.target.checked }))}
                        disabled={!canScrapeDetails}
                    />
                    <small style={{ display: 'block' }}>
                        Requires 'List Page' type and 'Detail Link Selector'. If checked, the scraper will visit each detail link found and merge scraped data. You can define separate mappings below for the detail page content.
                    </small>
                </div>
            )}

            {/* --- Options (Exclude Selectors, Keywords) --- */}
            {/* ... (Exclude Selectors, Keywords inputs - unchanged) ... */}
             <div style={{ marginBottom: '10px' }}>
                 <label style={{ display: 'block', marginBottom: '3px' }}>Exclude Selectors:</label>
                  {(formData.scrapeOptions?.excludeSelectors || []).map((selector, index) => ( <div key={`exclude-${index}`} style={{ display: 'flex', marginBottom: '5px', alignItems: 'center' }}> <input type="text" value={selector} onChange={(e) => handleListInputChange('excludeSelectors', index, e.target.value)} placeholder="e.g., footer, .ads" style={{ flexGrow: 1, marginRight: '5px' }} /> <button type="button" onClick={() => removeListItem('excludeSelectors', index)} title="Remove Selector">X</button> </div> ))}
                 <button type="button" onClick={() => addListItem('excludeSelectors')}>Add Exclude Selector</button>
            </div>
             <div style={{ marginBottom: '10px' }}>
                 <label style={{ display: 'block', marginBottom: '3px' }}>Keywords to Filter By:</label>
                  {(formData.keywordsToFilterBy || []).map((keyword, index) => ( <div key={`keyword-${index}`} style={{ display: 'flex', marginBottom: '5px', alignItems: 'center' }}> <input type="text" value={keyword} onChange={(e) => handleListInputChange('keywordsToFilterBy', index, e.target.value)} placeholder="e.g., Niš" style={{ flexGrow: 1, marginRight: '5px' }} /> <button type="button" onClick={() => removeListItem('keywordsToFilterBy', index)} title="Remove Keyword">X</button> </div> ))}
                 <button type="button" onClick={() => addListItem('keywordsToFilterBy')}>Add Keyword Filter</button>
                 <small style={{ display: 'block' }}>If keywords are added, scraped items will only be saved if they contain at least one of these keywords (checks both list and detail data if applicable).</small>
             </div>


            {/* --- Target Schema --- */}
            {/* ... (Target Schema textarea - unchanged) ... */}
             <div style={{ marginBottom: '10px' }}>
                <label htmlFor="targetSchema" style={{ display: 'block', marginBottom: '3px' }}>Target JSON Schema:</label>
                 <textarea id="targetSchema" name="targetSchema" value={schemaString} onChange={handleSchemaChange} rows={10} placeholder='Define your desired JSON output structure here...' style={{ width: '95%', fontFamily: 'monospace' }}/>
                 {schemaError && <small style={{ color: 'red', display: 'block' }}>{schemaError}</small>}
                 <small style={{ display: 'block' }}>Define the structure (fields, types) for each scraped item. Must be valid JSON.</small>
            </div>


             {/* --- Primary Field Mappings --- */}
             <div style={{ marginBottom: '20px', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
                <h3 style={{ marginBottom: '5px' }}>Primary Field Mappings</h3>
                 <small style={{ display: 'block', marginBottom: '10px' }}>
                     {isListPage
                        ? "Mappings applied to each item found by 'Item Selector' on the LIST page."
                        : "Mappings applied to the content fond by 'Item Selector' on the DETAIL page."}
                     {isListPage && !formData.scrapeDetailsFromList && " (Also used for detail pages scraped in the separate pass)."}
                     <br/>Map schema fields to CSS selectors. Use dot.notation for nested fields (e.g., author.name).
                 </small>
                {(formData.fieldMappings || []).map((mapping, index) => (
                     <FieldMappingInput
                         key={`mapping-${index}`}
                         index={index}
                         mapping={mapping}
                         onChange={handleMappingChange}
                         onRemove={removeMapping}
                    />
                ))}
                <button type="button" onClick={addMapping}>Add Primary Field Mapping</button>
            </div>
            

            {/* ---Inline Detail Scraping Options (Conditional) --- */}
            {showInlineDetailOptions && (
                <div style={{ border: '2px solid #007bff', padding: '15px', marginTop: '15px', marginBottom: '15px', backgroundColor: '#f0f8ff' }}>
                    <h4>Inline Detail Page Scraping Options</h4>

                    {/* Detail Item Selector */}
                    <div style={{ marginBottom: '10px' }}>
                        <label htmlFor="detailItemSelector">Detail Page Item Selector (Optional):</label>
                        <input style={{ width: '95%'}} type="text" id="detailItemSelector" name="detailItemSelector" value={formData.detailItemSelector || ''} onChange={handleInputChange} placeholder="e.g., article.main-content" />
                        <small style={{ display: 'block' }}>
                            Selector for the main content block on the linked DETAIL page. If blank, the primary 'Item Selector' above will be used.
                        </small>
                    </div>

                    {/* Detail Target Schema */}
                    <div style={{ marginBottom: '10px' }}>
                        <label htmlFor="detailTargetSchema">Detail Target Schema (Optional):</label>
                        <textarea id="detailTargetSchema" name="detailTargetSchema" value={detailSchemaString} onChange={handleDetailSchemaChange} rows={5} style={{ width: '95%', fontFamily: 'monospace' }}/>
                        {detailSchemaError && <small style={{ color: 'red', display: 'block' }}>{detailSchemaError}</small>}
                        <small style={{ display: 'block' }}>
                            Optional JSON structure specifically for data extracted from the DETAIL page during inline scraping.
                        </small>
                    </div>

                    {/* Detail Field Mappings */}
                     <div style={{ marginBottom: '10px', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
                        <h3 style={{ marginBottom: '5px' }}>Detail Page Field Mappings (Optional)</h3>
                         <small style={{ display: 'block', marginBottom: '10px' }}>
                             Selectors relative to 'Detail Page Item Selector' (or primary 'Item Selector' if detail one is blank). Defines how to populate the 'Detail Target Schema'. If blank, Primary Mappings will be used instead.
                         </small>
                        {(formData.detailFieldMappings || []).map((mapping, index) => ( <FieldMappingInput key={`detail-mapping-${index}`} index={index} mapping={mapping} onChange={handleDetailMappingChange} onRemove={removeDetailMapping} /> ))}
                        <button type="button" onClick={addDetailMapping}>Add Detail Field Mapping</button>
                    </div>
                </div>
            )}

                        {/* --- Screenshot Options --- */}
                        <div style={{ borderTop: '1px dashed #ccc', marginTop: '20px', paddingTop: '15px' }}>
                <h3>Screenshots (Optional)</h3>
                <div style={{ marginBottom: '10px' }}>
                    <label htmlFor="enableScreenshots" style={{ marginRight: '10px' }}>
                        Enable Screenshots?
                    </label>
                    <input
                        type="checkbox"
                        id="enableScreenshots"
                        name="enableScreenshots"
                        checked={!!formData.enableScreenshots}
                        onChange={handleCheckboxChange} // Use generic handler
                    />
                    <small style={{ display: 'block' }}>Saves PNG screenshots to the server filesystem.</small>
                </div>
                {formData.enableScreenshots && (
                    <div style={{ marginLeft: '20px', borderLeft: '2px solid #007bff', paddingLeft: '15px' }}>
                        <div style={{ marginBottom: '10px' }}>
                            <label htmlFor="screenshotFullPage" style={{ marginRight: '10px' }}>
                                Full Page Screenshot?
                            </label>
                            <input
                                type="checkbox"
                                id="screenshotFullPage"
                                name="fullPage" // Key within screenshotOptions
                                checked={formData.screenshotOptions?.fullPage ?? true} // Default checked if options exist
                                onChange={handleScreenshotOptionChange} // Use specific handler
                            />
                        </div>
                        {/* Add inputs for type/quality/pathTemplate here if implemented */}
                    </div>
                )}
            </div>

                <div style={{ borderTop: '1px dashed #ccc', marginTop: '20px', paddingTop: '15px' }}>
                    <h3>Scheduling (Cron)</h3>
                    <div style={{ marginBottom: '10px' }}>
                        <label htmlFor="cronEnabled" style={{ marginRight: '10px' }}>
                            Enable Automatic Scheduling?
                        </label>
                        <input
                            type="checkbox"
                            id="cronEnabled"
                            name="cronEnabled"
                            checked={!!formData.cronEnabled}
                            onChange={handleCheckboxChange} // Use specific handler for checkboxes
                        />
                    </div>

                    {formData.cronEnabled && (
                         <div style={{ marginBottom: '10px' }}>
                            <label htmlFor="cronSchedule" style={{ display: 'block', marginBottom: '3px' }}>
                                Cron Schedule:
                            </label>
                            <input
                                style={{ width: '95%', fontFamily: 'monospace' }}
                                type="text"
                                id="cronSchedule"
                                name="cronSchedule"
                                value={formData.cronSchedule || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., 0 9 * * 1 (Every Monday at 9:00 AM)"
                                required={formData.cronEnabled} // Required only if enabled
                            />
                            <small style={{ display: 'block' }}>
                                Use standard cron syntax (minute hour day-of-month month day-of-week).
                                Server timezone applies. See <a href="https://crontab.guru/" target="_blank" rel="noopener noreferrer">crontab.guru</a> for help.
                            </small>
                        </div>
                    )}
                 </div>


            {/* --- Actions --- */}
            <div
                className="form-actions-sticky"
                style={{
                    position: 'sticky',
                    bottom: 0,
                    left: 0, 
                    right: 0, 
                    backgroundColor: '#ffffff', 
                    padding: '15px',
                    borderTop: '1px solid #dee2e6',
                    boxShadow: '0 -2px 5px rgba(0,0,0,0.05)', 
                    zIndex: 10,
                    display: 'flex',
                    justifyContent: 'flex-end',
                }}
            >
                <button type="submit" disabled={isLoading || !!schemaError || !!detailSchemaError} style={{ padding: '10px 20px' }}>
                    {isLoading ? 'Saving...' : 'Save Configuration'}
                </button>
                <button type="button" onClick={onCancel} disabled={isLoading} style={{ marginLeft: '10px', padding: '10px 20px' }}>
                    Cancel
                </button>
            </div>
        </form>
    );
};

export default ConfigurationForm;