import { Queue } from "bullmq";

import {
  closeBullMqConnection,
  createBullMqProducerConnection,
  getBullMqConfig,
} from "../config/bullmqConfig.js";

let escalationQueue = null;
let producerConnection = null;

function getPositiveIntegerEnv(name, defaultValue, maxValue) {
  const value = Number.parseInt(process.env[name], 10);

  if (!Number.isInteger(value) || value < 1) {
    return defaultValue;
  }

  return Math.min(value, maxValue);
}

function getEscalationQueueName() {
  return process.env.ESCALATION_QUEUE_NAME || "reliefsync-escalation";
}

function getSweepIntervalMs() {
  return getPositiveIntegerEnv(
    "ESCALATION_SWEEP_INTERVAL_MS",
    60000,
    60 * 60 * 1000,
  );
}

export function getEscalationQueue() {
  if (escalationQueue) {
    return escalationQueue;
  }

  const config = getBullMqConfig();

  if (!config.enabled) {
    throw new Error("BullMQ is disabled. Set BULLMQ_ENABLED=true.");
  }

  producerConnection = createBullMqProducerConnection();

  escalationQueue = new Queue(getEscalationQueueName(), {
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

  escalationQueue.on("error", (error) => {
    console.error(`⚠️ Escalation queue error: ${error.message}`);
  });

  return escalationQueue;
}

export async function ensureEscalationScheduler() {
  const queue = getEscalationQueue();

  if (typeof queue.upsertJobScheduler !== "function") {
    throw new Error(
      "BullMQ does not support Job Schedulers. Run: npm install bullmq@latest",
    );
  }

  await queue.upsertJobScheduler(
    "complaint-escalation-sweep-v1",
    {
      every: getSweepIntervalMs(),
    },
    {
      name: "complaints.escalation-sweep",

      data: {
        requestedBy: "recurring-escalation-scheduler",
      },
    },
  );

  console.log(
    `⏰ Escalation scheduler active (every ${getSweepIntervalMs()}ms)`,
  );
}

export async function enqueueEscalationSweep({ requestedBy = "manual" } = {}) {
  const queue = getEscalationQueue();

  return await queue.add("complaints.escalation-sweep", {
    requestedBy,
    requestedAt: new Date().toISOString(),
  });
}

export async function closeEscalationQueue() {
  if (escalationQueue) {
    await escalationQueue.close();
    escalationQueue = null;
  }

  await closeBullMqConnection(producerConnection);
  producerConnection = null;
}

export { getEscalationQueueName };
