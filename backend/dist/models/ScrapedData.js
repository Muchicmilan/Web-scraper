import mongoose from "mongoose";
const scrapedDataSchema = new mongoose.Schema({
    url: { type: String, required: true },
    title: String,
    sections: [
        {
            heading: { type: String, required: true },
            content: { type: String, required: true },
            links: [{ text: String, url: String }],
        },
    ],
});
export const ScrapedData = mongoose.model("ScrapedData", scrapedDataSchema);
