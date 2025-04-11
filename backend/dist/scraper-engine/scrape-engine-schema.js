import mongoose, { Schema } from 'mongoose';
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
    detailFieldMappings: { type: [FieldMappingSchema], required: false },
    keywordsToFilterBy: { type: [String], required: false }
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
