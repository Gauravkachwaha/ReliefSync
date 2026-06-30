import "dotenv/config";

import {
  closeReliefBackgroundQueue,
  enqueueSystemHealthCheck,
} from "../src/queues/reliefBackgroundQueue.js";

async function run() {
  try {
    const job = await enqueueSystemHealthCheck({
      requestedBy: "manual-terminal-test",
    });

    console.log(`✅ Health-check job queued successfully.`);

    console.log({
      jobId: job.id,
      jobName: job.name,
      data: job.data,
    });
  } catch (error) {
    console.error(`❌ Could not queue health-check job: ${error.message}`);

    process.exitCode = 1;
  } finally {
    await closeReliefBackgroundQueue();
  }
}

run();
