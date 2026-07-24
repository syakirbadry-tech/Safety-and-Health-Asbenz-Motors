const schema = require("../lib/schema");
const airtable = require("../lib/airtable");
const { buildModuleRouter } = require("../lib/moduleRouter");
const { buildProfileRoute } = require("../lib/profileAggregation");
const { getCompanyProfile } = require("../lib/companyProfile");

// The Corrective Actions/CAPA engine — one table, presented in the UI as a
// single register (default view: Corrective + Preventive; "All Actions" is
// the same register unfiltered — see public/js/pages/actions.module.js).
const router = buildModuleRouter({
  moduleName: "Actions",
  tableId: schema.actions.tableId,
  fields: schema.actions.fields,
  primaryFieldKey: "actionReference",
  attachmentFields: {
    evidence: schema.actions.fields.evidence,
  },
  eventPrefix: "Action",
});

// GET /:id/profile — no sub-tables yet (v1), same shape as every other
// profile route so the module framework's Profile page works unchanged.
router.get(
  "/:id/profile",
  buildProfileRoute({
    masterTableId: schema.actions.tableId,
    masterNameFieldId: schema.actions.fields.actionReference,
    moduleName: "Actions",
    subTables: [],
  })
);

function isOverdue(dueDate, status) {
  if (!dueDate || status === "Completed" || status === "Cancelled") return false;
  return new Date(dueDate) < new Date();
}

// GET /reports/register-data — flat display rows for the Register's
// Filter/Search/Quick-Filter toolbar (registerFilters), with isOverdue
// computed here rather than stored — same "compute, don't duplicate"
// pattern as Chemical Management's SDS expiry status. Must be a 2+ segment
// path — buildModuleRouter above already registered GET "/:id", which would
// otherwise shadow a single-segment GET registered after it.
router.get("/reports/register-data", async (req, res) => {
  try {
    const F = schema.actions.fields;
    const [company, records] = await Promise.all([getCompanyProfile(), airtable.listRecords(schema.actions.tableId)]);
    const rows = records.map((r) => ({
      id: r.id,
      actionReference: r.fields[F.actionReference] || "",
      title: r.fields[F.title] || "",
      actionType: r.fields[F.actionType] || "",
      priority: r.fields[F.priority] || "",
      status: r.fields[F.status] || "",
      assignedTo: r.fields[F.assignedTo] || "",
      assignedDepartment: r.fields[F.assignedDepartment] || "",
      representation: r.fields[F.representation] || "",
      dateRaised: r.fields[F.dateRaised] || "",
      dueDate: r.fields[F.dueDate] || "",
      completedDate: r.fields[F.completedDate] || "",
      sourceModule: r.fields[F.sourceModule] || "",
      sourceReference: r.fields[F.sourceReference] || "",
      isOverdue: isOverdue(r.fields[F.dueDate], r.fields[F.status]),
    }));
    res.json({ rows, company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load the Actions register data." });
  }
});

module.exports = router;
