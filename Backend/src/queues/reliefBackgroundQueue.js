import { Queue } from "bullmq";

import {
  closeBullMqConnection,
  createBullMqProducerConnection,
  getBullMqConfig,
} from "../config/bullmqConfig.js";

let reliefBackgroundQueue = null;
let producerConnection = null;

function ensureBullMqEnabled() {
  const config = getBullMqConfig();

  if (!config.enabled) {
    throw new Error("BullMQ is disabled. Set BULLMQ_ENABLED=true.");
  }

  return config;
}

export function getReliefBackgroundQueue() {
  if (reliefBackgroundQueue) {
    return reliefBackgroundQueue;
  }

  const config = ensureBullMqEnabled();

  producerConnection = createBullMqProducerConnection();

  reliefBackgroundQueue = new Queue(config.queueName, {
    connection: producerConnection,
    prefix: config.prefix,

    defaultJobOptions: {
      attempts: config.jobAttempts,

      backoff: {
        type: "exponential",
        delay: config.backoffDelayMs,
      },

      removeOnComplete: {
        age: 60 * 60 * 24,
        count: 1000,
      },

      removeOnFail: {
        age: 60 * 60 * 24 * 7,
        count: 1000,
      },
    },
  });

  reliefBackgroundQueue.on("error", (error) => {
    console.error(`⚠️ BullMQ queue error: ${error.message}`);
  });

  return reliefBackgroundQueue;
}

export async function enqueueSystemHealthCheck({
  requestedBy = "manual",
} = {}) {
  const queue = getReliefBackgroundQueue();

  return await queue.add("system.health-check", {
    requestedAt: new Date().toISOString(),
    requestedBy,
  });
}

export async function enqueueNgoOfferExpirySweep({
  requestedBy = "manual",
} = {}) {
  const queue = getReliefBackgroundQueue();

  return await queue.add("ngo-offers.expire-sweep", {
    requestedAt: new Date().toISOString(),
    requestedBy,
  });
}

export async function enqueueNotificationDelivery({
  notificationId,
  notificationType,
  jobId = null,
} = {}) {
  if (!notificationId) {
    throw new Error("notificationId is required");
  }

  const queue = getReliefBackgroundQueue();

  const jobOptions = jobId
    ? {
        jobId,
      }
    : undefined;

  return await queue.add(
    "notifications.deliver",
    {
      notificationId: String(notificationId),
      notificationType: notificationType || "UNKNOWN",
      queuedAt: new Date().toISOString(),
    },
    jobOptions,
  );
}

export async function closeReliefBackgroundQueue() {
  if (reliefBackgroundQueue) {
    await reliefBackgroundQueue.close();
    reliefBackgroundQueue = null;
  }

  await closeBullMqConnection(producerConnection);
  producerConnection = null;
}
