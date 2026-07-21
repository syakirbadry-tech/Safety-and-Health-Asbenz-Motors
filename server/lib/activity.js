const airtable = require("./airtable");
const schema = require("./schema");

// Fire-and-forget activity logger. Never throws into the caller — a logging
// failure should not break the actual user action.
async function logActivity({ userRecordId, action, module: moduleName, recordRef, details, req }) {
  try {
    const ip =
      req?.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req?.socket?.remoteAddress ||
      "unknown";
    const ua = req?.headers["user-agent"] || "";

    await airtable.createRecords(schema.activityLog.tableId, [
      {
        fields: {
          [schema.activityLog.fields.timestamp]: new Date().toISOString(),
          ...(userRecordId ? { [schema.activityLog.fields.user]: [userRecordId] } : {}),
          [schema.activityLog.fields.action]: action,
          [schema.activityLog.fields.module]: moduleName,
          [schema.activityLog.fields.recordRef]: recordRef || "",
          [schema.activityLog.fields.details]: details || "",
          [schema.activityLog.fields.ipDevice]: `${ip} · ${ua}`.slice(0, 500),
        },
      },
    ]);
  } catch (err) {
    console.error("[activity] failed to log:", err.message);
  }
}

module.exports = { logActivity };
