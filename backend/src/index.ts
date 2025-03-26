import express, {Application} from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./database.js"
import scrapeEngineRouter from "./scraper-engine/scraper-engine-controller.js";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB();

app.use("/api", scrapeEngineRouter);

app.listen(PORT, ()=>{
    console.log(`server is listening on port ${PORT}`);
})

