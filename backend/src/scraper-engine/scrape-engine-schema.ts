import mongoose from "mongoose";
import { ScrapedSection, ScrapedLink } from "./scraper-engine-types.js";


export interface IScrapedData extends mongoose.Document {
    url: string;
    title?: string;
    sections: ScrapedSection[]; 
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
            links: [
                {
                    _id: false,
                    text: { type: String, required: false },
                    url: { type: String, required: true },
                },
            ],
        },
    ],
    scrapedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const ScrapedDataModel = mongoose.model<IScrapedData>("ScrapedData", scrapedDataSchema);