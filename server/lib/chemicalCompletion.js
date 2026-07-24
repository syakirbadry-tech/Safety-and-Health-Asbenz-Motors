// Single place defining which fields are "mandatory" for a Chemical to count
// as DOSH-register-ready, and scoring a chemical against them. Reused by the
// Chemical Profile page (single-chemical badge + missing-fields checklist),
// the Register list's "Requires Attention" filter, and the dashboard
// completion widgets — see DOSH_REGISTER_FIELD_MAPPING.md and
// ARCHITECTURE.md §5.2.2. Pure function, no Airtable calls of its own —
// callers already have this data from their own aggregation.

// A chemical's Process Usage is "complete" if at least one linked usage
// record (or, for a chemical with none yet, its own flat Chemicals fields)
// has every one of these filled in — matches the DOSH register's own Type
// of Use / Quantity / Workers Exposed / Engineering Control / PPE columns.
function usageIsComplete(usage) {
  if (!usage) return false;
  return !!(
    usage.quantity &&
    usage.workersExposed !== "" &&
    usage.workersExposed != null &&
    usage.controlMeasures &&
    usage.ppeActuallyUsed &&
    usage.typeOfUse
  );
}

function computeChemicalCompletion({ productName, casNumber, hasSds, hazardClassification, storageLocation, supplier, hasCompleteUsage, hasLabelInspection }) {
  const checks = [
    { label: "Product Name", ok: !!productName },
    { label: "CAS Number", ok: !!casNumber },
    { label: "SDS on file", ok: !!hasSds },
    { label: "Hazard Classification", ok: !!hazardClassification },
    { label: "Storage Location", ok: !!storageLocation },
    { label: "Supplier", ok: !!supplier },
    { label: "Process Usage (Quantity/Workers Exposed/Engineering Controls/PPE/Type of Use)", ok: !!hasCompleteUsage },
    { label: "Label Inspection on file", ok: !!hasLabelInspection },
  ];
  const missingFields = checks.filter((c) => !c.ok).map((c) => c.label);
  const complete = checks.length - missingFields.length;
  return {
    percent: Math.round((complete / checks.length) * 100),
    missingFields,
    complete,
    total: checks.length,
    requiresAttention: missingFields.length > 0,
  };
}

module.exports = { computeChemicalCompletion, usageIsComplete };
