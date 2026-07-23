// Operational logging for AI (Gemini) extraction calls — not business data,
// purely for monitoring AI behaviour. Mirrors logActivity's shape and its
// "never throws into the caller" contract: a logging failure must never fail
// the extraction it's observing. Also emits AIExtraction.Completed /
// AIExtraction.Failed on the Event Bus so a future AI Operations Center or
// Monitoring Agent can react in real time instead of polling this table.

const airtable = require("./airtable");
const schema = require("./schema");
const eventBus = require("./eventBus");

async function logAiExtraction({
  extractionType,
  model,
  promptVersion,
  extractionVersion,
  durationMs,
  success,
  warnings,
  recordRef,
}) {
  const F = schema.aiExtractionLogs.fields;
  try {
    await airtable.createRecords(schema.aiExtractionLogs.tableId, [
      {
        fields: {
          [F.logReference]: `AI-EXT-${Date.now()}`,
          [F.extractionType]: extractionType,
          [F.modelUsed]: model || "",
          [F.promptVersion]: promptVersion || "",
          [F.extractionVersion]: extractionVersion || "",
          [F.timestamp]: new Date().toISOString(),
          [F.durationMs]: durationMs ?? 0,
          [F.success]: !!success,
          [F.warnings]: warnings || "",
          [F.recordRef]: recordRef || "",
        },
      },
    ]);
  } catch (err) {
    console.error("[aiExtractionLog] failed to log:", err.message);
  }

  eventBus.emit(success ? "AIExtraction.Completed" : "AIExtraction.Failed", {
    extractionType,
    model,
    durationMs,
    warnings,
    recordRef,
  });
}

module.exports = { logAiExtraction };
