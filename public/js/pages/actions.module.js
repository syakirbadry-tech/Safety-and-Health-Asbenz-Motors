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
    printReportPath: "/capa/register-report",
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

// ---------------------------------------------------------------------
// CAPA Register — print/export report, built on ReportEngine (see
// public/js/pages/chemical.module.js's Chemical Register report for the
// first use of this pattern). Landscape — 10 columns. Reached from the
// register page's "Print / Export Report" button (printReportPath above).
// Reuses the existing /actions/reports/register-data endpoint (now also
// returning `company`) rather than a new one — prints every action
// currently in Airtable, not just the on-screen quick-filter's subset.
// ---------------------------------------------------------------------
const CAPA_REGISTER_REPORT_VERSION = "v1.0";
const CAPA_REGISTER_ROWS_PER_PAGE = 14;
const CAPA_REGISTER_ROWS_LAST_PAGE_WITH_SIGNOFF = 10;

Router.register("/capa/register-report", async (params, path, isCurrent) => {
  const view = document.getElementById("view");
  const isAdmin = Auth.user()?.role === "Admin";
  view.innerHTML = `<div class="page-loading">Loading…</div>`;

  let data;
  try {
    data = await api("/actions/reports/register-data");
  } catch (err) {
    if (!isCurrent()) return;
    console.error(err);
    view.innerHTML = Components.emptyState("Could not load the CAPA Register data.");
    return;
  }
  if (!isCurrent()) return;

  view.innerHTML = `
    <div class="no-print">${Components.breadcrumb([
      { label: "Dashboard", href: "/" },
      { label: "Corrective Actions (CAPA)", href: "/capa" },
      { label: "CAPA Register Report" },
    ])}</div>
    <div id="capaRegisterReport"></div>
  `;
  renderCapaRegisterReport(data, isAdmin);
});

function renderCapaRegisterReport(data, isAdmin) {
  const rows = data.rows || [];
  const c = data.company || {};
  const pages = ReportEngine.paginate(rows, {
    perPage: CAPA_REGISTER_ROWS_PER_PAGE,
    lastPageReserve: CAPA_REGISTER_ROWS_LAST_PAGE_WITH_SIGNOFF,
  });
  const documentNumber = ReportEngine.documentNumber(c, "CAPA-REG");
  // Landscape is structural (10 columns), not a preference — always wins
  // over the admin's Default Orientation.
  const pageAttrs = ReportEngine.pageAttrs(c, "landscape");
  const pageAttrsStr = `class="report-page ${pageAttrs.class}" style="${pageAttrs.style}"`;

  const pagesHtml = pages
    .map((pageRows, idx) => {
      const showSignoff = idx === pages.length - 1;
      return `
    <section ${pageAttrsStr}>
      ${ReportEngine.renderWatermark(c)}
      ${ReportEngine.renderConfidentialBanner(c)}
      ${idx === 0 ? `
      <div class="report-title">CORRECTIVE ACTIONS (CAPA) REGISTER</div>
      ${ReportEngine.renderBranding(c)}
      ${ReportEngine.renderDocInfo(c, { documentNumber, reportVersion: CAPA_REGISTER_REPORT_VERSION, generatedAt: new Date().toISOString() })}
      ` : ""}
      <table class="report-table report-table--compact">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Title</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assigned To</th>
            <th>Department</th>
            <th>Due Date</th>
            <th>Completed</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows
            .map(
              (r) => `
            <tr>
              <td>${escapeHtml(r.actionReference || "—")}</td>
              <td>${escapeHtml(r.title || "—")}</td>
              <td>${escapeHtml(r.actionType || "—")}</td>
              <td>${escapeHtml(r.priority || "—")}</td>
              <td>${escapeHtml(r.status || "—")}${r.isOverdue ? " (Overdue)" : ""}</td>
              <td>${escapeHtml(r.assignedTo || "—")}</td>
              <td>${escapeHtml(r.assignedDepartment || "—")}</td>
              <td>${escapeHtml(fmtDate(r.dueDate) || "—")}</td>
              <td>${escapeHtml(fmtDate(r.completedDate) || "—")}</td>
              <td>${escapeHtml([r.sourceModule, r.sourceReference].filter(Boolean).join(" — ") || "—")}</td>
            </tr>`
            )
            .join("") || `<tr><td colspan="10" class="text-dim">No actions raised yet.</td></tr>`}
        </tbody>
      </table>
      ${
        showSignoff
          ? `
      <div class="report-section-head" style="margin-top:14px;">PREPARED / REVIEWED</div>
      ${ReportEngine.renderSignatureBlock(
        {
          preparedByName: c.defaultPreparedByName,
          preparedByTitle: c.defaultPreparedByPosition,
          reviewedByName: c.defaultReviewedByName,
          reviewedByTitle: c.defaultReviewedByPosition,
          approvedByName: c.approvedByName,
          approvedByTitle: c.approvedByPosition,
        },
        "capaReg",
        c
      )}`
          : ""
      }
      ${ReportEngine.renderFooter(c, { pageNum: idx + 1, pageCount: pages.length })}
    </section>`;
    })
    .join("");

  const me = Auth.user();
  document.getElementById("capaRegisterReport").innerHTML = `
    <div id="capaRegisterToolbar"></div>
    ${pagesHtml}
    ${ReportEngine.renderGeneratedNote(c, { generatedBy: me?.fullName || me?.email })}
  `;

  ReportEngine.mountToolbar(document.getElementById("capaRegisterToolbar"), {
    editHref: isAdmin ? "/admin.html" : null,
    onPrint: () => window.print(),
    onExportExcel: () => capaRegisterExportExcel(data),
  });
}

async function capaRegisterExportExcel(data) {
  await ReportEngine.loadExcelJs().catch((err) => {
    toast(err.message, true);
    throw err;
  });

  const rows = data.rows || [];
  const wb = new window.ExcelJS.Workbook();
  const ws = ReportEngine.newWorksheet(wb, "CAPA Register", { orientation: "landscape" });

  const cols = ["Reference", "Title", "Type", "Priority", "Status", "Assigned To", "Department", "Due Date", "Completed", "Source"];
  ws.columns = cols.map(() => ({ width: 18 }));
  ReportEngine.excelHeaderRow(ws, 1, cols, { freeze: true, repeat: true });
  rows.forEach((r, idx) => {
    ReportEngine.excelDataRow(ws, idx + 2, [
      r.actionReference, r.title, r.actionType, r.priority, r.status + (r.isOverdue ? " (Overdue)" : ""),
      r.assignedTo, r.assignedDepartment, fmtDate(r.dueDate), fmtDate(r.completedDate),
      [r.sourceModule, r.sourceReference].filter(Boolean).join(" — "),
    ]);
  });

  await ReportEngine.downloadWorkbook(wb, `capa-register-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
