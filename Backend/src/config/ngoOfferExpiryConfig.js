function getPositiveIntegerEnv(name, defaultValue, maxValue) {
  const value = Number.parseInt(process.env[name], 10);

  if (!Number.isInteger(value) || value < 1) {
    return defaultValue;
  }

  return Math.min(value, maxValue);
}

export function getNgoOfferExpiryConfig() {
  return {
    offerExpiryMinutes: getPositiveIntegerEnv(
      "NGO_OFFER_EXPIRY_MINUTES",
      20,
      24 * 60,
    ),

    sweepIntervalMs: getPositiveIntegerEnv(
      "NGO_OFFER_EXPIRY_SWEEP_INTERVAL_MS",
      60000,
      60 * 60 * 1000,
    ),

    batchSize: getPositiveIntegerEnv("NGO_OFFER_EXPIRY_BATCH_SIZE", 100, 500),
  };
}
