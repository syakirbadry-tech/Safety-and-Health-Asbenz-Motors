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
  };
}

module.exports = { getCompanyProfile };
