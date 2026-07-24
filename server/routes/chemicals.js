const multer = require("multer");
const schema = require("../lib/schema");
const airtable = require("../lib/airtable");
const { buildModuleRouter } = require("../lib/moduleRouter");
const { buildProfileRoute } = require("../lib/profileAggregation");
const { extractSDSData } = require("../lib/extract");
const { logActivity } = require("../lib/activity");
const { getCompanyProfile } = require("../lib/companyProfile");

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

// Every attachment field that can hold a document for a chemical, across the
// master record and every linked sub-table — the data source for the
// centralized Documents tab (moduleFramework's documents: { mode:
// "aggregated" }). Nothing is re-uploaded or duplicated here: files stay
// attached to their original record/field, this only flattens references.
function buildDocumentsList(master, subTables) {
  const docs = [];
  const CF = schema.chemicals.fields;

  function addFrom(records, fieldId, sourceModule, sourceLabel, primaryFieldId) {
    (records || []).forEach((r) => {
      (r.fields[fieldId] || []).forEach((att) => {
        docs.push({
          id: att.id,
          filename: att.filename,
          url: att.url,
          size: att.size,
          contentType: att.type,
          sourceModule,
          sourceLabel,
          sourceRecordId: r.id,
          sourceRecordLabel: primaryFieldId ? r.fields[primaryFieldId] || r.id : r.id,
          uploadedTime: r.createdTime,
        });
      });
    });
  }

  addFrom([master], CF.sds, "Chemical", "SDS (legacy field)");
  addFrom([master], CF.photos, "Chemical", "Photos");
  addFrom(subTables.sdsDocuments, schema.sdsDocuments.fields.sdsFile, "SDS", "SDS File", schema.sdsDocuments.fields.sdsReference);
  addFrom(subTables.storageInspection, schema.chemicalStorageInspection.fields.attachment, "Storage Inspection", "Attachment", schema.chemicalStorageInspection.fields.inspectionReference);
  addFrom(subTables.labelInspection, schema.chemicalLabelInspection.fields.attachment, "Label Inspection", "Photo", schema.chemicalLabelInspection.fields.inspectionReference);
  addFrom(subTables.wasteManagement, schema.wasteManagement.fields.manifest, "Waste Management", "Consignment Note", schema.wasteManagement.fields.disposalReference);
  addFrom(subTables.wasteManagement, schema.wasteManagement.fields.disposalCertificate, "Waste Management", "Disposal Certificate", schema.wasteManagement.fields.disposalReference);
  addFrom(subTables.training, schema.chemicalSafetyTraining.fields.attachment, "Training", "Certificate", schema.chemicalSafetyTraining.fields.trainingReference);
  addFrom(subTables.chra, schema.chra.fields.document, "CHRA", "Report", schema.chra.fields.referenceNo);
  addFrom(subTables.chra, schema.chra.fields.sds, "CHRA", "SDS Attachment", schema.chra.fields.referenceNo);

  return docs;
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
// substances (Section 3 ingredients). postProcess attaches complianceSummary,
// documents (aggregated) and generalInfo (derived) — see helpers above.
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
      { key: "processUsage", tableId: schema.chemicalProcessUsage.tableId, linkFieldId: schema.chemicalProcessUsage.fields.chemical },
    ],
    postProcess: (result, master) => {
      result.complianceSummary = buildComplianceSummary(master, result.subTables);
      result.documents = buildDocumentsList(master, result.subTables);
      result.generalInfo = buildGeneralInfoDerived(result.subTables);
    },
  })
);

