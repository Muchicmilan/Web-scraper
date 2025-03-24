import mongoose from "mongoose";
//TODO dodati images
const scrapedDataSchema = new mongoose.Schema({
    url: { type: String, required: true, unique: true },
    title: String,
    sections: [
        {
            heading: { type: String },
            content: { type: String, default: "" },
            links: [
                {
                    text: String,
                    url: String,
                },
            ],
        },
    ],
});
export const ScrapedData = mongoose.model("ScrapedData", scrapedDataSchema);
