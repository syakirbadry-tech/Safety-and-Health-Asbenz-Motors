// Generic "master record + every linked sub-table in one call" aggregation,
// extracted from the Machinery module's hand-written /:id/profile route so
// every business module (Machinery, Chemical Management, and beyond) can
// build its own profile endpoint from a small config instead of repeating
// this logic per module.

const airtable = require("./airtable");
const schema = require("./schema");

function escapeFormulaString(value) {
  return String(value).replace(/"/g, '\\"');
}

// Filtering happens in application code, not via Airtable's filterByFormula:
// a formula resolves a linked-record field to the LINKED RECORD'S PRIMARY
// FIELD TEXT, not its record ID — there is no formula function to match on
// the raw linked ID, so FIND(id, ARRAYJOIN({Link})) would silently never
// match. These tables are workshop-scale, so fetching each sub-table in full
// and filtering here stays fast. (Found and fixed during Machinery QA.)
function filterLinkedTo(records, linkFieldId, parentId) {
  return records.filter((r) => (r.fields[linkFieldId] || []).includes(parentId));
}

// subTables: [{ key, tableId, linkFieldId }]
//   key         -> property name under `subTables` in the JSON response
//   tableId     -> the sub-table's Airtable table ID
//   linkFieldId -> the sub-table's linked-record field pointing back at the master record
//
// Returns an Express handler for GET /:id/profile ->
//   { master, subTables: { [key]: records[] }, activity: records[] }
function buildProfileRoute({ masterTableId, masterNameFieldId, subTables, moduleName, logActivity }) {
  return async function profileRoute(req, res) {
    const parentId = req.params.id;
    try {
      const master = await airtable.getRecord(masterTableId, parentId);
      const masterName = master.fields[masterNameFieldId] || "";

      const [subTableResults, activity] = await Promise.all([
        Promise.all(subTables.map((st) => airtable.listRecords(st.tableId))),
        masterName
          ? airtable.listRecords(schema.activityLog.tableId, {
              filterByFormula: `{Record Reference} = "${escapeFormulaString(masterName)}"`,
            })
          : Promise.resolve([]),
      ]);

      const result = { master, subTables: {}, activity };
      subTables.forEach((st, i) => {
        result.subTables[st.key] = filterLinkedTo(subTableResults[i], st.linkFieldId, parentId);
      });

      res.json(result);
    } catch (err) {
      console.error(err);
      if (logActivity) {
        await logActivity({
          userRecordId: req.user?.sub,
          action: "Error",
          module: moduleName,
          recordRef: parentId,
          details: `Profile load failed: ${err.message}`,
          req,
        });
      }
      res.status(404).json({ error: "Could not load profile." });
    }
  };
}

module.exports = { buildProfileRoute };
