import { Request, Response } from "express";
import mongoose, { SortOrder } from 'mongoose';
import { ScraperConfigurationModel, ScrapedDataItemModel, IEngineSettings, EngineSettingsModel } from "./scrape-engine-schema.js";
import {getCurrentPoolOptions, initializeBrowserPool, runMultipleScrapeJobs, runScrapeJob } from "./scraper-engine-service.js";
import { BrowserPoolOptions } from "./scraper-engine-types.js";
import { DEFAULT_POOL_OPTIONS } from "./scraper-engine-constants.js";
import { removeJobSchedule, updateJobSchedule } from "./scraper-cron-service.js";


export const handleCreateConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
        const newConfig = new ScraperConfigurationModel(req.body);
        await newConfig.save();
        res.status(201).json({ success: true, data: newConfig });
    } catch (error: any) {
        console.error("[Handler] Error creating configuration:", error);
        if (error.code === 11000) { res.status(409).json({ error: "Configuration name already exists." }); }
        else if (error.name === 'ValidationError') { res.status(400).json({ error: `Validation Error: ${error.message}` }); }
        else { res.status(500).json({ error: "Failed to create configuration." }); }
    }
};

export const handleGetAllConfigurations = async (req: Request, res: Response): Promise<void> => {
    try {
        const configs = await ScraperConfigurationModel.find().sort({ name: 1 }).lean();
        res.status(200).json({ success: true, count: configs.length, data: configs });
    } catch (error) {
        console.error("[Handler] Error fetching configurations:", error);
        res.status(500).json({ error: "Failed to fetch configurations." });
    }
};

export const handleGetConfigurationById = async (req: Request, res: Response): Promise<void> => {
     try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ error: "Invalid ID format." });
            return;
        }
        const config = await ScraperConfigurationModel.findById(id).lean();
        if (!config) {
            res.status(404).json({ error: "Configuration not found." });
            return;
        }
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        console.error("[Handler] Error fetching configuration:", error);
        res.status(500).json({ error: "Failed to fetch configuration." });
    }
};

export const handleUpdateConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
         const { id } = req.params;
         if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ error: "Invalid ID format." });
            return;
        }

        const updateData = {...req.body};
        if(updateData.cronEnabled === undefined){
            updateData.cronEnabled = !!updateData.cronSchedule;
        }

         const updatedConfig = await ScraperConfigurationModel.findByIdAndUpdate(
             id,
             updateData,
             { new: true, runValidators: true }
         );

        if (!updatedConfig) {
            res.status(404).json({ error: "Configuration not found." });
            return;
        }
        updateJobSchedule(updatedConfig);
        res.status(200).json({ success: true, data: updatedConfig.toObject() });
    } catch (error: any) {
        console.error("[Handler] Error updating configuration:", error);
         if (error.name === 'ValidationError') { res.status(400).json({ error: `Validation Error: ${error.message}` }); }
         else if (error.code === 11000) { res.status(409).json({ error: "Configuration name conflict on update." }); }
         else { res.status(500).json({ error: "Failed to update configuration." }); }
    }
};

export const handleDeleteConfiguration = async (req: Request, res: Response): Promise<void> => {
     try {
         const { id } = req.params;
          if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ error: "Invalid ID format." });
            return; 
        }

         const deletedConfig = await ScraperConfigurationModel.findByIdAndDelete(id);
        if (!deletedConfig) {
            res.status(404).json({ error: "Configuration not found." });
            return; 
        }

        removeJobSchedule(id);

        res.status(200).json({ success: true, message: "Configuration deleted successfully." });
    } catch (error:any) {
        console.error("[Handler] Error deleting configuration:", error);
        res.status(500).json({ error: "Failed to delete configuration." });
    }
};

export const handleRunScrapeJob = async (req: Request, res: Response): Promise<void> => {
    const { configId } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(configId)) {
            res.status(400).json({ error: "Invalid Configuration ID format." });
            return;
        }
        const config = await ScraperConfigurationModel.findById(configId).lean();
        if (!config) {
            res.status(404).json({ error: "Configuration not found." });
            return;
        }

        await initializeBrowserPool();

        runScrapeJob(config).then(results => {
            console.log(`[API Handler Callback] Background job ${config.name} (${configId}) finished. Final results count: ${results?.length}.`);
        }).catch(error => {
            console.error(`[API Handler Callback] Background job ${config.name} (${configId}) failed:`, error.message);
        });

        console.log(`[API Handler] Accepted scrape job request for '${config.name}' (${configId}).`)
        res.status(202).json({ success: true, message: `Scrape job '${config.name}' accepted and started in background.` });

    } catch (error: any) {
        console.error(`[API Handler] Error initiating job for config ${configId}:`, error.message);
        res.status(500).json({ error: `Failed to initiate scrape job: ${error.message}` });
    }
};

export const handleRunMultipleScrapeJobs = async (req: Request, res: Response): Promise<void> => {
    const { configIds } = req.body;

    if (!Array.isArray(configIds) || configIds.length === 0) {
        res.status(400).json({ error: "Request body must contain a non-empty 'configIds' array." });
        return;
    }

    const invalidIds = configIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
        res.status(400).json({ error: `Invalid Configuration ID format found: ${invalidIds.join(', ')}` });
        return;
    }

    try {
        const configs = await ScraperConfigurationModel.find({
            '_id': { $in: configIds }
        }).lean();

        const foundIds = configs.map(c => c._id.toString());
        const notFoundIds = configIds.filter(id => !foundIds.includes(id));

        if (notFoundIds.length > 0) {
            res.status(404).json({ error: `Configurations not found: ${notFoundIds.join(', ')}` });
            return;
        }
         if (configs.length === 0) {
             res.status(404).json({ error: `No configurations found for the provided IDs.` });
             return;
         }


        await initializeBrowserPool();

        runMultipleScrapeJobs(configs).then(summary => {
            console.log(`[API Handler Callback] Background multiple jobs finished. Summary:`, summary);
        }).catch(error => {
            console.error(`[API Handler Callback] Background multiple job runner failed critically:`, error.message);
        });

        console.log(`[API Handler] Accepted request to run ${configs.length} scrape jobs in background.`);
        res.status(202).json({
            success: true,
            message: `Accepted request to run ${configs.length} scrape job(s) in background.`,
            jobs_requested: configIds,
            jobs_found: foundIds
        });

    } catch (error: any) {
        console.error(`[API Handler] Error initiating multiple jobs:`, error.message);
        res.status(500).json({ error: `Failed to initiate multiple scrape jobs: ${error.message}` });
    }
};

