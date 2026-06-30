import "dotenv/config";

import mongoose from "mongoose";

import notificationService from "../src/services/notificationService.js";

import { closeReliefBackgroundQueue } from "../src/queues/reliefBackgroundQueue.js";

function getMongoUri() {
  const mongoUri =
    process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;

  if (!mongoUri) {
    throw new Error("MongoDB URI is missing. Add MONGO_URI to Backend/.env.");
  }

  return mongoUri;
}

async function run() {
  try {
    await mongoose.connect(getMongoUri());

    const notification = await notificationService.createAndQueueNotification({
      type: "SYSTEM_TEST_NOTIFICATION",
      recipientType: "SYSTEM",
      channel: "CONSOLE",
      subject: "ReliefSync notification test",
      message: "This is a test notification from the BullMQ worker pipeline.",
      payload: {
        source: "enqueueTestNotification.js",
        createdAt: new Date().toISOString(),
      },
    });

    console.log("✅ Test notification queued.");

    console.log({
      notificationId: notification._id,
      type: notification.type,
      status: notification.status,
      channel: notification.channel,
    });
  } catch (error) {
    console.error(`❌ Could not queue test notification: ${error.message}`);

    process.exitCode = 1;
  } finally {
    await closeReliefBackgroundQueue();
    await mongoose.disconnect();
  }
}

run();
