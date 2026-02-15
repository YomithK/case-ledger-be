import { db } from '../config';

const mongoose = require('mongoose');
const { Logger } = require('winston');

//Mongo DB connection string
const dbURI = db.mongoDB_URI;

const options = {
    autoIndex: true,
    minPoolSize: db.minPoolSize,
    maxPoolSize: db.maxPoolSize,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
}

mongoose.set('strictQuery', true)

mongoose
    .connect(dbURI, options)
    .then(() => {
        Logger.info("MongoDB Connected");
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    })
    .catch((error) => {
        Logger.error("MongoDB Connection Error", error);
        console.log(error);
    })

export const DB_connection = mongoose.connection;