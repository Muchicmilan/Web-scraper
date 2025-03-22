import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
export const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/scraper";
        const options = {
            authSource: process.env.AUTH_SOURCE || "admin",
            user: process.env.MONGO_USER,
            pass: process.env.MONGO_PASSWORD
        };
        await mongoose.connect(mongoURI, options);
        console.log("Database Connected");
    }
    catch (error) {
        console.error("Connection error: ", error);
        process.exit(1);
    }
};
export default connectDB;
