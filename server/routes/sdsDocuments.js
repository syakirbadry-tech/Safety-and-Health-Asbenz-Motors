const express = require("express");
const schema = require("../lib/schema");
const airtable = require("../lib/airtable");
const { buildModuleRouter } = require("../lib/moduleRouter");
const { writeRequiresAdmin } = require("../middleware/auth");
const { logActivity } = require("../lib/activity");
const eventBus = require("../lib/eventBus");

// The versioned SDS Library. Records are never overwritten — a new SDS
// revision for a chemical is always a new record. This router overrides
// just the generic factory's POST / so that saving a new revision as
// Status=Current automatically flips any other Current record(s) for the
// same chemical to Superseded — nothing is ever deleted or replaced, only
// marked superseded, per the "always preserve document history" requirement.
// GET/PATCH/DELETE/upload are unchanged, reused as-is from buildModuleRouter.
const router = express.Router();
router.use(writeRequiresAdmin);

const F = schema.sdsDocuments.fields;

router.post("/", async (req, res) => {
  try {
    const incomingFields = req.body.fields || {};
    const chemicalIds = incomingFields[F.chemical] || [];

    if (incomingFields[F.status] === "Current" && chemicalIds.length) {
      const all = await airtable.listRecords(schema.sdsDocuments.tableId, {
        fieldIds: [F.chemical, F.status],
      });
      const toSupersede = all.filter(
        (r) => r.fields[F.status] === "Current" && (r.fields[F.chemical] || []).some((id) => chemicalIds.includes(id))
      );
      if (toSupersede.length) {
        await airtable.updateRecords(
          schema.sdsDocuments.tableId,
          toSupersede.map((r) => ({ id: r.id, fields: { [F.status]: "Superseded" } })),
          true
        );
        toSupersede.forEach((r) => eventBus.emit("SDS.RevisionSuperseded", { recordId: r.id, chemicalIds: r.fields[F.chemical] || [] }));
      }
    }

    const result = await airtable.createRecords(schema.sdsDocuments.tableId, [{ fields: incomingFields }], true);
    const created = result.records[0];
    const label = created.fields[F.sdsReference] || created.id;
    await logActivity({ userRecordId: req.user.sub, action: "Create", module: "SDS Documents", recordRef: label, req });
    eventBus.emit("SDS.RevisionCreated", { recordId: created.id, chemicalIds: created.fields[F.chemical] || [], status: created.fields[F.status] });
    res.status(201).json({ record: created });
  } catch (err) {
    console.error(err);
    await logActivity({ userRecordId: req.user?.sub, action: "Error", module: "SDS Documents", details: `Create failed: ${err.message}`, req });
    res.status(400).json({ error: err.message || "Could not create record." });
  }
});

router.use(
  buildModuleRouter({
    moduleName: "SDS Documents",
    tableId: schema.sdsDocuments.tableId,
    fields: schema.sdsDocuments.fields,
    primaryFieldKey: "sdsReference",
    attachmentFields: {
      file: schema.sdsDocuments.fields.sdsFile,
    },
    eventPrefix: "SDS",
  })
);

module.exports = router;
