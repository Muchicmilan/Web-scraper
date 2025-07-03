import React, { useState, useEffect, useCallback } from 'react';
import {
    ScraperConfiguration,
    ScraperConfigurationData,
    FieldMapping,
    PageLoadWaitOptions,
    InteractionOptions,
    ListFieldKey,
    LoginConfig
} from "../Types";
import { useScraperManager } from '../hooks/useScraperManager';
import { getApiErrorMessage } from '../api/ScraperApi';

import LoginConfigSection from "../components/ConfigurationFormSections/LoginConfigSection";
import BasicInfoSection from "../components/ConfigurationFormSections/BasicInfoSection";
import ClosePopupSection from "../components/ConfigurationFormSections/ClosePopupSection";
import FieldMappingSection from "../components/ConfigurationFormSections/FieldMappingSection";
import InteractionOptionSection from "../components/ConfigurationFormSections/InteractionOptionSection";
import PageLoadWaitSection from "../components/ConfigurationFormSections/PageLoadWaitSection";
import SchedulingSection from "../components/ConfigurationFormSections/SchedulingSection";
import SchemaDefinitionSection from "../components/ConfigurationFormSections/SchemaDefinitionSection";
import ScrapeBehaviourOptionsSection from "../components/ConfigurationFormSections/ScraperBehaviourOptions";
import ScreenshotOptionsSection from "../components/ConfigurationFormSections/ScreenshotOptionsSection";
import SelectorOptionsSection from "../components/ConfigurationFormSections/SelectorOptionsSection";

import "styles.css"

const defaultPageLoadWaitOptions: PageLoadWaitOptions = {
    waitStrategy: 'none', waitForTimeout: undefined, waitForSelector: '', waitForTimeoutOnSelector: 30000,
};
const defaultInteractionOptions: InteractionOptions = {
    interactionStrategy: 'none', maxScrolls: 20, scrollDelayMs: 500, scrollStagnationTimeoutMs: 3000,
    loadMoreButtonSelector: undefined, maxClicks: 5, clickDelayMs: 1500, buttonScrollAttempts: 3,
    buttonScrollDelayMs: 400, maxItemsToScrape: undefined,
};
const defaultLoginConfig: LoginConfig = {
    requiresLogin: false, accountId: undefined, loginUrl: '',
    usernameSelector: '', passwordSelector: '', submitButtonSelector: '', postLoginSelector: ''
};
const defaultScreenshotOptions = { fullPage: true };

interface Props {
    initialData: ScraperConfiguration | null;
    onSaveSuccess: (savedConfig: ScraperConfiguration) => void;
    onCancel: () => void;
}


