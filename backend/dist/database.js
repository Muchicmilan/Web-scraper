import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
export const connectDB = async () => {
    try {
        await mongoose.connect("mongodb://admin:password@localhost:27017/", {
            authSource: "admin",
        });
        console.log("Database Connected");
    }
    catch (error) {
        console.error("Connection error: ", error);
        process.exit(1);
    }
};
export default connectDB;