export const handleGetScrapedData = async (req: Request, res: Response): Promise<void> => {
    const { configId, limit = '20', page = '1', sort = 'scrapedAt', order = '-1' } = req.query; // Add sort/order

    if (!configId || typeof configId !== 'string' || !mongoose.Types.ObjectId.isValid(configId)) {
        res.status(400).json({ error: "Valid 'configId' query parameter is required." });
        return;
    }

    const limitNum = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);
    //const sortOrder = parseInt(order as string, 10) === 1 ? 1 : -1;
    const sortField = typeof sort === 'string' ? sort : 'scrapedAt';

    if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100 || isNaN(pageNum) || pageNum <= 0) {
         res.status(400).json({ error: "Invalid 'limit' (1-100) or 'page' (> 0) parameter." });
         return;
    }

    const skip = (pageNum - 1) * limitNum;
    const sortDirection: SortOrder = parseInt(order as string, 10) === 1 ? 1 : -1
    const sortOption = { [sortField]: sortDirection };

    try {
        const [items, totalCount] = await Promise.all([
             ScrapedDataItemModel.find({ configId: configId }) 
                .sort(sortOption)
                .limit(limitNum)
                .skip(skip)
                .lean(), 
             ScrapedDataItemModel.countDocuments({ configId: configId })
        ]);

        res.status(200).json({
            success: true,
            data: items,
            pagination: {
                totalItems: totalCount,
                itemCount: items.length,
                itemsPerPage: limitNum,
                currentPage: pageNum,
                totalPages: Math.ceil(totalCount / limitNum)
            }
        });
    } catch (error) {
        console.error(`[Handler] Error fetching scraped data for config ${configId}:`, error);
        res.status(500).json({ error: "Failed to fetch scraped data." });
    }
};

export const handleGetScrapedItemById = async (req: Request, res: Response): Promise<void> => {
    const { itemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
        res.status(400).json({ error: "Invalid Scraped Item ID format." });
        return;
    }

    try {
        const item = await ScrapedDataItemModel.findById(itemId).lean();

        if (!item) {
            res.status(404).json({ error: "Scraped data item not found." });
            return;
        }

        res.status(200).json({ success: true, data: item });

    } catch (error) {
        console.error(`[Handler] Error fetching scraped item by ID ${itemId}:`, error);
        res.status(500).json({ error: "Failed to fetch scraped data item." });
    }
};

export const handleGetEngineSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        let settings: BrowserPoolOptions | IEngineSettings | null = null;
        settings = await EngineSettingsModel.findOne({ singleton: true }).lean();

        if (!settings) {
            settings = getCurrentPoolOptions();
            if (!settings) {
                console.warn("[Handler:GetSettings] No settings in DB and pool not active, returning defaults.");
                settings = DEFAULT_POOL_OPTIONS;
            } else {
                 console.log("[Handler:GetSettings] No settings in DB, returning active pool options.");
            }
        } else {
             console.log("[Handler:GetSettings] Returning settings from DB.");
        }


        res.status(200).json({ success: true, data: settings });
    } catch (error: any) {
        console.error("[Handler] Error fetching engine settings:", error);
        res.status(500).json({ error: "Failed to fetch engine settings." });
    }
};

export const handleUpdateEngineSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { maxPoolSize, minPoolSize, idleTimeoutMs, retryLimit } = req.body;
         if (typeof maxPoolSize !== 'number' || typeof minPoolSize !== 'number' || typeof idleTimeoutMs !== 'number' || typeof retryLimit !== 'number') {
             res.status(400).json({ error: "Invalid data types for pool settings. All must be numbers." });
             return;
        }
         if (minPoolSize > maxPoolSize) {
             res.status(400).json({ error: "minPoolSize cannot be greater than maxPoolSize." });
             return;
         }
         if (maxPoolSize < 1 || minPoolSize < 0 || idleTimeoutMs < 1000 || retryLimit < 0) {
             res.status(400).json({ error: "One or more settings values are out of reasonable bounds."});
             return;
         }


        const updatedSettings = await EngineSettingsModel.findOneAndUpdate(
            { singleton: true },
            { $set: { maxPoolSize, minPoolSize, idleTimeoutMs, retryLimit } },
            { new: true, upsert: true, runValidators: true } 
        ).lean();

         console.log("[Handler:UpdateSettings] Engine settings updated in DB. Pool restart required for changes to take effect.", updatedSettings);


        res.status(200).json({
             success: true,
             data: updatedSettings,
             message: "Settings updated successfully. Restart the application or browser pool for changes to take effect."
        });
    } catch (error: any) {
        console.error("[Handler] Error updating engine settings:", error);
         if (error.name === 'ValidationError') {
            res.status(400).json({ error: `Validation Error: ${error.message}` });
         } else {
             res.status(500).json({ error: "Failed to update engine settings." });
         }
    }
};
