import mongoose, { Schema } from 'mongoose';
import { DEFAULT_POOL_OPTIONS } from './scraper-engine-constants.js';
import cron from "node-cron";
const EngineSettingsSchema = new Schema({
    singleton: { type: Boolean, default: true, unique: true, required: true },
    maxPoolSize: { type: Number, required: true, default: DEFAULT_POOL_OPTIONS.maxPoolSize, min: 1 },
    minPoolSize: { type: Number, required: true, default: DEFAULT_POOL_OPTIONS.minPoolSize, min: 0 },
    idleTimeoutMs: { type: Number, required: true, default: DEFAULT_POOL_OPTIONS.idleTimeoutMs, min: 10000 },
    retryLimit: { type: Number, required: true, default: DEFAULT_POOL_OPTIONS.retryLimit, min: 0 },
}, { timestamps: true });
const InteractionOptionsSchema = new Schema({
    interactionStrategy: { type: String, enum: ['none', 'infiniteScroll', 'loadMoreButton', 'fixedScrolls'], default: 'none', required: false },
    maxScrolls: { type: Number, min: 1, default: 20, required: false },
    scrollDelayMs: { type: Number, min: 200, default: 500, required: false },
    scrollStagnationTimeoutMs: { type: Number, min: 1000, default: 3000, required: false },
    loadMoreButtonSelector: { type: String, required: false },
    maxClicks: { type: Number, required: false, min: 0, default: 0 },
    clickDelayMs: { type: Number, required: false, min: 500, default: 1000 },
    maxItemsToScrape: { type: Number, required: false, min: 50 },
    buttonScrollAttempts: { type: Number, min: 1, default: 3, required: false },
    buttonScrollDelayMs: { type: Number, min: 100, default: 400, required: false },
}, { _id: false });
EngineSettingsSchema.pre('validate', function (next) {
    if (this.minPoolSize > this.maxPoolSize) {
        next(new Error('minPoolSize cannot be greater than maxPoolSize'));
    }
    else {
        next();
    }
});
const FieldMappingSchema = new Schema({
    fieldName: { type: String, required: true },
    selector: { type: String, required: true },
    extractFrom: { type: String, enum: ['text', 'attribute', 'html'], required: true, default: 'text' },
    attributeName: { type: String, required: function () { return this.extractFrom === 'attribute'; } }
}, { _id: false });
const PageLoadWaitOptionsSchema = new Schema({
    waitStrategy: { type: String, enum: ['none', 'timeout', 'selector'], default: 'none', required: false },
    waitForTimeout: { type: Number, required: false, min: 1 },
    waitForSelector: { type: String, required: false },
    waitForTimeoutOnSelector: { type: Number, required: false, min: 100, default: 1000 },
}, { _id: false });
const ScraperConfigurationSchema = new Schema({
    name: { type: String, required: true, unique: true, index: true },
    startUrls: { type: [String], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },
    pageType: { type: String, enum: ['ListPage', 'DetailPage'], required: true },
    itemSelector: { type: String, required: true },
    scrapeDetailsFromList: { type: Boolean, required: false, default: false },
    scrapeOptions: {
        excludeSelectors: { type: [String] }
    },
    targetSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    fieldMappings: { type: [FieldMappingSchema], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },
    detailItemSelector: { type: String, required: false },
    detailTargetSchema: { type: mongoose.Schema.Types.Mixed, required: false },
    enableScreenshots: { type: Boolean, required: false, default: false },
    screenshotOptions: {
        _id: false,
        fullPage: { type: Boolean, default: true, required: false },
        type: { type: String, enum: ['png', 'jpeg', 'webp'], default: 'png', required: false },
        quality: { type: Number, min: 1, max: 100, default: 100, required: false },
        pathTemplate: { type: String, required: false }
    },
    closePopupSelectors: { type: [String], required: false },
    pageLoadWaitOptions: { type: PageLoadWaitOptionsSchema, required: false },
    interactionOptions: { type: InteractionOptionsSchema, required: false },
    detailFieldMappings: { type: [FieldMappingSchema], required: false },
    keywordsToFilterBy: { type: [String], required: false },
    cronSchedule: { type: String, required: false, validate: {
            validator: function (v) {
                if (!v)
                    return true;
                return cron.validate(v);
            },
            message: props => `${props.value} is not valid cron schedule format.`
        }
    },
    cronEnabled: { type: Boolean, required: false, index: true }
}, { timestamps: true });
const ScrapedDataItemSchema = new Schema({
    configId: { type: Schema.Types.ObjectId, ref: 'ScraperConfiguration', required: true, index: true },
    url: { type: String, required: true, index: true },
    scrapedAt: { type: Date, default: Date.now },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });
ScrapedDataItemSchema.index({ configId: 1, url: 1 }, { unique: true });
export const ScraperConfigurationModel = mongoose.model('ScraperConfiguration', ScraperConfigurationSchema);
export const ScrapedDataItemModel = mongoose.model('ScrapedDataItem', ScrapedDataItemSchema);
export const EngineSettingsModel = mongoose.model('EngineSettings', EngineSettingsSchema);
