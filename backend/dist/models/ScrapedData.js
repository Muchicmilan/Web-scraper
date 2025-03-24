import mongoose from "mongoose";
const scrapedDataSchema = new mongoose.Schema({
    url: { type: String, required: true },
    title: String,
    sections: [
        {
            heading: { type: String },
            content: { type: String, default: "" },
            linkTexts: { type: [String], default: [] },
            linkUrls: { type: [String], default: [] }
        },
    ],
});
export const ScrapedData = mongoose.model("ScrapedData", scrapedDataSchema);
