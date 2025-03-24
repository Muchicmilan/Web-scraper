import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
export const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || "mongodb://root:rootpassword@localhost:27017/scraper?authSource=admin";
        const options = {
            user: "root",
            pass: "rootpassword",
            dbName: "scraper",
        };
        await mongoose.connect(mongoURI, options);
        console.log("✅ Database Connected Successfully");
    }
    catch (error) {
        console.error("❌ Connection error: ", error);
        process.exit(1);
    }
};
export default connectDB;
