// Internal Event Bus — the standard communication mechanism between modules
// going forward. A thin wrapper around Node's built-in EventEmitter: single
// Express process today, but call sites never touch EventEmitter directly,
// so the backing implementation can change later (Redis pub/sub, n8n
// webhook, a real message broker) without touching any producer or consumer.
//
// No business logic lives here. Producers (moduleRouter, sdsDocuments,
// extract, ...) emit events after their own work succeeds; nothing in this
// file knows what a "Chemical" or an "SDS" is. Consumers (a future
// Notification Engine, Workflow Engine, Audit Trail, AI Operations Center,
// or agents) subscribe with on()/onAny() — none exist yet.
//
// Event naming convention: "<Subject>.<PastTenseAction>", e.g.
// "Chemical.Created", "SDS.RevisionSuperseded", "Document.Uploaded".

const { EventEmitter } = require("events");

const emitter = new EventEmitter();
// Default Node cap is 10 listeners per event name before it warns — this bus
// is meant to gain many independent consumers over time, so raise it rather
// than let a legitimate future fan-out look like a leak.
emitter.setMaxListeners(50);

const ANY = Symbol("eventBus:any");

// Never let a bad listener take down the request that triggered it — a
// producer's emit() call must be side-effect-free from its own point of
// view no matter what a consumer does.
function emit(name, payload) {
  const envelope = { event: name, payload, timestamp: new Date().toISOString() };
  try {
    emitter.emit(name, envelope);
  } catch (err) {
    console.error(`[eventBus] listener for "${name}" threw:`, err.message);
  }
  try {
    emitter.emit(ANY, envelope);
  } catch (err) {
    console.error(`[eventBus] wildcard listener threw for "${name}":`, err.message);
  }
}

function on(name, handler) {
  emitter.on(name, handler);
  return () => emitter.off(name, handler);
}

// Wildcard subscription — receives every event the bus ever emits. For
// future generic consumers (audit trail, AI Operations Center) that want
// everything rather than one event name at a time.
function onAny(handler) {
  emitter.on(ANY, handler);
  return () => emitter.off(ANY, handler);
}

module.exports = { emit, on, onAny };
