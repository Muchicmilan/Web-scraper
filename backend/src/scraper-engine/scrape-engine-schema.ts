import mongoose, { Schema, Document } from 'mongoose';

export interface IFieldMapping {
    fieldName: string;
    selector: string; 
    extractFrom: 'text' | 'attribute' | 'html'; 
    attributeName?: string;
}

export interface IScraperConfiguration extends Document {
    name: string;
    startUrls: string[];
    pageType: 'ListPage' | 'DetailPage';
    itemSelector: string;
    scrapeDetailsFromList?: boolean;
    scrapeOptions?: {
        excludeSelectors?: string[];
    };
    targetSchema: mongoose.Schema.Types.Mixed;
    fieldMappings: IFieldMapping[];
    detailItemSelector: string;
    detailFieldMappings?: IFieldMapping[];
    detailTargetSchema: mongoose.Schema.Types.Mixed;
    keywordsToFilterBy?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IScrapedDataItem extends Document {
    configId: mongoose.Types.ObjectId;
    url: string;
    scrapedAt: Date;
    data: mongoose.Schema.Types.Mixed;
    createdAt: Date;
    updatedAt: Date;
}

const FieldMappingSchema = new Schema<IFieldMapping>({
    fieldName: { type: String, required: true },
    selector: { type: String, required: true },
    extractFrom: { type: String, enum: ['text', 'attribute', 'html'], required: true, default: 'text' },
    attributeName: { type: String, required: function() { return (this as IFieldMapping).extractFrom === 'attribute'; } }
}, { _id: false });

const ScraperConfigurationSchema = new Schema<IScraperConfiguration>({
    name: { type: String, required: true, unique: true, index: true },
    startUrls: { type: [String], required: true, validate: (v: string[]) => Array.isArray(v) && v.length > 0 },
    pageType: { type: String, enum: ['ListPage', 'DetailPage'], required: true },
    itemSelector: { type: String, required: true },
    scrapeDetailsFromList: {type: Boolean, required: false, default: false},
    scrapeOptions: {
        excludeSelectors: { type: [String] }
    },
    targetSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    fieldMappings: { type: [FieldMappingSchema], required: true, validate: (v: IFieldMapping[]) => Array.isArray(v) && v.length > 0 },
    detailItemSelector: {type: String, required:false},
    detailTargetSchema: {type: mongoose.Schema.Types.Mixed, required:false},
    detailFieldMappings: {type: [FieldMappingSchema], required:false},
    keywordsToFilterBy: { type: [String], required: false }
}, { timestamps: true });

const ScrapedDataItemSchema = new Schema<IScrapedDataItem>({
    configId: { type: Schema.Types.ObjectId, ref: 'ScraperConfiguration', required: true, index: true },
    url: { type: String, required: true, index: true },
    scrapedAt: { type: Date, default: Date.now },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

ScrapedDataItemSchema.index({ configId: 1, url: 1 }, { unique: true });

export const ScraperConfigurationModel = mongoose.model<IScraperConfiguration>(
    'ScraperConfiguration',
    ScraperConfigurationSchema
);

export const ScrapedDataItemModel = mongoose.model<IScrapedDataItem>(
    'ScrapedDataItem',
    ScrapedDataItemSchema
)