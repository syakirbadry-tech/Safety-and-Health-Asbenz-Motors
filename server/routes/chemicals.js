const multer = require("multer");
const schema = require("../lib/schema");
const airtable = require("../lib/airtable");
const { buildModuleRouter } = require("../lib/moduleRouter");
const { buildProfileRoute } = require("../lib/profileAggregation");
const { extractSDSData } = require("../lib/extract");
const { logActivity } = require("../lib/activity");

const router = buildModuleRouter({
  moduleName: "Chemicals",
  tableId: schema.chemicals.tableId,
  fields: schema.chemicals.fields,
  primaryFieldKey: "chemicalName",
  attachmentFields: {
    sds: schema.chemicals.fields.sds,
    photos: schema.chemicals.fields.photos,
  },
  eventPrefix: "Chemical",
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// POST /extract-sds-preview — Step 1/2 of the "+ Add Chemical" wizard. Reads
// an uploaded SDS PDF with AI and returns suggestions ONLY — nothing is
// saved to Airtable here (there's no Chemical record yet). The frontend
// (openAddChemicalWizard in chemical.module.js) shows the result as the
// wizard's editable review step; Save is what actually creates the Chemical
// and SDS Documents records. Mirrors Machinery's extract-license-preview.
router.post("/extract-sds-preview", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received." });
  try {
    const base64 = req.file.buffer.toString("base64");
    const suggestion = await extractSDSData({ base64, mimeType: req.file.mimetype });
    res.json({ suggestion });
  } catch (err) {
    console.error("[extract-sds] failed:", err.message);
    res.status(err.status || 400).json({ error: err.message || "Extraction failed." });
  }
});

// Time-based SDS status, distinct from SDS Documents' own `status` field
// (Current/Superseded — revision history). Derived from the Expiry Date
// formula field (Revision Date + 5 years) at read time, same "compute, don't
// store" pattern as the DOSH register's CSDS/Label flags below.
const SDS_EXPIRING_SOON_DAYS = 90;
function sdsExpiryStatus(expiryDateStr) {
  if (!expiryDateStr) return null;
  const daysLeft = (new Date(expiryDateStr) - new Date()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return "Expired";
  if (daysLeft <= SDS_EXPIRING_SOON_DAYS) return "Expiring Soon";
  return "Current";
}

function pickCurrentSds(sdsDocumentsRecords) {
  const SF = schema.sdsDocuments.fields;
  const current = (sdsDocumentsRecords || []).filter((r) => r.fields[SF.status] === "Current");
  if (!current.length) return null;
  return current.sort((a, b) => new Date(b.fields[SF.revisionDate] || 0) - new Date(a.fields[SF.revisionDate] || 0))[0];
}

function buildComplianceSummary(master, subTables) {
  const CF = schema.chemicals.fields;
  const CHF = schema.chra.fields;
  const currentSds = pickCurrentSds(subTables.sdsDocuments);
  const upcomingReviews = (subTables.chra || [])
    .map((r) => r.fields[CHF.reviewDueDate])
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));

  return {
    sdsAvailable: !!currentSds,
    chraCompleted: (subTables.chra || []).length > 0,
    exposureMonitoringRequired: master.fields[CF.exposureMonitoringRequired] || "Not Assessed",
    levRequired: master.fields[CF.levRequired] || "Not Assessed",
    biologicalMonitoringRequired: master.fields[CF.biologicalMonitoringRequired] || "Not Assessed",
    healthSurveillanceRequired: master.fields[CF.healthSurveillanceRequired] || "Not Assessed",
    nextReview: upcomingReviews[0] || null,
  };
}

function buildGeneralInfoDerived(subTables) {
  const SF = schema.sdsDocuments.fields;
  const currentSds = pickCurrentSds(subTables.sdsDocuments);
  return {
    currentSds: currentSds ? { id: currentSds.id, version: currentSds.fields[SF.sdsVersion], revisionDate: currentSds.fields[SF.revisionDate], manufacturer: currentSds.fields[SF.manufacturer], physicalForm: currentSds.fields[SF.physicalForm] } : null,
    sdsExpiryStatus: currentSds ? sdsExpiryStatus(currentSds.fields[SF.expiryDate]) : null,
  };
}

