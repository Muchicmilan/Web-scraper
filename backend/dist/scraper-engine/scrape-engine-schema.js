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
