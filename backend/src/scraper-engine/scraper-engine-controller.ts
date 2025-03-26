import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { scrapeWebsite } from "./scraper-engine-service.js";
import { ScrapeOptions } from "./scraper-engine-types.js";
import { ScrapedDataModel } from "./scrape-engine-schema.js";
const scrapeEngineRouter = Router();

const handleScrapeRequest = async (req: Request, res: Response): Promise<void> => {
    const { url, options }: { url: string; options?: ScrapeOptions } = req.body;

    if (!url) {
        res.status(400).json({ error: "URL is required" });
        return;
    }

    try {
        const scrapedDataObject = await scrapeWebsite(url, options || {});

        if (!scrapedDataObject) {
            res.status(500).json({ error: "Failed to scrape website content. Structure might be unsupported, URL invalid, or no content met criteria." });
            return;
        }

        const dataForStoring = new ScrapedDataModel(scrapedDataObject);
        await dataForStoring.save(); 

        console.log(`[Controller] Data for ${url} saved.`);

        res.status(201).json({ success: true, data: dataForStoring });

    } catch (error: any) {
        console.error(`[Controller] Error processing scrape request for ${url}:`, error);

        if (error instanceof mongoose.Error.ValidationError) {
             res.status(400).json({ error: `Validation Error: ${error.message}` });
             return;
        }
        if (error.code === 11000) { 
            res.status(409).json({ error: "Conflict: This URL has already been scraped and stored." });
            return;
        }
        if (error.message?.includes('Failed to fetch URL')) {
             res.status(502).json({ error: `Bad Gateway: ${error.message}`});
             return;
        }
        res.status(500).json({ error: "Internal Server Error occurred while processing the scrape request." });
    }
};

scrapeEngineRouter.post("/scrape", handleScrapeRequest);

export default scrapeEngineRouter;