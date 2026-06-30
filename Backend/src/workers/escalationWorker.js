import "dotenv/config";

import { Worker } from "bullmq";

import {
  closeBullMqConnection,
  createBullMqWorkerConnection,
  getBullMqConfig,
} from "../config/bullmqConfig.js";

import {
  connectWorkerDatabase,
  disconnectWorkerDatabase,
} from "../config/workerDatabase.js";

import escalationService from "../services/escalationService.js";

import {
  closeEscalationQueue,
  ensureEscalationScheduler,
  getEscalationQueueName,
} from "../queues/escalationQueue.js";

let worker = null;
let workerConnection = null;
let isShuttingDown = false;

async function processEscalationJob(job) {
  console.log(`🛠 Processing escalation job: ${job.name} (id=${job.id})`);

  if (job.name === "complaints.escalation-sweep") {
    await job.updateProgress(10);

    const result = await escalationService.runSweep();

    await job.updateProgress(100);

    return result;
  }

  throw new Error(`Unsupported escalation job type: ${job.name}`);
}

async function startWorker() {
  const config = getBullMqConfig();

  if (!config.enabled) {
    throw new Error("BullMQ is disabled. Set BULLMQ_ENABLED=true.");
  }

  await connectWorkerDatabase();

  workerConnection = createBullMqWorkerConnection();

  worker = new Worker(getEscalationQueueName(), processEscalationJob, {
    connection: workerConnection,
    prefix: config.prefix,
    concurrency: 1,
  });

  worker.on("completed", (job, result) => {
    console.log(
      `✅ Escalation job completed: ${job.name} (id=${job.id})`,
      result,
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `❌ Escalation job failed: ${job?.name || "unknown"} ` +
        `(id=${job?.id || "unknown"}) — ${error.message}`,
    );
  });

  worker.on("error", (error) => {
    console.error(`⚠️ Escalation worker error: ${error.message}`);
  });

  await worker.waitUntilReady();

  await ensureEscalationScheduler();

  console.log(
    `🚀 ReliefSync escalation worker is running ` +
      `(queue=${getEscalationQueueName()})`,
  );
}

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`\n🛑 ${signal} received. Closing escalation worker...`);

  try {
    if (worker) {
      await worker.close();
    }

    await closeEscalationQueue();
    await closeBullMqConnection(workerConnection);
    await disconnectWorkerDatabase();

    console.log("✅ Escalation worker stopped safely.");

    process.exit(0);
  } catch (error) {
    console.error(`❌ Escalation worker shutdown failed: ${error.message}`);

    process.exit(1);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

startWorker().catch(async (error) => {
  console.error(`❌ Could not start escalation worker: ${error.message}`);

  await closeEscalationQueue();
  await closeBullMqConnection(workerConnection);
  await disconnectWorkerDatabase();

  process.exit(1);
});
