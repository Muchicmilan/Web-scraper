import { Router } from "express";
import { handleCreateScrape, handleGetScrapeById, handleGetAllScrapes } from "./scraper-engine-handlers.js";
const scrapeEngineRouter = Router();
scrapeEngineRouter.post("/scrape", handleCreateScrape);
scrapeEngineRouter.get("/scrape/all", handleGetAllScrapes);
scrapeEngineRouter.get("/scrape/:id", handleGetScrapeById);
export default scrapeEngineRouter;
