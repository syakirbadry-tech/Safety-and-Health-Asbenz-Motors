const multer = require("multer");
const schema = require("../lib/schema");
const airtable = require("../lib/airtable");
const { buildModuleRouter } = require("../lib/moduleRouter");
const { extractLicenseData } = require("../lib/extract");
const { logActivity } = require("../lib/activity");

const router = buildModuleRouter({
  moduleName: "Machinery",
  tableId: schema.machinery.tableId,
  fields: schema.machinery.fields,
  primaryFieldKey: "machineName",
  attachmentFields: {
    license: schema.machinery.fields.licenseDocument,
    serviceHistory: schema.machinery.fields.serviceHistory,
  },
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// POST /:id/upload-and-extract-license
// Saves the file into the License Document attachment field (same as a
// normal upload) AND asks Claude to read it for Serial Number, Category,
// Country of Origin/Manufacturer, License Expiry Date and DOSH Cert No.
// Nothing gets written into those text fields here — the response just
// carries "suggestion" values back to the frontend, which pre-fills the
// edit form so an admin can review/correct before actually saving.
router.post("/:id/upload-and-extract-license", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received." });

  try {
    const base64 = req.file.buffer.toString("base64");

    const uploadResult = await airtable.uploadAttachment(
      schema.machinery.tableId,
      req.params.id,
      schema.machinery.fields.licenseDocument,
      {
        filename: req.file.originalname,
        contentType: req.file.mimetype || "application/octet-stream",
        base64,
      }
    );

    let suggestion = null;
    let extractError = null;
    try {
      suggestion = await extractLicenseData({ base64, mimeType: req.file.mimetype });
    } catch (err) {
      console.error("[extract] failed:", err.message);
      extractError = err.message;
    }

    await logActivity({
      userRecordId: req.user.sub,
      action: "Upload",
      module: "Machinery",
      recordRef: req.params.id,
      details: `license: ${req.file.originalname}${suggestion ? " (AI extracted)" : ` (extraction failed: ${extractError})`}`,
      req,
    });

    res.json({ record: uploadResult, suggestion, extractError });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Upload failed." });
  }
});

// POST /extract-license-preview
// For a machine that doesn't exist yet (the "New Machinery" form). Reads
// the file and returns AI suggestions ONLY — nothing is saved to Airtable
// here, since there's no record to attach to yet. The frontend pre-fills
// the new-record form with the suggestions and holds onto the file; once
// the admin clicks Save, the record gets created and the app then uploads
// this same file via the normal /:id/upload/:fieldKey route.
router.post("/extract-license-preview", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received." });
  try {
    const base64 = req.file.buffer.toString("base64");
    const suggestion = await extractLicenseData({ base64, mimeType: req.file.mimetype });
    res.json({ suggestion });
  } catch (err) {
    console.error("[extract] failed:", err.message);
    res.status(err.status || 400).json({ error: err.message || "Extraction failed." });
  }
});

module.exports = router;
