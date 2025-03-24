import mongoose from "mongoose";
import dotenv from "dotenv";
//TODO popraviti .env
dotenv.config();
export const connectDB = async () => {
    try {
        console.log(process.env.MONGO_URI);
        const mongoURI = process.env.MONGO_URI || "mongodb://root:rootpassword@localhost:27017/";
        await mongoose.connect(mongoURI);
        console.log("Database Connected Successfully");
    }
    catch (error) {
        console.error("Connection error: ", error);
        process.exit(1);
    }
};
export default connectDB;
