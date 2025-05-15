import { Router } from "express";
import {
    handleCreateConfiguration, handleDeleteConfiguration,
    handleGetAllConfigurations,
    handleGetConfigurationById, handleUpdateConfiguration
} from "./handlers/scraperConfiguration.handlers.js";
import {handleRunScrapeJob} from "./handlers/scrapeJob.handlers.js";
import {handleGetScrapedData, handleGetScrapedItemById} from "./handlers/scrapedData.handlers.js";


const scrapeEngineRouter = Router();

scrapeEngineRouter.post("/configurations", handleCreateConfiguration);
scrapeEngineRouter.get("/configurations", handleGetAllConfigurations);
scrapeEngineRouter.get("/configurations/:id", handleGetConfigurationById);
scrapeEngineRouter.put("/configurations/:id", handleUpdateConfiguration);
scrapeEngineRouter.delete("/configurations/:id", handleDeleteConfiguration);

scrapeEngineRouter.post("/scrape-jobs/:configId/run", handleRunScrapeJob);

scrapeEngineRouter.get("/scraped-data", handleGetScrapedData);
scrapeEngineRouter.get("/scraped-data/:itemId", handleGetScrapedItemById);


export default scrapeEngineRouter;