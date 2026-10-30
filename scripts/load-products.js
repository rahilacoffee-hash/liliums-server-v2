import http from "node:http";

const defaultTarget = "http://127.0.0.1:5000/api/products?limit=12";
const target = new URL(process.env.TARGET_URL || defaultTarget);
const MAX_CONCURRENCY = 1_000;
const MAX_REQUESTS = 10_000;

function positiveInteger(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum
    ? parsed
    : null;
}

if (!["http:", "https:"].includes(target.protocol)) {
  throw new Error("TARGET_URL must use http or https.");
}

const concurrency = positiveInteger(process.env.CONCURRENCY, 10, MAX_CONCURRENCY);
const requests = positiveInteger(process.env.REQUESTS, concurrency, MAX_REQUESTS);

if (!concurrency || !requests) {
  throw new Error(`CONCURRENCY must be 1-${MAX_CONCURRENCY}; REQUESTS must be 1-${MAX_REQUESTS}.`);
}

function percentile(values, percentileValue) {
  const index = Math.min(values.length - 1, Math.ceil((percentileValue / 100) * values.length) - 1);
  return values[index];
}

function requestOnce() {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve({ ...result, ms: performance.now() - startedAt });
    };
    const request = http.get(target, (response) => {
      response.resume();
      response.on("end", () => finish({ status: response.statusCode }));
      response.on("aborted", () => finish({ status: 0, error: "Response aborted" }));
      response.on("error", (error) => finish({ status: 0, error: error.code || error.message }));
    });

    request.setTimeout(30000, () => request.destroy(new Error("Request timed out")));
    request.on("error", (error) => finish({ status: 0, error: error.code || error.message }));
  });
}

const startedAt = performance.now();
const results = [];
let nextRequest = 0;

await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, async () => {
  while (nextRequest < requests) {
    nextRequest += 1;
    results.push(await requestOnce());
  }
}));

const elapsedMs = performance.now() - startedAt;
const latencies = results.map((result) => result.ms).sort((a, b) => a - b);
const successful = results.filter((result) => result.status >= 200 && result.status < 300).length;
const errors = results.filter((result) => result.status < 200 || result.status >= 300);
const transportFailures = results.filter((result) => result.status === 0).length;
const statusCounts = results.reduce((counts, result) => {
  const status = String(result.status);
  counts[status] = (counts[status] || 0) + 1;
  return counts;
}, {});

console.log(JSON.stringify({
  target: target.toString(),
  requests,
  concurrency,
  successful,
  errorRate: Number(((errors.length / requests) * 100).toFixed(2)),
  transportFailures,
  statusCounts,
  latencyMs: {
    min: Number(latencies[0].toFixed(1)),
    p50: Number(percentile(latencies, 50).toFixed(1)),
    p95: Number(percentile(latencies, 95).toFixed(1)),
    p99: Number(percentile(latencies, 99).toFixed(1)),
    max: Number(latencies.at(-1).toFixed(1)),
  },
  completedRequestsPerSecond: Number((requests / (elapsedMs / 1000)).toFixed(2)),
  successfulRequestsPerSecond: Number((successful / (elapsedMs / 1000)).toFixed(2)),
}, null, 2));
