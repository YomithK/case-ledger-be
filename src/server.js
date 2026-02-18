import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { db, server } from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// API routes with versioning
app.use('/api/v1', routes);

// 404 handler
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

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

        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

// Start server
const startServer = async () => {
    await connectDB();

    app.listen(server.port, () => {
        console.log(`Server running on port ${server.port} in ${server.nodeEnv} mode`);
        console.log(`API Base URL: http://localhost:${server.port}/api/v1`);
    });
};

startServer();

export default app;
