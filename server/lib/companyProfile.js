const airtable = require("./airtable");
const schema = require("./schema");

// Single source of truth for turning the one Company Settings record (the
// "Company Profile" module, DATABASE.md §3.10) into the plain-property
// shape every report's /reports/*-data endpoint needs for branding
// (ReportEngine.renderBranding) and sign-off pre-fill
// (ReportEngine.renderSignatureBlock). Centralized here so the fetch-and-
// shape logic isn't repeated per report route the way the DOSH register's
// original inline version was.
async function getCompanyProfile() {
  const CSF = schema.companySettings.fields;
  const records = await airtable.listRecords(schema.companySettings.tableId);
  const company = records[0] || null;
  if (!company) return null;

  return {
    id: company.id,
    companyName: company.fields[CSF.companyName] || "",
    companyRegistrationNo: company.fields[CSF.companyRegistrationNo] || "",
    address: company.fields[CSF.address] || "",
    addressLine2: company.fields[CSF.addressLine2] || "",
    city: company.fields[CSF.city] || "",
    postcode: company.fields[CSF.postcode] || "",
    state: company.fields[CSF.state] || "",
    country: company.fields[CSF.country] || "",
    telephone: company.fields[CSF.telephone] || "",
    email: company.fields[CSF.email] || "",
    website: company.fields[CSF.website] || "",
    doshRegistrationNo: company.fields[CSF.doshRegistrationNo] || "",
    codeOfSector: company.fields[CSF.codeOfSector] || "",
    classOfIndustry: company.fields[CSF.classOfIndustry] || "",
    msicCode: company.fields[CSF.msicCode] || "",
    companyActivity: company.fields[CSF.companyActivity] || [],
    logo: company.fields[CSF.logo] || [],
    stamp: company.fields[CSF.stamp] || [],
    defaultPreparedByName: company.fields[CSF.defaultPreparedByName] || "",
    defaultPreparedByPosition: company.fields[CSF.defaultPreparedByPosition] || "",
    defaultReviewedByName: company.fields[CSF.defaultReviewedByName] || "",
    defaultReviewedByPosition: company.fields[CSF.defaultReviewedByPosition] || "",

    // Central administration expansion (ARCHITECTURE.md §5.7) ---------------
    industry: company.fields[CSF.industry] || "",
    taxNumber: company.fields[CSF.taxNumber] || "",
    description: company.fields[CSF.description] || "",
    watermark: company.fields[CSF.watermark] || [],
    primaryColour: company.fields[CSF.primaryColour] || "",
    secondaryColour: company.fields[CSF.secondaryColour] || "",
    documentPrefix: company.fields[CSF.documentPrefix] || "",
    defaultVersion: company.fields[CSF.defaultVersion] || "",
    documentFooter: company.fields[CSF.documentFooter] || "",
    defaultPaperSize: company.fields[CSF.defaultPaperSize] || "A4",
    // Only honored by reports without a structural column-count
    // requirement — DOSH/Machinery/CAPA stay landscape regardless (see
    // ReportEngine.pageOrientationClass).
    defaultOrientation: company.fields[CSF.defaultOrientation] || "Portrait",
    // Stored only — no translation is implemented; reports stay English-only.
    defaultLanguage: company.fields[CSF.defaultLanguage] || "English",
    companyConfidential: company.fields[CSF.companyConfidential] === "On",
    approvedByName: company.fields[CSF.approvedByName] || "",
    approvedByPosition: company.fields[CSF.approvedByPosition] || "",
    signatures: {
      prepared: company.fields[CSF.preparedBySignature] || [],
      reviewed: company.fields[CSF.reviewedBySignature] || [],
      approved: company.fields[CSF.approvedBySignature] || [],
    },
    // Every value below defaults to "on" when the field has never been
    // touched (Airtable's API can't distinguish an unchecked checkbox from
    // an untouched one, so these are select fields — see schema.js) —
    // nothing already-shipped changes in appearance until an admin
    // actively picks "Hide" for something.
    exportSettings: {
      showLogo: company.fields[CSF.showLogo] !== "Hide",
      showStamp: company.fields[CSF.showStamp] !== "Hide",
      showFooter: company.fields[CSF.showFooter] !== "Hide",
      showPageNumbers: company.fields[CSF.showPageNumbers] !== "Hide",
      showGeneratedDate: company.fields[CSF.showGeneratedDate] !== "Hide",
      showGeneratedTime: company.fields[CSF.showGeneratedTime] !== "Hide",
      showGeneratedBy: company.fields[CSF.showGeneratedBy] !== "Hide",
      repeatTableHeaders: company.fields[CSF.repeatTableHeaders] !== "Don't Repeat",
      showDocumentVersion: company.fields[CSF.showDocumentVersion] !== "Hide",
      showDocumentNumber: company.fields[CSF.showDocumentNumber] !== "Hide",
    },
  };
}

module.exports = { getCompanyProfile };
