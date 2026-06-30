import IORedis from "ioredis";

function getBooleanEnv(name, defaultValue = false) {
  const value = process.env[name];

  if (value === undefined) {
    return defaultValue;
  }

  return String(value).trim().toLowerCase() === "true";
}

function getPositiveIntegerEnv(name, defaultValue, maxValue) {
  const value = Number.parseInt(process.env[name], 10);

  if (!Number.isInteger(value) || value < 1) {
    return defaultValue;
  }

  return Math.min(value, maxValue);
}

export function getBullMqConfig() {
  return {
    enabled: getBooleanEnv("BULLMQ_ENABLED", true),

    redisUrl:
      process.env.BULLMQ_REDIS_URL ||
      process.env.BACKEND_REDIS_URL ||
      "redis://127.0.0.1:6379/0",

    prefix: (process.env.BULLMQ_PREFIX || "reliefsync:jobs").replace(/:+$/, ""),

    queueName: process.env.BULLMQ_QUEUE_NAME || "reliefsync-background",

    workerConcurrency: getPositiveIntegerEnv(
      "BULLMQ_WORKER_CONCURRENCY",
      2,
      20,
    ),

    producerMaxRetries: getPositiveIntegerEnv(
      "BULLMQ_PRODUCER_MAX_RETRIES",
      1,
      20,
    ),

    connectTimeoutMs: getPositiveIntegerEnv(
      "BULLMQ_CONNECT_TIMEOUT_MS",
      2000,
      30000,
    ),

    jobAttempts: getPositiveIntegerEnv("BULLMQ_JOB_ATTEMPTS", 3, 10),

    backoffDelayMs: getPositiveIntegerEnv(
      "BULLMQ_BACKOFF_DELAY_MS",
      5000,
      60000,
    ),
  };
}

function createBullMqConnection({ role, maxRetriesPerRequest }) {
  const config = getBullMqConfig();

  const connection = new IORedis(config.redisUrl, {
    maxRetriesPerRequest,
    connectTimeout: config.connectTimeoutMs,
    enableReadyCheck: true,

    retryStrategy(attempt) {
      return Math.min(attempt * 250, 2000);
    },
  });

  connection.on("error", (error) => {
    console.error(`⚠️ BullMQ ${role} Redis error: ${error.message}`);
  });

  return connection;
}

export function createBullMqProducerConnection() {
  const config = getBullMqConfig();

  return createBullMqConnection({
    role: "producer",
    maxRetriesPerRequest: config.producerMaxRetries,
  });
}

export function createBullMqWorkerConnection() {
  return createBullMqConnection({
    role: "worker",
    maxRetriesPerRequest: null,
  });
}

export async function closeBullMqConnection(connection) {
  if (!connection) {
    return;
  }

  try {
    if (connection.status !== "end") {
      await connection.quit();
    }
  } catch {
    connection.disconnect();
  }
}
