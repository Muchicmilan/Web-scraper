import mongoose from "mongoose";
const scrapedDataSchema = new mongoose.Schema({
    url: { type: String, required: true },
    title: String,
    sections: [
        {
            heading: { type: String},
            content: { type: String},
            links: [{ text: String, url: String }],
        },
    ],
});
export const ScrapedData = mongoose.model("ScrapedData", scrapedDataSchema);
