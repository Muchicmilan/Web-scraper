import { Router } from "express";

import {
    handleCreateConfiguration,
    handleGetAllConfigurations,
    handleGetConfigurationById,
    handleUpdateConfiguration,
    handleDeleteConfiguration,
    handleRunScrapeJob,
    handleGetScrapedData,
    handleGetScrapedItemById,
    handleGetEngineSettings,
    handleRunMultipleScrapeJobs,
    handleUpdateEngineSettings
} from "./scraper-engine-handlers.js"

const scrapeEngineRouter = Router();

scrapeEngineRouter.post("/configurations", handleCreateConfiguration);
scrapeEngineRouter.get("/configurations", handleGetAllConfigurations);
scrapeEngineRouter.get("/configurations/:id", handleGetConfigurationById);
scrapeEngineRouter.put("/configurations/:id", handleUpdateConfiguration); 
scrapeEngineRouter.delete("/configurations/:id", handleDeleteConfiguration);

scrapeEngineRouter.post("/scrape-jobs/:configId/run", handleRunScrapeJob);
scrapeEngineRouter.post("/scrape-jobs/run-multiple", handleRunMultipleScrapeJobs);

scrapeEngineRouter.get("/scraped-data", handleGetScrapedData);
scrapeEngineRouter.get("/scraped-data/:itemId", handleGetScrapedItemById);

scrapeEngineRouter.get("/engine-settings", handleGetEngineSettings);
scrapeEngineRouter.put("/engine-settings", handleUpdateEngineSettings);


export default scrapeEngineRouter;