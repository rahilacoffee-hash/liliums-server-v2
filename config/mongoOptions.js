function boundedPositiveInteger(value, fallback, maximum) {
  if (!/^\d+$/.test(value || "")) return fallback;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum
    ? parsed
    : fallback;
}

export function getMongoOptions({ monitorCommands = false } = {}) {
  return {
    family: 4,
    // Production index changes are made by the explicit maintenance command.
    autoIndex: process.env.NODE_ENV !== "production",
    monitorCommands,
    // Per-process cap. Confirm Atlas capacity across every application instance
    // before raising this value above the conservative default.
    maxPoolSize: boundedPositiveInteger(
      process.env.MONGODB_MAX_POOL_SIZE,
      50,
      100,
    ),
    minPoolSize: 0,
    maxConnecting: 10,
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 10000,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 10000,
  };
}