// GET /reports/register-data — one aggregated call for the Register page,
// its Filter/Search/Quick-Filter toolbar, and the Master-Detail Cockpit's
// left pane: every chemical plus derived fields (Manufacturer, Physical
// Form, time-based SDS status, current-SDS record id for the "View SDS"
// click) — same aggregation style as /reports/dosh-register-data below,
// avoiding an N+1 fetch in the browser.
//
// Must be a 2+ segment path, not "/register-data" — buildModuleRouter above
// already registered GET "/:id", which (being a single path segment) would
// shadow a single-segment GET registered after it, since Express matches in
// registration order. Same trap /reports/dosh-register-data documents below.
router.get("/reports/register-data", async (req, res) => {
  try {
    const CF = schema.chemicals.fields;
    const SF = schema.sdsDocuments.fields;

    const [company, chemicals, sdsDocs] = await Promise.all([
      getCompanyProfile(),
      airtable.listRecords(schema.chemicals.tableId),
      airtable.listRecords(schema.sdsDocuments.tableId),
    ]);

    const sdsByChemical = {};
    sdsDocs.forEach((r) => {
      (r.fields[SF.chemical] || []).forEach((id) => {
        if (!sdsByChemical[id]) sdsByChemical[id] = [];
        sdsByChemical[id].push(r);
      });
    });

    const rows = chemicals.map((r) => {
      const currentSds = pickCurrentSds(sdsByChemical[r.id]);
      return {
        id: r.id,
        productName: r.fields[CF.chemicalName] || "",
        productCode: r.fields[CF.internalCode] || "",
        casNumber: r.fields[CF.casNumber] || "",
        supplier: r.fields[CF.supplier] || "",
        manufacturer: currentSds?.fields[SF.manufacturer] || "",
        storageLocation: r.fields[CF.storageLocation] || "",
        hazardClassification: r.fields[CF.hazardClassification] || "",
        physicalForm: currentSds?.fields[SF.physicalForm] || "",
        currentSdsId: currentSds?.id || null,
        sdsStatus: currentSds ? sdsExpiryStatus(currentSds.fields[SF.expiryDate]) : "Missing",
      };
    });

    // `company` is additive (existing consumers — the Register page's
    // registerFilters and the Master-Detail Cockpit — only read `rows`) and
    // powers the Chemical Register print report's branding block.
    res.json({ rows, company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load chemical register data." });
  }
});

// "Type" codes per the official DOSH "Guidelines for the Preparation of a
// Chemical Register" (Appendix 1, item f — "USAGE OF CHEMICAL: TYPE"),
// verbatim from Docs/Regulations/chemical registered list - Copy.pdf. Maps
// directly onto the existing Chemicals.typeOfUse select options (DATABASE.md
// §3.4.2) — this is a display-layer lookup, not a stored field.
const DOSH_TYPE_OF_USE_CODES = {
  "Raw Material": "R",
  Product: "P",
  "By-product": "B",
  "Intermediate-product": "I",
  Stored: "S",
  Waste: "W",
  Cleaning: "C",
  Degreasing: "D",
  Other: "O",
};

// GET /reports/dosh-register-data — read-only aggregation for the generated
// DOSH Chemical Register report (public/js/pages/chemical.module.js's
// /chemical/dosh-register page). Section A = first Company Settings record;
// Section B = one row per Substance linked to each Chemical (a Chemical with
// no linked Substances still gets exactly one row, so it's never silently
// dropped from a legally-required register), repeating every chemical-level
// field. CSDS/Label/Type/Class are all derived here rather than stored —
// CSDS and Label already existed; Type and Class were added per the real
// guideline (not the 3 fabricated fields an earlier draft proposed — see
// DOSH_REGISTER_FIELD_MAPPING.md): Type is Chemicals.typeOfUse's own code
// letter (above), Class is Chemicals.hazardClassification verbatim, or "NA"
// per the guideline's own instruction ("if classified using other
// classification system, please enter NA") when hazardClassification isn't
// set. There is no separate "Complies with CPL 1997" field — the guideline's
// "Comply with Classification, Packaging and Labelling Regulation, 1997"
// section IS just CSDS + Class + Label together, not a fourth column.
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
    const SUBF = schema.substances.fields;

    const [companyProfile, chemicals, sdsDocs, labelInspections, substances] = await Promise.all([
      getCompanyProfile(),
      airtable.listRecords(schema.chemicals.tableId),
      airtable.listRecords(schema.sdsDocuments.tableId),
      airtable.listRecords(schema.chemicalLabelInspection.tableId),
      airtable.listRecords(schema.substances.tableId),
    ]);

    const currentSdsChemicalIds = new Set();
    const sdsByChemical = {};
    sdsDocs.forEach((r) => {
      (r.fields[SF.chemical] || []).forEach((id) => {
        if (!sdsByChemical[id]) sdsByChemical[id] = [];
        sdsByChemical[id].push(r);
      });
      if (r.fields[SF.status] === "Current") {
        (r.fields[SF.chemical] || []).forEach((id) => currentSdsChemicalIds.add(id));
      }
    });
    // Physical Form comes from the most recent SDS revision (any status),
    // distinct from the CSDS flag above (which only counts Status=Current).
    function latestSdsFor(chemicalId) {
      const list = sdsByChemical[chemicalId] || [];
      if (!list.length) return null;
      return list.slice().sort((a, b) => new Date(b.fields[SF.revisionDate] || 0) - new Date(a.fields[SF.revisionDate] || 0))[0];
    }

    const latestLabelByChemical = {};
    labelInspections
      .slice()
      .sort((a, b) => new Date(b.fields[LF.inspectionDate] || 0) - new Date(a.fields[LF.inspectionDate] || 0))
      .forEach((r) => {
        (r.fields[LF.chemical] || []).forEach((id) => {
          if (!(id in latestLabelByChemical)) latestLabelByChemical[id] = r.fields[LF.compliant];
        });
      });

    const substancesByChemical = {};
    substances.forEach((r) => {
      (r.fields[SUBF.chemical] || []).forEach((id) => {
        if (!substancesByChemical[id]) substancesByChemical[id] = [];
        substancesByChemical[id].push(r);
      });
    });

    const rows = [];
    chemicals.forEach((r) => {
      const latestSds = latestSdsFor(r.id);
      const shared = {
        chemicalId: r.id,
        productName: r.fields[CF.chemicalName] || "", // display name "Product Name" — see schema.js comment
        physicalForm: latestSds?.fields[SF.physicalForm] || "",
        storageLocation: r.fields[CF.storageLocation] || "",
        department: r.fields[CF.department] || "",
        process: r.fields[CF.process] || "",
        quantity: r.fields[CF.quantity] || "",
        workersExposed: r.fields[CF.workersExposed] ?? "",
        controlMeasures: r.fields[CF.controlMeasures] || "",
        ppeActuallyUsed: r.fields[CF.ppeActuallyUsed] || "",
        typeOfUse: r.fields[CF.typeOfUse] || "",
        typeCode: DOSH_TYPE_OF_USE_CODES[r.fields[CF.typeOfUse]] || "—",
        hazardClass: r.fields[CF.hazardClassification] || "NA",
        supplier: r.fields[CF.supplier] || "",
        csds: currentSdsChemicalIds.has(r.id) ? "Y" : "N",
        label: latestLabelByChemical[r.id] === "Yes" ? "Y" : latestLabelByChemical[r.id] === "No" ? "N" : "—",
      };

      const subs = substancesByChemical[r.id] || [];
      if (!subs.length) {
        // No linked Substances yet — still emit one row so the chemical
        // isn't silently missing from the register; fall back to the
        // chemical's own CAS Number the way the pre-Substances report did.
        rows.push({
          ...shared,
          chemicalName: "",
          casNumber: r.fields[CF.casNumber] || "",
          activeIngredients: "",
        });
      } else {
        subs.forEach((s) => {
          const concentration = s.fields[SUBF.concentration];
          const name = s.fields[SUBF.chemicalName] || "";
          rows.push({
            ...shared,
            chemicalName: name,
            casNumber: s.fields[SUBF.casNumber] || "",
            activeIngredients: name ? `${name}${concentration ? ` (${concentration})` : ""}` : "",
          });
        });
      }
    });

    res.json({
      company: companyProfile
        ? {
            id: companyProfile.id,
            companyName: companyProfile.companyName,
            // Section A's single "Address" line = Company Profile's Address
            // Line 1 + Line 2 (the guideline's form has one address line;
            // the Company Profile module — v2.1 — splits it into two for a
            // more standard general-purpose address form).
            address: [companyProfile.address, companyProfile.addressLine2].filter(Boolean).join(", "),
            city: companyProfile.city,
            postcode: companyProfile.postcode,
            state: companyProfile.state,
            telephone: companyProfile.telephone,
            email: companyProfile.email,
            doshRegistrationNo: companyProfile.doshRegistrationNo,
            codeOfSector: companyProfile.codeOfSector,
            classOfIndustry: companyProfile.classOfIndustry,
            companyActivity: companyProfile.companyActivity,
            // Report Defaults (Company Profile, v2.1) — pre-fill Section C,
            // still editable per generation, never forced.
            defaultPreparedByName: companyProfile.defaultPreparedByName,
            defaultPreparedByPosition: companyProfile.defaultPreparedByPosition,
            defaultReviewedByName: companyProfile.defaultReviewedByName,
            defaultReviewedByPosition: companyProfile.defaultReviewedByPosition,
          }
        : null,
      rows,
      chemicalCount: chemicals.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load DOSH register data." });
  }
});

module.exports = router;
