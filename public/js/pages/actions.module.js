// Corrective Actions / CAPA — one unified Actions table (server/routes/
// actions.js), presented as a single register. The default view is CAPA
// (Corrective + Preventive, quickFilters[0] below); "All Actions" is the
// same register unfiltered — what would otherwise be a separate "Action
// Tracking" module is just another quick-filter chip here, per the user's
// explicit "one engine, one UI surface" decision. Built entirely on the
// module framework — no registerColumns needed since registerFilters fully
// replaces the plain Register page renderer.

const ACTION_MODULE = defineBusinessModule({
  key: "capa",
  basePath: "/capa",
  modulesKey: "actions",
  title: "Corrective Actions (CAPA)",
  dashboardTitle: "Corrective Actions (CAPA) Dashboard",
  dashboardDesc: "Corrective and preventive actions raised across every module, tracked to closure.",
  registerLabel: "Corrective Actions Register",
  registerDesc: "Every action raised across Asbenz Motors — corrective, preventive, or general — tracked to closure.",
  quickAddLabel: "Add Action",
  parentLabel: "Action",
  nameField: "Title",
  masterCountLabel: "Total Actions",

  generalInfoFields: [
    "Title", "Action Reference", "Action Type", "Priority", "Status", "Date Raised", "Due Date", "Completed Date",
    "Assigned To", "Assigned Department", "Representation", "Source Module", "Source Reference",
    "Description", "Root Cause", "Corrective/Preventive Measures", "Effectiveness Review", "Verified Effective", "Notes",
  ],
  headerSubtitleFields: ["Action Type", "Status"],

  // No sub-tables yet (v1) — an Action is atomic: root cause, measures,
  // effectiveness review and evidence all live on the record itself.
  subTables: {},
  dashboardSubTabOrder: [],
  profileSubTabs: [],

  documents: {
    label: "Documents",
    fields: [{ label: "Evidence", key: "Evidence" }],
  },
  attachmentsNote: 'To upload closure evidence, use "Edit / Manage Files" above.',

  // "Open"/"Overdue Actions" don't fit the generic per-sub-table KPI shape
  // (no sub-tables here at all — Actions has no sub-table to read from, so
  // this reads the master list moduleFramework.js's extraOverviewKpis hook
  // passes as its second argument) — same time-based "compute, don't store"
  // pattern as Chemical Management's "Expired SDS".
  extraOverviewKpis: (dataByKey, masters) => {
    const F = MODULES.actions.fields;
    const openCount = masters.filter((r) => !["Completed", "Cancelled"].includes(r.fields[F.Status])).length;
    const overdueCount = masters.filter((r) => {
      const due = r.fields[F["Due Date"]];
      const status = r.fields[F.Status];
      return due && !["Completed", "Cancelled"].includes(status) && new Date(due) < new Date();
    }).length;
    return [
      { label: "Open Actions", value: openCount, tone: openCount ? "warn" : "ok", navigate: `${ACTION_MODULE.basePath}/register` },
      { label: "Overdue Actions", value: overdueCount, tone: overdueCount ? "bad" : "ok", navigate: `${ACTION_MODULE.basePath}/register` },
    ];
  },

  registerFilters: {
    dataEndpoint: "/actions/reports/register-data",
    rowsKey: "rows",
    columns: [
      { key: "title", label: "Title", strong: true },
      { key: "actionType", label: "Type" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status", pill: true },
      { key: "assignedTo", label: "Assigned To" },
      { key: "assignedDepartment", label: "Department" },
      { key: "dueDate", label: "Due Date", render: (row) => row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }) : "—" },
      { key: "sourceModule", label: "Source", render: (row) => escapeHtml(row.sourceModule || "—") },
    ],
    searchFields: ["title", "assignedTo", "assignedDepartment", "sourceReference", "actionReference"],
    dropdownFilters: [
      { key: "actionType", label: "Action Type" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
      { key: "sourceModule", label: "Source Module" },
      { key: "assignedDepartment", label: "Department" },
      { key: "representation", label: "Representation" },
    ],
    // First entry is the default view (mountFwRegisterFilters defaults to
    // quickFilters[0]) — CAPA (Corrective + Preventive) is the primary
    // brand per the user's decision; "All Actions" broadens it.
    quickFilters: [
      { key: "capa", label: "CAPA", predicate: (r) => r.actionType === "Corrective" || r.actionType === "Preventive" },
      { key: "all", label: "All Actions", predicate: () => true },
      { key: "corrective", label: "Corrective", predicate: (r) => r.actionType === "Corrective" },
      { key: "preventive", label: "Preventive", predicate: (r) => r.actionType === "Preventive" },
      { key: "overdue", label: "Overdue", predicate: (r) => r.isOverdue },
      { key: "completed", label: "Completed", predicate: (r) => r.status === "Completed" },
    ],
  },
});
