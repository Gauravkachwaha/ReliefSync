function getPositiveIntegerEnv(name, defaultValue, maxValue) {
  const value = Number.parseInt(process.env[name], 10);

  if (!Number.isInteger(value) || value < 1) {
    return defaultValue;
  }

  return Math.min(value, maxValue);
}

export function getNgoRedispatchConfig() {
  return {
    batchSize: getPositiveIntegerEnv("NGO_DISPATCH_BATCH_SIZE", 3, 20),

    highSeverityBatchSize: getPositiveIntegerEnv(
      "NGO_HIGH_SEVERITY_DISPATCH_BATCH_SIZE",
      5,
      30,
    ),

    defaultMaxActiveCases: getPositiveIntegerEnv(
      "NGO_CAPACITY_DEFAULT_MAX_ACTIVE_CASES",
      5,
      1000,
    ),

    lockSeconds: getPositiveIntegerEnv("NGO_DISPATCH_LOCK_SECONDS", 45, 300),
  };
}
