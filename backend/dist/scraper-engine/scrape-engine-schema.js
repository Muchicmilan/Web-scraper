import mongoose from "mongoose";
const scrapedDataSchema = new mongoose.Schema({
    url: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: false },
    sections: [
        {
            heading: { type: String, default: null },
            content: { type: String, required: true },
            _id: false
        },
    ],
    tags: { type: [String], required: false, index: true },
    scrapedAt: { type: Date, default: Date.now },
}, { timestamps: true });
export const ScrapedDataModel = mongoose.model("ScrapedData", scrapedDataSchema);