// GET /:id/profile — mirrors Machinery's aggregation endpoint (built from the
// same generic framework), keyed by the sub-table names the frontend's
// chemical.module.js config expects: exposureMonitoring, storageInspection,
// labelInspection, wasteManagement, sdsDocuments, training, chra (CHRA reused
// as the risk-assessment tab, same pattern as HIRARC for Machinery),
// substances (Section 3 ingredients). postProcess attaches complianceSummary
// and generalInfo (derived) — see helpers above.
router.get(
  "/:id/profile",
  buildProfileRoute({
    masterTableId: schema.chemicals.tableId,
    masterNameFieldId: schema.chemicals.fields.chemicalName,
    moduleName: "Chemicals",
    logActivity,
    subTables: [
      { key: "exposureMonitoring", tableId: schema.exposureMonitoring.tableId, linkFieldId: schema.exposureMonitoring.fields.chemical },
      { key: "storageInspection", tableId: schema.chemicalStorageInspection.tableId, linkFieldId: schema.chemicalStorageInspection.fields.chemical },
      { key: "labelInspection", tableId: schema.chemicalLabelInspection.tableId, linkFieldId: schema.chemicalLabelInspection.fields.chemical },
      { key: "wasteManagement", tableId: schema.wasteManagement.tableId, linkFieldId: schema.wasteManagement.fields.chemical },
      { key: "sdsDocuments", tableId: schema.sdsDocuments.tableId, linkFieldId: schema.sdsDocuments.fields.chemical },
      { key: "training", tableId: schema.chemicalSafetyTraining.tableId, linkFieldId: schema.chemicalSafetyTraining.fields.chemical },
      { key: "chra", tableId: schema.chra.tableId, linkFieldId: schema.chra.fields.chemicalLink },
      { key: "substances", tableId: schema.substances.tableId, linkFieldId: schema.substances.fields.chemical },
    ],
    postProcess: (result, master) => {
      result.complianceSummary = buildComplianceSummary(master, result.subTables);
      result.generalInfo = buildGeneralInfoDerived(result.subTables);
    },
  })
);

// GET /reports/dosh-register-data — read-only aggregation for the generated
// DOSH Chemical Register report (public/js/pages/chemical.module.js's
// /chemical/dosh-register page). Section A = first Company Settings record;
// Section B = every Chemical plus derived CSDS/Label Y-N flags, which are
// computed here rather than stored, since both already exist elsewhere in
// the system (an SDS Documents record with Status=Current; the most recent
// Chemical Label Inspection's Compliant value) — avoids duplicating data.
//
// Note: this MUST be a 2+ segment path, not e.g. "/dosh-register-data" —
// buildModuleRouter already registered GET "/:id" above, which (being a
// single path segment) would shadow any single-segment GET route added
// after it, since Express matches in registration order. Every other custom
// route in this file avoided that by accident of shape (2+ segments, or a
// different HTTP method); this is the first same-shape GET, so it needs the
// extra segment deliberately.
router.get("/reports/dosh-register-data", async (req, res) => {
  try {
    const CF = schema.chemicals.fields;
    const SF = schema.sdsDocuments.fields;
    const LF = schema.chemicalLabelInspection.fields;
    const CSF = schema.companySettings.fields;

    const [companyRecords, chemicals, sdsDocs, labelInspections] = await Promise.all([
      airtable.listRecords(schema.companySettings.tableId),
      airtable.listRecords(schema.chemicals.tableId),
      airtable.listRecords(schema.sdsDocuments.tableId),
      airtable.listRecords(schema.chemicalLabelInspection.tableId),
    ]);

    const company = companyRecords[0] || null;

    const currentSdsChemicalIds = new Set();
    sdsDocs.forEach((r) => {
      if (r.fields[SF.status] === "Current") {
        (r.fields[SF.chemical] || []).forEach((id) => currentSdsChemicalIds.add(id));
      }
    });

    const latestLabelByChemical = {};
    labelInspections
      .slice()
      .sort((a, b) => new Date(b.fields[LF.inspectionDate] || 0) - new Date(a.fields[LF.inspectionDate] || 0))
      .forEach((r) => {
        (r.fields[LF.chemical] || []).forEach((id) => {
          if (!(id in latestLabelByChemical)) latestLabelByChemical[id] = r.fields[LF.compliant];
        });
      });

    const rows = chemicals.map((r) => ({
      id: r.id,
      chemicalName: r.fields[CF.chemicalName] || "",
      casNumber: r.fields[CF.casNumber] || "",
      storageLocation: r.fields[CF.storageLocation] || "",
      department: r.fields[CF.department] || "",
      process: r.fields[CF.process] || "",
      hazardClassification: r.fields[CF.hazardClassification] || "",
      quantity: r.fields[CF.quantity] || "",
      workersExposed: r.fields[CF.workersExposed] ?? "",
      controlMeasures: r.fields[CF.controlMeasures] || "",
      ppeActuallyUsed: r.fields[CF.ppeActuallyUsed] || "",
      typeOfUse: r.fields[CF.typeOfUse] || "",
      supplier: r.fields[CF.supplier] || "",
      csds: currentSdsChemicalIds.has(r.id) ? "Y" : "N",
      label: latestLabelByChemical[r.id] === "Yes" ? "Y" : latestLabelByChemical[r.id] === "No" ? "N" : "—",
    }));

    res.json({
      company: company
        ? {
            id: company.id,
            companyName: company.fields[CSF.companyName] || "",
            address: company.fields[CSF.address] || "",
            city: company.fields[CSF.city] || "",
            postcode: company.fields[CSF.postcode] || "",
            state: company.fields[CSF.state] || "",
            telephone: company.fields[CSF.telephone] || "",
            email: company.fields[CSF.email] || "",
            doshRegistrationNo: company.fields[CSF.doshRegistrationNo] || "",
            codeOfSector: company.fields[CSF.codeOfSector] || "",
            classOfIndustry: company.fields[CSF.classOfIndustry] || "",
            companyActivity: company.fields[CSF.companyActivity] || [],
          }
        : null,
      rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load DOSH register data." });
  }
});

module.exports = router;
