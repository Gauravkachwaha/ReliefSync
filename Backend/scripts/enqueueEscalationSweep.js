import "dotenv/config";

import {
  closeEscalationQueue,
  enqueueEscalationSweep,
} from "../src/queues/escalationQueue.js";

async function run() {
  try {
    const job = await enqueueEscalationSweep({
      requestedBy: "manual-terminal-test",
    });

    console.log("✅ Escalation sweep queued.");

    console.log({
      jobId: job.id,
      jobName: job.name,
      data: job.data,
    });
  } catch (error) {
    console.error(`❌ Could not queue escalation sweep: ${error.message}`);

    process.exitCode = 1;
  } finally {
    await closeEscalationQueue();
  }
}

run();
