import { getBullMqConfig } from "../config/bullmqConfig.js";
import { getNgoOfferExpiryConfig } from "../config/ngoOfferExpiryConfig.js";
import { getReliefBackgroundQueue } from "../queues/reliefBackgroundQueue.js";

export async function ensureRecurringBackgroundJobs() {
  const queue = getReliefBackgroundQueue();

  const bullMqConfig = getBullMqConfig();
  const offerExpiryConfig = getNgoOfferExpiryConfig();

  if (typeof queue.upsertJobScheduler !== "function") {
    throw new Error(
      "BullMQ version does not support Job Schedulers. Run: npm install bullmq@latest",
    );
  }

  await queue.upsertJobScheduler(
    "ngo-offer-expiry-sweep-v1",
    {
      every: offerExpiryConfig.sweepIntervalMs,
    },
    {
      name: "ngo-offers.expire-sweep",

      data: {
        requestedBy: "recurring-scheduler",
      },

      opts: {
        attempts: bullMqConfig.jobAttempts,

        backoff: {
          type: "exponential",
          delay: bullMqConfig.backoffDelayMs,
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
    },
  );

  console.log(
    `⏰ NGO offer expiry scheduler active ` +
      `(every ${offerExpiryConfig.sweepIntervalMs}ms)`,
  );
}
