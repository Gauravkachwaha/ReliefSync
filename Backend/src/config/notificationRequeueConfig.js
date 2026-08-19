function getPositiveIntegerEnv(name, defaultValue, maxValue) {
  const value = Number.parseInt(process.env[name], 10);

  if (!Number.isInteger(value) || value < 1) {
    return defaultValue;
  }

  return Math.min(value, maxValue);
}

export function getNotificationRequeueConfig() {
  return {
    // A notification stuck at QUEUED with no bullMqJobId means the initial
    // enqueue attempt failed (e.g. Redis was briefly down). This sweep
    // retries queuing it — it never touches notifications that are already
    // in flight or have been delivered.
    sweepIntervalMs: getPositiveIntegerEnv(
      "NOTIFICATION_REQUEUE_SWEEP_INTERVAL_MS",
      120000,
      60 * 60 * 1000,
    ),

    graceMs: getPositiveIntegerEnv(
      "NOTIFICATION_REQUEUE_GRACE_MS",
      60000,
      60 * 60 * 1000,
    ),

    batchSize: getPositiveIntegerEnv(
      "NOTIFICATION_REQUEUE_BATCH_SIZE",
      100,
      500,
    ),
  };
}
