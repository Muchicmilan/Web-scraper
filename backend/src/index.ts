import dotenv from "dotenv";
dotenv.config();
import express, {Application} from "express";
import cors from "cors";
import { connectDB } from "./database.js"
import scrapeEngineRouter from "./scraper-engine/scraper-engine-controller.js";



const app: Application = express();
const PORT = process.env.PORT

app.use(cors());
app.use(express.json());

connectDB();

app.use("/api", scrapeEngineRouter);

app.listen(PORT, ()=>{
    console.log(`server is listening on port ${PORT}`);
})

