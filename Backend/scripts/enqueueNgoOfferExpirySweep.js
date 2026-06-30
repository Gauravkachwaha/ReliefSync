import "dotenv/config";

import {
  closeReliefBackgroundQueue,
  enqueueNgoOfferExpirySweep,
} from "../src/queues/reliefBackgroundQueue.js";

async function run() {
  try {
    const job = await enqueueNgoOfferExpirySweep({
      requestedBy: "manual-terminal-test",
    });

    console.log("✅ NGO offer expiry job queued.");

    console.log({
      jobId: job.id,
      jobName: job.name,
      data: job.data,
    });
  } catch (error) {
    console.error(`❌ Could not queue expiry job: ${error.message}`);

    process.exitCode = 1;
  } finally {
    await closeReliefBackgroundQueue();
  }
}

run();
