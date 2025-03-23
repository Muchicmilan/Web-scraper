import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { scrapeWebsite } from "./scraper-engine.js";
import { ScrapedData } from "./models/ScrapedData.js";
import { connectDB } from "./database.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
connectDB();
app.post("/api/scrape", async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }
    try {
        const scrapedData = await scrapeWebsite(url);
        if (!scrapedData) {
            return res.status(500).json({ error: "Failed to scrape website" });
        }
        const newScrapedData = new ScrapedData(scrapedData);
        console.log(newScrapedData);
        await newScrapedData.save();
        res.json({ success: true, data: newScrapedData });
    }
    catch (error) {
        console.error("Scraping Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
