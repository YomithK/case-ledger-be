import 'dotenv/config';
import mongoose from 'mongoose';
import { db, server } from './config/index.js';
import app from './app.js';
import logger from './utils/logger.js';

// Database connection
//TODO: Remove duplicate Db connection
const connectDB = async () => {
    try {
        mongoose.set('strictQuery', true);

        await mongoose.connect(db.mongoDB_URI, {
            autoIndex: true,
            minPoolSize: db.minPoolSize,
            maxPoolSize: db.maxPoolSize,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        logger.info(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        logger.error(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

// Start server
const startServer = async () => {
    await connectDB();

    app.listen(server.port, () => {
        logger.info(`Server running on port ${server.port} in ${server.nodeEnv} mode`);
        logger.info(`API Base URL: http://localhost:${server.port}/api/v1`);
    });
};

startServer();

export default app;
