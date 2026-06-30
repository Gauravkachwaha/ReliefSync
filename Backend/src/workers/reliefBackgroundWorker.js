import "dotenv/config";

import { Worker } from "bullmq";

import {
  closeBullMqConnection,
  createBullMqWorkerConnection,
  getBullMqConfig,
} from "../config/bullmqConfig.js";

import { closeReliefBackgroundQueue } from "../queues/reliefBackgroundQueue.js";

import { ensureRecurringBackgroundJobs } from "../schedulers/recurringBackgroundJobs.js";

import {
  connectWorkerDatabase,
  disconnectWorkerDatabase,
} from "../config/workerDatabase.js";

import ngoOfferExpiryService from "../services/ngoOfferExpiryService.js";
import notificationService from "../services/notificationService.js";

let worker = null;
let workerConnection = null;
let isShuttingDown = false;

async function processBackgroundJob(job) {
  console.log(`🛠 Processing job: ${job.name} (id=${job.id})`);

  if (job.name === "system.health-check") {
    await job.updateProgress(50);

    const result = {
      success: true,
      workerProcessedAt: new Date().toISOString(),
      requestedAt: job.data.requestedAt,
      requestedBy: job.data.requestedBy,
    };

    await job.updateProgress(100);

    return result;
  }

  if (job.name === "ngo-offers.expire-sweep") {
    await job.updateProgress(10);

    const result = await ngoOfferExpiryService.expirePendingOffers();

    await job.updateProgress(100);

    return result;
  }

  if (job.name === "notifications.deliver") {
    await job.updateProgress(10);

    const result = await notificationService.deliverNotification(
      job.data.notificationId,
    );

    await job.updateProgress(100);

    return result;
  }

  throw new Error(`Unsupported background job type: ${job.name}`);
}

async function startWorker() {
  const config = getBullMqConfig();

  if (!config.enabled) {
    throw new Error("BullMQ is disabled. Set BULLMQ_ENABLED=true.");
  }

  await connectWorkerDatabase();

  workerConnection = createBullMqWorkerConnection();

  worker = new Worker(config.queueName, processBackgroundJob, {
    connection: workerConnection,
    prefix: config.prefix,
    concurrency: config.workerConcurrency,
  });

  worker.on("completed", (job, result) => {
    console.log(`✅ Job completed: ${job.name} (id=${job.id})`, result);
  });

  worker.on("failed", (job, error) => {
    console.error(
      `❌ Job failed: ${job?.name || "unknown"} ` +
        `(id=${job?.id || "unknown"}) — ${error.message}`,
    );
  });

  worker.on("error", (error) => {
    console.error(`⚠️ BullMQ worker error: ${error.message}`);
  });

  await worker.waitUntilReady();

  await ensureRecurringBackgroundJobs();

  console.log(
    `🚀 ReliefSync background worker is running ` +
      `(queue=${config.queueName}, concurrency=${config.workerConcurrency})`,
  );
}

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`\n🛑 ${signal} received. Closing worker...`);

  try {
    if (worker) {
      await worker.close();
    }

    await closeReliefBackgroundQueue();

    await closeBullMqConnection(workerConnection);

    await disconnectWorkerDatabase();

    console.log("✅ Background worker stopped safely.");

    process.exit(0);
  } catch (error) {
    console.error(`❌ Worker shutdown failed: ${error.message}`);

    process.exit(1);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

startWorker().catch(async (error) => {
  console.error(`❌ Could not start background worker: ${error.message}`);

  await closeReliefBackgroundQueue();
  await closeBullMqConnection(workerConnection);
  await disconnectWorkerDatabase();

  process.exit(1);
});
