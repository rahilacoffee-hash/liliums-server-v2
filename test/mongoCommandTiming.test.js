import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
  installMongoCommandTiming,
  takeMongoCommandMs,
} from "../utils/mongoCommandTiming.js";

test("associates concurrent commands by connection and request ID", () => {
  const client = new EventEmitter();
  installMongoCommandTiming(client);

  client.emit("commandStarted", {
    connectionId: 1,
    requestId: 7,
    command: { comment: "product-list:first" },
  });
  client.emit("commandStarted", {
    connectionId: 2,
    requestId: 7,
    command: { comment: "product-list:second" },
  });
  client.emit("commandSucceeded", { connectionId: 2, requestId: 7 });
  client.emit("commandFailed", { connectionId: 1, requestId: 7 });

  assert.equal(typeof takeMongoCommandMs("product-list:first"), "number");
  assert.equal(typeof takeMongoCommandMs("product-list:second"), "number");
  assert.equal(takeMongoCommandMs("product-list:missing"), null);
});
