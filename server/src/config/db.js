const mongoose = require("mongoose");
const env = require("./env");
const logger = require("../utils/logger");

let connectionPromise = null;

async function connectMongo() {
  if (connectionPromise) return connectionPromise;

  mongoose.set("strictQuery", true);

  connectionPromise = mongoose
    .connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10_000,
    })
    .then((conn) => {
      logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    })
    .catch((err) => {
      logger.error("MongoDB connection failed", err);
      // Reset so a future call can retry.
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}

module.exports = { connectMongo };
