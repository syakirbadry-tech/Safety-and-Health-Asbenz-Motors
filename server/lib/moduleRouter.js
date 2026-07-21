// Generic CRUD + file-upload router factory shared by Machinery, CHRA, HRA,
// HIRARC and SOP. Each module just supplies its table ID, field-name map,
// and which fields are attachment fields.

const express = require("express");
const multer = require("multer");
const airtable = require("./airtable");
const { writeRequiresAdmin } = require("../middleware/auth");
const { logActivity } = require("./activity");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function buildModuleRouter({ moduleName, tableId, fields, attachmentFields, primaryFieldKey }) {
  const router = express.Router();
  router.use(writeRequiresAdmin);

  const allFieldIds = Object.values(fields);

  // GET /  — list all records
  router.get("/", async (req, res) => {
    try {
      const records = await airtable.listRecords(tableId, { fieldIds: allFieldIds });
      res.json({ records });
    } catch (err) {
      console.error(err);
      await logActivity({ userRecordId: req.user?.sub, action: "Error", module: moduleName, details: `List failed: ${err.message}`, req });
      res.status(500).json({ error: "Could not load records from Airtable." });
    }
  });

  // GET /:id — single record
  router.get("/:id", async (req, res) => {
    try {
      const record = await airtable.getRecord(tableId, req.params.id);
      res.json({ record });
    } catch (err) {
      await logActivity({ userRecordId: req.user?.sub, action: "Error", module: moduleName, recordRef: req.params.id, details: `Fetch failed: ${err.message}`, req });
      res.status(404).json({ error: "Record not found." });
    }
  });

  // POST / — create record
  router.post("/", async (req, res) => {
    try {
      const result = await airtable.createRecords(tableId, [{ fields: req.body.fields || {} }], true);
      const created = result.records[0];
      const label = created.fields[fields[primaryFieldKey]] || created.id;
      await logActivity({ userRecordId: req.user.sub, action: "Create", module: moduleName, recordRef: label, req });
      res.status(201).json({ record: created });
    } catch (err) {
      console.error(err);
      await logActivity({ userRecordId: req.user?.sub, action: "Error", module: moduleName, details: `Create failed: ${err.message}`, req });
      res.status(400).json({ error: err.message || "Could not create record." });
    }
  });

  // PATCH /:id — update record
  router.patch("/:id", async (req, res) => {
    try {
      const result = await airtable.updateRecords(
        tableId,
        [{ id: req.params.id, fields: req.body.fields || {} }],
        true
      );
      const updated = result.records[0];
      const label = updated.fields[fields[primaryFieldKey]] || updated.id;
      await logActivity({ userRecordId: req.user.sub, action: "Update", module: moduleName, recordRef: label, req });
      res.json({ record: updated });
    } catch (err) {
      console.error(err);
      await logActivity({ userRecordId: req.user?.sub, action: "Error", module: moduleName, recordRef: req.params.id, details: `Update failed: ${err.message}`, req });
      res.status(400).json({ error: err.message || "Could not update record." });
    }
  });

  // DELETE /:id
  router.delete("/:id", async (req, res) => {
    try {
      await airtable.deleteRecords(tableId, [req.params.id]);
      await logActivity({ userRecordId: req.user.sub, action: "Delete", module: moduleName, recordRef: req.params.id, req });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      await logActivity({ userRecordId: req.user?.sub, action: "Error", module: moduleName, recordRef: req.params.id, details: `Delete failed: ${err.message}`, req });
      res.status(400).json({ error: err.message || "Could not delete record." });
    }
  });

  // POST /:id/upload/:fieldKey — upload a file (license doc, service history, SDS, etc.)
  router.post("/:id/upload/:fieldKey", upload.single("file"), async (req, res) => {
    const fieldKey = req.params.fieldKey;
    const fieldId = attachmentFields[fieldKey];
    if (!fieldId) return res.status(400).json({ error: "Unknown attachment field." });
    if (!req.file) return res.status(400).json({ error: "No file received." });

    try {
      const base64 = req.file.buffer.toString("base64");
      const result = await airtable.uploadAttachment(tableId, req.params.id, fieldId, {
        filename: req.file.originalname,
        contentType: req.file.mimetype || "application/octet-stream",
        base64,
      });
      await logActivity({
        userRecordId: req.user.sub,
        action: "Upload",
        module: moduleName,
        recordRef: req.params.id,
        details: `${fieldKey}: ${req.file.originalname}`,
        req,
      });
      res.json({ record: result });
    } catch (err) {
      console.error(err);
      await logActivity({ userRecordId: req.user?.sub, action: "Error", module: moduleName, recordRef: req.params.id, details: `Upload failed: ${err.message}`, req });
      res.status(400).json({ error: err.message || "Upload failed." });
    }
  });

  return router;
}

module.exports = { buildModuleRouter };
