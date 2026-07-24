const multer = require("multer");
const schema = require("../lib/schema");
const airtable = require("../lib/airtable");
const { buildModuleRouter } = require("../lib/moduleRouter");
const { buildProfileRoute } = require("../lib/profileAggregation");
const { extractLicenseData } = require("../lib/extract");
const { logActivity } = require("../lib/activity");
const { getCompanyProfile } = require("../lib/companyProfile");

const router = buildModuleRouter({
  moduleName: "Machinery",
  tableId: schema.machinery.tableId,
  fields: schema.machinery.fields,
  primaryFieldKey: "machineName",
  attachmentFields: {
    license: schema.machinery.fields.licenseDocument,
    serviceHistory: schema.machinery.fields.serviceHistory,
    photos: schema.machinery.fields.photos,
  },
});

// GET /reports/register-data — flat display rows + company branding for the
// Machinery Register print/export report (public/js/pages/machinery.module.js,
// ReportEngine). Same aggregation-endpoint convention as
// chemicals.js's /reports/register-data.
//
// Must be a 2+ segment path — buildModuleRouter above already registered
// GET "/:id", which (being a single path segment) would shadow a single-
// segment GET registered after it, since Express matches in registration
// order.
router.get("/reports/register-data", async (req, res) => {
  try {
    const MF = schema.machinery.fields;
    const [company, machines] = await Promise.all([getCompanyProfile(), airtable.listRecords(schema.machinery.tableId)]);

    const rows = machines.map((r) => ({
      id: r.id,
      machineName: r.fields[MF.machineName] || "",
      assetTag: r.fields[MF.assetTag] || "",
      category: r.fields[MF.category] || "",
      location: r.fields[MF.location] || "",
      operationalStatus: r.fields[MF.operationalStatus] || "",
      responsiblePerson: r.fields[MF.responsiblePerson] || "",
      lastInspectionDate: r.fields[MF.lastInspectionDate] || "",
      nextInspectionDue: r.fields[MF.nextInspectionDue] || "",
      doshCertNo: r.fields[MF.doshCertNo] || "",
      complianceStatus: r.fields[MF.complianceStatus] || "",
      licenseExpiryDate: r.fields[MF.licenseExpiryDate] || "",
    }));

    res.json({ company, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load Machinery Register data." });
  }
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

// GET /:id/profile — aggregates the machine record with every linked
// sub-record (CF, PM, CM, Inspection, Calibration, HIRARC risk assessments,
// Activity Log) in a single call, built from the generic module-framework
// profile aggregator (server/lib/profileAggregation.js) — see that file for
// why linked sub-tables are filtered in application code rather than via
// Airtable's filterByFormula.
router.get(
  "/:id/profile",
  buildProfileRoute({
    masterTableId: schema.machinery.tableId,
    masterNameFieldId: schema.machinery.fields.machineName,
    moduleName: "Machinery",
    logActivity,
    subTables: [
      { key: "cf", tableId: schema.machineryCF.tableId, linkFieldId: schema.machineryCF.fields.machine },
      { key: "pm", tableId: schema.preventiveMaintenance.tableId, linkFieldId: schema.preventiveMaintenance.fields.machine },
      { key: "cm", tableId: schema.correctiveMaintenance.tableId, linkFieldId: schema.correctiveMaintenance.fields.machine },
      { key: "inspection", tableId: schema.machineryInspection.tableId, linkFieldId: schema.machineryInspection.fields.machine },
      { key: "calibration", tableId: schema.calibrationRecords.tableId, linkFieldId: schema.calibrationRecords.fields.machine },
      { key: "hirarc", tableId: schema.hirarc.tableId, linkFieldId: schema.hirarc.fields.machinery },
    ],
  })
);

module.exports = router;
