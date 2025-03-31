import mongoose from "mongoose";
import { ScrapedSection} from "./scraper-engine-types.js";


export interface IScrapedData extends mongoose.Document {
    url: string;
    title?: string;
    sections: ScrapedSection[]; 
    tags?: string;
    scrapedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const scrapedDataSchema = new mongoose.Schema<IScrapedData>({
    url: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: false },
    sections: [
        {
            heading: { type: String, default: null },
            content: { type: String, required: true },
            _id: false
        },
    ],
    tags: {type: [String], required: false, index: true},
    scrapedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const ScrapedDataModel = mongoose.model<IScrapedData>("ScrapedData", scrapedDataSchema);