// Centralized Configuration Service / Feature Flags. Modules should read
// switches from here instead of hardcoding `if` checks, so a flag can be
// flipped without touching module code.
//
// Backed by server/config/features.json (plain JSON, checked into the repo)
// for now — enough to decouple call sites from hardcoded booleans today. The
// interface (isEnabled/getConfig) is exactly what a future Airtable- or
// Admin-panel-backed store would implement behind, same as airtable.js
// abstracts the data layer for the rest of the app — swapping the backing
// store later is a one-file change, not a call-site rewrite. Missing keys
// default to `true` so every feature that exists today keeps working
// unchanged if this file is never touched.

const fs = require("fs");
const path = require("path");

const FEATURES_PATH = path.join(__dirname, "..", "config", "features.json");

let flags = {};
try {
  flags = JSON.parse(fs.readFileSync(FEATURES_PATH, "utf8"));
} catch (err) {
  console.warn("[config] could not read features.json, all flags default to enabled:", err.message);
}

function isEnabled(flagKey, defaultValue = true) {
  return Object.prototype.hasOwnProperty.call(flags, flagKey) ? !!flags[flagKey] : defaultValue;
}

function getConfig(key, defaultValue) {
  return Object.prototype.hasOwnProperty.call(flags, key) ? flags[key] : defaultValue;
}

function allFlags() {
  return { ...flags };
}

module.exports = { isEnabled, getConfig, allFlags };
