import { Request, Response } from "express";
import mongoose from "mongoose";

import {
    scrapeAndSave,
    scrapeEveryLinkFromWebsite,
    findOne,
    findAll,
    findOneByUrl
} from "./scraper-engine-service.js";
import { ScrapeOptions, CreateScrapeRequestBody } from "./scraper-engine-types.js";

export const handleGetScrapeById = async (req: Request, res: Response): Promise<void> => {
    console.log(`[Handler] Received GET /scrape/:id request for ID: ${req.params.id}`);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: "Invalid ID format provided." });
        return;
    }

    try {
        const scrapedData = await findOne(id);

        if (!scrapedData) {
            console.log(`[Handler] Data not found for ID: ${id}`);
            res.status(404).json({ error: `Scraped data with ID ${id} not found.` });
        } else {
            console.log(`[Handler] Successfully retrieved data for ID: ${id}`);
            res.status(200).json({ success: true, data: scrapedData });
        }
    } catch (error: any) {
        console.error(`[Handler] Error processing GET /scrape/:id for ID ${id}:`, error);
        res.status(500).json({ error: "Internal Server Error occurred while retrieving data." });
    }
};



export const handleGetAllScrapes = async (req: Request, res: Response): Promise<void> => {
    try {
        const allData = await findAll();

        console.log(`[Handler] Successfully retrieved all data (${allData.length} items).`);
        res.status(200).json({ success: true, count: allData.length, data: allData });

    } catch (error: any) {
        console.error('[Handler] Error processing GET /scrape/all:', error);
        res.status(500).json({ error: "Internal Server Error occurred while retrieving data." });
    }
};

export const handleCreateScrape = async (req: Request, res: Response): Promise<void> => {
    console.log('[Handler] Received POST /scrape request');
    const { url, options }: CreateScrapeRequestBody = req.body;

    if (!url || typeof url !== 'string' || url.trim() === '') {
        console.log('[Handler] Validation failed: Missing URL.');
        res.status(400).json({ error: "URL is required" });
        return;
    }
    try { new URL(url); } catch (_) {
        console.log(`[Handler] Validation failed: Invalid URL format: ${url}`);
        res.status(400).json({ error: "Invalid URL format provided." });
        return;
    }

    const shouldScrapeLinks = options?.scrapeLinkedPages === true;
    const keywordsToFilterBy = options?.tags?.map( t=> String(t).trim()).filter(Boolean) ?? undefined;
    const baseScrapeOptions: ScrapeOptions = { ...options };
    delete baseScrapeOptions.scrapeLinkedPages;
    delete baseScrapeOptions.tags;

    try {
        if (shouldScrapeLinks) {
            console.log(`[Handler] Initiating sequential multi-link scrape from ${url}`);
            const results = await scrapeEveryLinkFromWebsite(url, baseScrapeOptions, keywordsToFilterBy);

            console.log(`[Handler] Sequential multi-link scrape from ${url} completed via service. Result count: ${results?.length}.`);
            res.status(200).json({
                success: true,
                message: `Sequential scraping process for links on ${url} finished. ${results?.length} links successfully scraped/retrieved. Check server logs for details on individual link errors.`,
                count: results?.length,
                data: results
            });
            return;

        } else {
            console.log(`[Handler] Initiating single scrape for ${url}`);
            const savedData = await scrapeAndSave(url, baseScrapeOptions, keywordsToFilterBy);
            if(savedData){
            console.log(`[Handler] Single scrape,filter and save successful for ${url}`);
            res.status(201).json({ success: true, data: savedData });
            return;
            }
            else {
                res.status(200).json({
                    success: true,
                    message: `Content from ${url} did not meet the keyword filter criteria or could not be parsed. No data saved.`,
                    data: null
                 });                
            }
        }

    } catch (error: any) {
        console.error(`[Handler] Error processing POST /scrape for ${url} (Mode: ${shouldScrapeLinks ? 'Multi-Link' : 'Single'}):`, error);

        if (!shouldScrapeLinks && error.code === 11000) {
             try {
                 const existingData = await findOneByUrl(url);
                 if (existingData) {
                     console.log(`[Handler] Single scrape conflict for ${url}. Returning existing data.`);
                     res.status(200).json({ success: true, data: existingData, message: "Data already existed." });
                     return;
                 } else {
                    res.status(409).json({ error: "Conflict: URL already exists, but failed to retrieve existing data." });
                     return;
                 }
            } catch (findError) {
                 console.error(`[Handler] Error finding existing data for ${url} after conflict:`, findError);
                 res.status(500).json({ error: "Conflict occurred, but failed to retrieve existing data." });
                 return;
            }
        }
        if (error instanceof mongoose.Error.ValidationError) {
            res.status(400).json({ error: `Validation Error: ${error.message}` });
            return;
        }
        if (error.message?.includes('Failed to fetch URL')) {
             const statusCode = error.message.includes('Status: 404') ? 404 : 502;
             res.status(statusCode).json({ error: `Upstream Error: ${error.message}`});
             return;
        }
        if (error.message?.includes('Parsing failed')) {
            res.status(422).json({ error: "Processing Error: " + error.message });
            return;
        }
        res.status(500).json({ error: "Internal Server Error occurred." });
        return;
    }
};