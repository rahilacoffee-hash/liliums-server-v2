// Command monitoring starts after the driver has selected and checked out a
// connection. The difference from application query time is intentionally
// labelled as unmeasured: it can include pool wait, selection and driver work.
const startedCommands = new Map();
const completedCommands = new Map();
const MAX_ENTRIES = 1000;
const MAX_AGE_MS = 60_000;

function prune(map, now) {
  for (const [key, entry] of map) {
    if (now - entry.recordedAt > MAX_AGE_MS) map.delete(key);
  }

  while (map.size > MAX_ENTRIES) {
    map.delete(map.keys().next().value);
  }
}

function productListTraceId(command) {
  const comment = command?.comment;
  return typeof comment === "string" && comment.startsWith("product-list:")
    ? comment
    : null;
}

function commandKey(event) {
  // requestId is scoped to a driver connection, not the whole pool.
  return `${JSON.stringify(event.connectionId)}:${event.requestId}`;
}

export function installMongoCommandTiming(client) {
  if (client.__liliumsCommandTimingInstalled) return;

  client.__liliumsCommandTimingInstalled = true;

  client.on("commandStarted", (event) => {
    const traceId = productListTraceId(event.command);

    if (traceId) {
      const startedAt = performance.now();
      startedCommands.set(commandKey(event), { traceId, startedAt, recordedAt: startedAt });
      prune(startedCommands, startedAt);
    }
  });

  const complete = (event) => {
    const key = commandKey(event);
    const started = startedCommands.get(key);
    if (!started) return;

    startedCommands.delete(key);
    const completedAt = performance.now();
    completedCommands.set(started.traceId, {
      commandMs: Math.round(completedAt - started.startedAt),
      recordedAt: completedAt,
    });
    prune(completedCommands, completedAt);
  };

  client.on("commandSucceeded", complete);
  client.on("commandFailed", complete);
}

export function takeMongoCommandMs(traceId) {
  const now = performance.now();
  prune(startedCommands, now);
  prune(completedCommands, now);
  const completed = completedCommands.get(traceId);
  completedCommands.delete(traceId);
  return completed?.commandMs ?? null;
}

export function discardMongoCommandTiming(traceId) {
  completedCommands.delete(traceId);
}