const ConfigurationForm: React.FC<Props> = ({ initialData, onSaveSuccess, onCancel }) => {
    const { createConfiguration, updateConfiguration, isLoading, accounts, fetchAccounts } = useScraperManager();

    // --- STATE ---
    const [formData, setFormData] = useState<Partial<ScraperConfigurationData>>({});
    const [schemaString, setSchemaString] = useState<string>('{}');
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const [detailSchemaString, setDetailSchemaString] = useState<string>('{}');
    const [detailSchemaError, setDetailSchemaError] = useState<string | null>(null);

    // --- EFFECTS ---

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    useEffect(() => {
        // Initialize formData (same logic as before)
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
                screenshotOptions: { ...defaultScreenshotOptions, ...(editData.screenshotOptions ?? {}) },
                pageLoadWaitOptions: { ...defaultPageLoadWaitOptions, ...(editData.pageLoadWaitOptions ?? {}) },
                closePopupSelectors: editData.closePopupSelectors || [],
                interactionOptions: { ...defaultInteractionOptions, ...(editData.interactionOptions ?? {}) },
                loginConfig: { ...defaultLoginConfig, ...(editData.loginConfig ?? {}) },
            });
            setSchemaString(JSON.stringify(editData.targetSchema || {}, null, 2));
            setDetailSchemaString(JSON.stringify(editData.detailTargetSchema || {}, null, 2));
            setSchemaError(null);
            setDetailSchemaError(null);
        } else {
            setFormData({
                name: '', startUrls: [''], pageType: 'DetailPage', itemSelector: '',
                scrapeDetailsFromList: false, fieldMappings: [], detailItemSelector: '',
                detailTargetSchema: {}, detailFieldMappings: [], scrapeOptions: { excludeSelectors: [] },
                keywordsToFilterBy: [], targetSchema: {}, cronSchedule: '', cronEnabled: false,
                enableScreenshots: false, screenshotOptions: defaultScreenshotOptions,
                pageLoadWaitOptions: defaultPageLoadWaitOptions, closePopupSelectors: [],
                interactionOptions: defaultInteractionOptions,
                loginConfig: defaultLoginConfig,
            });
            setSchemaString('{}'); setDetailSchemaString('{}');
            setSchemaError(null); setDetailSchemaError(null);
        }
    }, [initialData]);

    const handleLoginConfigChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let processedValue: any = value;
        if (type === 'checkbox') {
            processedValue = (e.target as HTMLInputElement).checked;
        }
        setFormData(prev => ({
            ...prev,
            loginConfig: { ...(prev.loginConfig ?? defaultLoginConfig), [name]: processedValue }
        }));
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let processedValue: any = value;
        if (type === 'number') {
            const num = parseInt(value, 10);
            processedValue = (value === '' || isNaN(num)) ? undefined : num;
        }
        setFormData(prev => ({ ...prev, [name]: processedValue }));
    }, []);
    const handleSchemaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newSchemaString = e.target.value;
        setSchemaString(newSchemaString);
        try { JSON.parse(newSchemaString); setSchemaError(null); }
        catch (error) { setSchemaError("Invalid JSON format."); }
    }, []);
    const handleDetailSchemaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newSchemaString = e.target.value;
        setDetailSchemaString(newSchemaString);
        try { JSON.parse(newSchemaString); setDetailSchemaError(null); }
        catch (error) { setDetailSchemaError("Invalid JSON format for Detail Schema."); }
    }, []);
    const handleListInputChange = useCallback((fieldName: ListFieldKey, index: number, value: string) => {
        setFormData(prev => {
            let currentList: string[];
            if (fieldName === 'excludeSelectors') { currentList = [...(prev.scrapeOptions?.excludeSelectors || [])]; }
            else if (fieldName === 'closePopupSelectors'){ currentList = [...(prev.closePopupSelectors || [])]; }
            else { currentList = [...(prev[fieldName as keyof typeof prev] as string[] || [])]; } // Type assertion needed

            currentList[index] = value;

            if (fieldName === 'excludeSelectors') { return { ...prev, scrapeOptions: { ...prev.scrapeOptions, excludeSelectors: currentList } }; }
            else { return { ...prev, [fieldName]: currentList }; }
        });
    }, []);
    const addListItem = useCallback((fieldName: ListFieldKey) => {
        setFormData(prev => {
            let currentList: string[];
            if (fieldName === 'excludeSelectors') { currentList = [...(prev.scrapeOptions?.excludeSelectors || [])]; }
            else if(fieldName === 'closePopupSelectors'){ currentList = [...(prev.closePopupSelectors || [])]; }
            else { currentList = [...(prev[fieldName as keyof typeof prev] as string[] || [])]; } // Type assertion needed
            const newList = [...currentList, ''];

            if (fieldName === 'excludeSelectors') { return { ...prev, scrapeOptions: { ...prev.scrapeOptions, excludeSelectors: newList } }; }
            else { return { ...prev, [fieldName]: newList }; }
        });
    }, []);
    const removeListItem = useCallback((fieldName: ListFieldKey, index: number) => {
        setFormData(prev => {
            let currentList: string[];
            if (fieldName === 'excludeSelectors') { currentList = [...(prev.scrapeOptions?.excludeSelectors || [])]; }
            else if(fieldName === 'closePopupSelectors'){ currentList = [...(prev.closePopupSelectors || [])]; }
            else { currentList = [...(prev[fieldName as keyof typeof prev] as string[] || [])]; } // Type assertion needed

            if (fieldName === 'startUrls' && currentList.length <= 1) { return prev; }

            const newList = currentList.filter((_, i) => i !== index);

            if (fieldName === 'excludeSelectors') { return { ...prev, scrapeOptions: { ...prev.scrapeOptions, excludeSelectors: newList } }; }
            else { return { ...prev, [fieldName]: newList }; }
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
        setFormData(prev => ({ ...prev, fieldMappings: (prev.fieldMappings || []).filter((_, i) => i !== index) }));
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
        setFormData(prev => ({ ...prev, detailFieldMappings: (prev.detailFieldMappings || []).filter((_, i) => i !== index) }));
    }, []);
    const handleCheckboxChange = useCallback((e : React.ChangeEvent<HTMLInputElement>)=>{
        const {name, checked} = e.target;
        setFormData(prev => ({...prev,[name]: checked}));
    }, []);
    const handleScreenshotOptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let processedValue: any = value;
        if (type === 'checkbox') { processedValue = (e.target as HTMLInputElement).checked; }
        // Add handling for select/number if screenshot options expand
        setFormData(prev => ({ ...prev, screenshotOptions: { ...(prev.screenshotOptions ?? defaultScreenshotOptions), [name]: processedValue } }));
    }, []);
    const handlePageLoadWaitOptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let processedValue: any = value;
        if (type === 'number') { const num = parseInt(value, 10); processedValue = isNaN(num) ? undefined : num; }
        setFormData(prev => ({ ...prev, pageLoadWaitOptions: { ...(prev.pageLoadWaitOptions ?? defaultPageLoadWaitOptions), [name]: processedValue } }));
    }, []);
    const handleInteractionOptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let processedValue: any = value;
        if (type === 'number') { const num = parseInt(value, 10); processedValue = (value === '' || isNaN(num)) ? undefined : num; }
        if (name === 'interactionStrategy') { processedValue = value as InteractionOptions['interactionStrategy']; }
        setFormData(prev => ({ ...prev, interactionOptions: { ...(prev.interactionOptions ?? defaultInteractionOptions), [name]: processedValue } }));
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSchemaError(null); setDetailSchemaError(null);

        // --- ALL VALIDATION LOGIC ---
        // Basic required fields
        const finalStartUrls = formData.startUrls?.map(s => s.trim()).filter(Boolean) || [];
        if (!formData.name || finalStartUrls.length === 0 || !formData.itemSelector || !formData.fieldMappings || formData.fieldMappings.length === 0) {
            alert("Please fill in Name, at least one Start URL, Item Selector, and at least one Primary Field Mapping."); return;
        }
        // Schema JSON validation
        let finalSchema = {}; let finalDetailSchema = {};
        try { finalSchema = JSON.parse(schemaString); } catch { setSchemaError("Invalid JSON."); alert("Target Schema contains invalid JSON."); return; }
        if (typeof finalSchema !== 'object' || finalSchema === null || Array.isArray(finalSchema)) { setSchemaError("Must be a JSON object."); alert("Target Schema must be a JSON object."); return; }
        if (showInlineDetailOptions) {
            try { if (detailSchemaString.trim() !== '{}' && detailSchemaString.trim() !== '') finalDetailSchema = JSON.parse(detailSchemaString); }
            catch { setDetailSchemaError("Invalid JSON."); alert("Detail Target Schema contains invalid JSON."); return; }
            if (Object.keys(finalDetailSchema).length > 0 && (typeof finalDetailSchema !== 'object' || finalDetailSchema === null || Array.isArray(finalDetailSchema))) {
                setDetailSchemaError("Must be a JSON object if provided."); alert("Detail Target Schema must be a JSON object if provided."); return;
            }
        }
        // Cron validation
        if (formData.cronEnabled && !formData.cronSchedule?.trim()){ alert("Please provide a valid Cron Schedule when scheduling is enabled."); return; }
        if (formData.cronEnabled && formData.cronSchedule && formData.cronSchedule.split(' ').length < 5){ alert("Cron Schedule format seems incorrect."); return; }
        // Page Load Wait validation
        const waitOpts = formData.pageLoadWaitOptions;
        if (waitOpts) {
            if (waitOpts.waitStrategy === 'selector' && !waitOpts.waitForSelector?.trim()) { alert("Please provide a 'Wait For Selector' for page load."); return; }
            if (waitOpts.waitStrategy === 'timeout' && (!waitOpts.waitForTimeout || waitOpts.waitForTimeout <= 0)) { alert("Please provide a positive 'Wait For Timeout (ms)' for page load."); return; }
            if (waitOpts.waitStrategy === 'selector' && waitOpts.waitForTimeoutOnSelector && waitOpts.waitForTimeoutOnSelector < 500) { alert("The 'Selector Wait Timeout' must be at least 500ms."); return; }
        }
        // Interaction Options validation
        const interactOpts = formData.interactionOptions;
        const strategy = interactOpts?.interactionStrategy ?? 'none';
        if (formData.pageType === 'ListPage' && strategy !== 'none') {
            if (interactOpts?.maxItemsToScrape !== undefined && interactOpts.maxItemsToScrape < 1) { alert("'Max Items To Scrape' must be at least 1 if set."); return; }
            if (strategy === 'infiniteScroll') { /* ... infinite scroll validation ... */ }
            if (strategy === 'loadMoreButton') { /* ... load more button validation ... */ }
            if (strategy === 'fixedScrolls') { /* ... fixed scrolls validation ... */ }
        }

        const loginOpts = formData.loginConfig;
        if (loginOpts?.requiresLogin) {
            if (!loginOpts.accountId || !loginOpts.loginUrl || !loginOpts.usernameSelector || !loginOpts.passwordSelector || !loginOpts.submitButtonSelector || !loginOpts.postLoginSelector) {
                alert("All fields in the Login Configuration section are required when login is enabled.");
                return;
            }
        }
        // --- END VALIDATION ---


        // --- DATA PREPARATION ---
        const finalFieldMappings = formData.fieldMappings?.filter(m => m.fieldName && m.selector) || [];
        const finalDetailFieldMappings = formData.detailFieldMappings?.filter(m => m.fieldName && m.selector) || [];
        const finalClosePopupSelectors = formData.closePopupSelectors?.map(s => s.trim()).filter(Boolean) || [];

        const dataToSave: ScraperConfigurationData = {
            name: formData.name!,
            startUrls: finalStartUrls,
            pageType: formData.pageType || 'DetailPage',
            itemSelector: formData.itemSelector!,
            scrapeDetailsFromList: formData.scrapeDetailsFromList ?? false,
            scrapeOptions: { excludeSelectors: formData.scrapeOptions?.excludeSelectors?.map(s => s.trim()).filter(Boolean) || [] },
            targetSchema: finalSchema,
            fieldMappings: finalFieldMappings,
            detailItemSelector: formData.detailItemSelector?.trim() || undefined,
            detailTargetSchema: Object.keys(finalDetailSchema).length > 0 ? finalDetailSchema : undefined,
            detailFieldMappings: finalDetailFieldMappings.length > 0 ? finalDetailFieldMappings : undefined,
            keywordsToFilterBy: formData.keywordsToFilterBy?.map(s => s.trim()).filter(Boolean) || [],
            cronSchedule: formData.cronSchedule?.trim() || undefined,
            cronEnabled: formData.cronEnabled ?? false,
            enableScreenshots: formData.enableScreenshots ?? false,
            screenshotOptions: formData.enableScreenshots ? {
                fullPage: formData.screenshotOptions?.fullPage ?? true,
                // Add type/quality/path if implemented
            } : undefined,
            pageLoadWaitOptions: (waitOpts && waitOpts.waitStrategy !== 'none') ? {
                waitStrategy: waitOpts.waitStrategy,
                waitForSelector: waitOpts.waitStrategy === 'selector' ? waitOpts.waitForSelector?.trim() : undefined,
                waitForTimeout: waitOpts.waitStrategy === 'timeout' ? waitOpts.waitForTimeout : undefined,
                waitForTimeoutOnSelector: waitOpts.waitStrategy === 'selector' ? (waitOpts.waitForTimeoutOnSelector ?? defaultPageLoadWaitOptions.waitForTimeoutOnSelector) : undefined,
            } : undefined,
            closePopupSelectors: finalClosePopupSelectors.length > 0 ? finalClosePopupSelectors : undefined,
            interactionOptions: (formData.pageType === 'ListPage' && interactOpts && strategy !== 'none') ? {
                interactionStrategy: strategy,
                maxItemsToScrape: interactOpts.maxItemsToScrape,
                maxScrolls: (strategy === 'infiniteScroll' || strategy === 'fixedScrolls') ? (interactOpts.maxScrolls ?? defaultInteractionOptions.maxScrolls) : undefined,
                scrollDelayMs: (strategy === 'infiniteScroll' || strategy === 'fixedScrolls') ? (interactOpts.scrollDelayMs ?? defaultInteractionOptions.scrollDelayMs) : undefined,
                scrollStagnationTimeoutMs: (strategy === 'infiniteScroll') ? (interactOpts.scrollStagnationTimeoutMs ?? defaultInteractionOptions.scrollStagnationTimeoutMs) : undefined,
                loadMoreButtonSelector: (strategy === 'loadMoreButton') ? interactOpts.loadMoreButtonSelector?.trim() || undefined : undefined,
                maxClicks: (strategy === 'loadMoreButton') ? (interactOpts.maxClicks ?? defaultInteractionOptions.maxClicks) : undefined,
                clickDelayMs: (strategy === 'loadMoreButton') ? (interactOpts.clickDelayMs ?? defaultInteractionOptions.clickDelayMs) : undefined,
                buttonScrollAttempts: (strategy === 'loadMoreButton') ? (interactOpts.buttonScrollAttempts ?? defaultInteractionOptions.buttonScrollAttempts) : undefined,
                buttonScrollDelayMs: (strategy === 'loadMoreButton') ? (interactOpts.buttonScrollDelayMs ?? defaultInteractionOptions.buttonScrollDelayMs) : undefined,
            } : undefined,
            loginConfig: loginOpts?.requiresLogin ? {
                requiresLogin: true,
                accountId: loginOpts.accountId,
                loginUrl: loginOpts.loginUrl,
                usernameSelector: loginOpts.usernameSelector,
                passwordSelector: loginOpts.passwordSelector,
                submitButtonSelector: loginOpts.submitButtonSelector,
                postLoginSelector: loginOpts.postLoginSelector,
            } : { requiresLogin: false }
        };
        // --- END DATA PREPARATION ---


        // --- API CALL ---
        let savedConfig: ScraperConfiguration | null = null;
        try {
            if (initialData?._id) {
                savedConfig = await updateConfiguration(initialData._id, dataToSave);
            } else {
                savedConfig = await createConfiguration(dataToSave);
            }
            if (savedConfig) { onSaveSuccess(savedConfig); }
        } catch (err) {
            console.error("Save failed:", err);
            alert(`Failed to save configuration: ${getApiErrorMessage(err)}`);
        }
        // --- END API CALL ---
    };

    const isListPage = formData.pageType === 'ListPage';
    const showInlineDetailOptions = isListPage && !!formData.scrapeDetailsFromList;

    return (
        <form onSubmit={handleSubmit} className="configuration-form configuration-form-refactored">
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
                {initialData ? 'Edit' : 'Create'} Scraper Configuration
            </h2>

            {/* Render Section Components */}
            <BasicInfoSection
                formData={formData}
                onInputChange={handleInputChange}
                onListInputChange={handleListInputChange}
                onAddListItem={addListItem}
                onRemoveListItem={removeListItem}
            />

            <SelectorOptionsSection
                formData={formData}
                onInputChange={handleInputChange}
                isListPage={isListPage}
                showInlineDetailOptions={showInlineDetailOptions}
            />

            <ScrapeBehaviourOptionsSection
                formData={formData}
                isListPage={isListPage}
                onCheckboxChange={handleCheckboxChange}
                onListInputChange={handleListInputChange}
                onAddListItem={addListItem}
                onRemoveListItem={removeListItem}
            />

            <SchemaDefinitionSection
                schemaString={schemaString}
                detailSchemaString={detailSchemaString}
                schemaError={schemaError}
                detailSchemaError={detailSchemaError}
                onSchemaChange={handleSchemaChange}
                onDetailSchemaChange={handleDetailSchemaChange}
                showDetailSchema={showInlineDetailOptions}
            />

            <FieldMappingSection
                label="Primary Field Mappings"
                helpText={isListPage ? "Mappings applied to each item found by 'Item Selector' on the LIST page." : "Mappings applied to the content found by 'Item Selector' on the DETAIL page."}
                mappings={formData.fieldMappings || []}
                onMappingChange={handleMappingChange}
                onAddMapping={addMapping}
                onRemoveMapping={removeMapping}
            />

            {showInlineDetailOptions && (
                <FieldMappingSection
                    label="Detail Page Field Mappings (Optional)"
                    helpText="Mappings applied to the DETAIL page content (relative to Detail Item Selector or Item Selector). Merged with list data."
                    mappings={formData.detailFieldMappings || []}
                    onMappingChange={handleDetailMappingChange}
                    onAddMapping={addDetailMapping}
                    onRemoveMapping={removeDetailMapping}
                    isDetailSection={true}
                />
            )}

            <PageLoadWaitSection
                options={formData.pageLoadWaitOptions}
                onChange={handlePageLoadWaitOptionChange}
            />

            <ClosePopupSection
                selectors={formData.closePopupSelectors || []}
                onListInputChange={handleListInputChange}
                onAddListItem={addListItem}
                onRemoveListItem={removeListItem}
            />

            <InteractionOptionSection
                options={formData.interactionOptions}
                isListPage={isListPage}
                onChange={handleInteractionOptionChange}
            />

            <ScreenshotOptionsSection
                options={formData.screenshotOptions}
                enabled={formData.enableScreenshots ?? false}
                onCheckboxChange={handleCheckboxChange}
                onOptionChange={handleScreenshotOptionChange}
            />

            <SchedulingSection
                formData={formData}
                onInputChange={handleInputChange}
                onCheckboxChange={handleCheckboxChange}
            />

            <LoginConfigSection
                options={formData.loginConfig}
                accounts={accounts}
                onChange={handleLoginConfigChange}
                onCheckboxChange={(e) => handleLoginConfigChange(e)} // Can reuse the same handler
            />


            <div className="form-actions-sticky" style={{
                position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 10,
                backgroundColor: '#ffffff', padding: '15px', display: 'flex',
                justifyContent: 'flex-end', borderTop: '1px solid #dee2e6',
                boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
            }}>
                <button type="submit" disabled={isLoading || !!schemaError || !!detailSchemaError} style={{ padding: '10px 20px' }}>
                    {isLoading ? 'Saving...' : (initialData ? 'Update Configuration' : 'Create Configuration')}
                </button>
                <button type="button" onClick={onCancel} disabled={isLoading} style={{ marginLeft: '10px', padding: '10px 20px' }}>
                    Cancel
                </button>
            </div>
        </form>
    );
};

export default ConfigurationForm;