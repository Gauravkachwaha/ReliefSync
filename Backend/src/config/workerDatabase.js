import mongoose from "mongoose";

function getMongoUri() {
  const mongoUri =
    process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;

  if (!mongoUri) {
    throw new Error("MongoDB URI is missing. Add MONGO_URI to Backend/.env.");
  }

  return mongoUri;
}

export async function connectWorkerDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(getMongoUri(), {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("✅ Background worker connected to MongoDB");
}

export async function disconnectWorkerDatabase() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();

  console.log("✅ Background worker disconnected from MongoDB");
}
