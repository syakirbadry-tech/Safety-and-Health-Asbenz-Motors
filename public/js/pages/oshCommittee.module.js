// OSH Committee Management — meeting schedule & minutes, built on the
// module framework (master = OSH Committee Meetings). Committee Members is
// a separate roster (not owned by any one meeting — a many-to-many
// relationship the master/sub-table framework doesn't fit), given its own
// small dedicated page (oshCommitteeMembers.js) and linked from here via
// relatedLinks rather than forced into a sub-table shape.

const OSH_COMMITTEE_MODULE = defineBusinessModule({
  key: "oshCommittee",
  basePath: "/osh-committee",
  modulesKey: "oshCommitteeMeetings",
  title: "OSH Committee",
  dashboardTitle: "OSH Committee Dashboard",
  dashboardDesc: "Committee meeting schedule, agenda and minutes for Asbenz Motors.",
  registerLabel: "Meeting Register",
  registerDesc: "Every OSH Committee meeting — scheduled, completed or cancelled.",
  quickAddLabel: "Schedule Meeting",
  parentLabel: "Meeting",
  nameField: "Meeting Reference",
  statusDateField: "Next Meeting Date",
  masterCountLabel: "Total Meetings",

  registerColumns: [
    { key: "ref", label: "Meeting Reference", field: "Meeting Reference", strong: true },
    { key: "date", label: "Meeting Date", field: "Meeting Date", isDate: true },
    { key: "type", label: "Meeting Type", field: "Meeting Type" },
    { key: "status", label: "Status", field: "Status" },
  ],

  generalInfoFields: [
    "Meeting Reference", "Meeting Date", "Meeting Type", "Status", "Chairperson", "Secretary",
    "Attendees", "Next Meeting Date", "Agenda", "Key Decisions / Notes",
  ],
  headerSubtitleFields: ["Meeting Type", "Status"],

  // No sub-tables yet (v1) — a meeting's own fields (agenda, decisions,
  // minutes) are enough; linking specific Actions raised in a meeting back
  // via Actions' own Source Module/Source Reference fields needs no
  // dedicated sub-table wiring.
  subTables: {},
  dashboardSubTabOrder: [],
  profileSubTabs: [],

  documents: {
    label: "Documents",
    fields: [{ label: "Minutes", key: "Minutes" }],
  },
  attachmentsNote: 'To upload signed minutes, use "Edit / Manage Files" above.',

  relatedLinks: [
    { label: "Committee Members", path: "/osh-committee/members" },
    { label: "Print / Export Report", path: "/osh-committee/register-report" },
  ],
});

// ---------------------------------------------------------------------
// OSH Committee Register — print/export report, built on ReportEngine (see
// public/js/pages/chemical.module.js's Chemical Register report for the
// first use of this pattern). Two sections — Meeting Minutes Log, then
// Committee Members Roster — same section-bar pattern as the DOSH
// register's Section A/B, since neither table alone is "the" committee
// register. Portrait; both tables are narrow enough to fit.
// ---------------------------------------------------------------------
const OSH_COMMITTEE_REPORT_VERSION = "v1.0";
const OSH_COMMITTEE_MEETING_ROWS_PER_PAGE = 16;

Router.register("/osh-committee/register-report", async (params, path, isCurrent) => {
  const view = document.getElementById("view");
  const isAdmin = Auth.user()?.role === "Admin";
  view.innerHTML = `<div class="page-loading">Loading…</div>`;

  let data;
  try {
    data = await api("/osh-committee-meetings/reports/register-data");
  } catch (err) {
    if (!isCurrent()) return;
    console.error(err);
    view.innerHTML = Components.emptyState("Could not load the OSH Committee Register data.");
    return;
  }
  if (!isCurrent()) return;

  view.innerHTML = `
    <div class="no-print">${Components.breadcrumb([
      { label: "Dashboard", href: "/" },
      { label: "OSH Committee", href: "/osh-committee" },
      { label: "OSH Committee Register Report" },
    ])}</div>
    <div id="oshCommitteeRegisterReport"></div>
  `;
  renderOshCommitteeRegisterReport(data, isAdmin);
});

function renderOshCommitteeRegisterReport(data, isAdmin) {
  const meetingRows = data.meetingRows || [];
  const memberRows = data.memberRows || [];
  const meetingPages = ReportEngine.paginate(meetingRows, { perPage: OSH_COMMITTEE_MEETING_ROWS_PER_PAGE });
  const documentNumber = `OSHC-REG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const pageCount = meetingPages.length + 1; // +1 for the Members Roster page

  const meetingPagesHtml = meetingPages
    .map((rows, idx) => `
    <section class="report-page">
      ${idx === 0 ? `
      <div class="report-title">OSH COMMITTEE REGISTER</div>
      ${ReportEngine.renderBranding(data.company, { showLogo: true, showStamp: true })}
      ${ReportEngine.renderDocInfo({ documentNumber, reportVersion: OSH_COMMITTEE_REPORT_VERSION, generatedAt: new Date().toISOString() })}
      ` : ""}
      <div class="report-section-head">MEETING MINUTES LOG</div>
      <table class="report-table report-table--compact">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Date</th>
            <th>Type</th>
            <th>Chairperson</th>
            <th>Secretary</th>
            <th>Attendees</th>
            <th>Key Decisions</th>
            <th>Next Meeting</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td>${escapeHtml(r.meetingReference || "—")}</td>
              <td>${escapeHtml(fmtDate(r.meetingDate) || "—")}</td>
              <td>${escapeHtml(r.meetingType || "—")}</td>
              <td>${escapeHtml(r.chairperson || "—")}</td>
              <td>${escapeHtml(r.secretary || "—")}</td>
              <td>${escapeHtml(r.attendees || "—")}</td>
              <td>${escapeHtml(r.keyDecisions || "—")}</td>
              <td>${escapeHtml(fmtDate(r.nextMeetingDate) || "—")}</td>
              <td>${escapeHtml(r.status || "—")}</td>
            </tr>`
            )
            .join("") || `<tr><td colspan="9" class="text-dim">No meetings recorded yet.</td></tr>`}
        </tbody>
      </table>
      ${ReportEngine.pageNumber(idx + 1, pageCount)}
    </section>`)
    .join("");

  const membersPageHtml = `
    <section class="report-page">
      <div class="report-section-head">COMMITTEE MEMBERS ROSTER</div>
      <table class="report-table report-table--compact">
        <thead>
          <tr>
            <th>Member Name</th>
            <th>Position</th>
            <th>Department</th>
            <th>Term Start</th>
            <th>Term End</th>
            <th>Contact</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${memberRows
            .map(
              (r) => `
            <tr>
              <td>${escapeHtml(r.memberName || "—")}</td>
              <td>${escapeHtml(r.position || "—")}</td>
              <td>${escapeHtml(r.department || "—")}</td>
              <td>${escapeHtml(fmtDate(r.termStart) || "—")}</td>
              <td>${escapeHtml(fmtDate(r.termEnd) || "—")}</td>
              <td>${escapeHtml(r.contact || "—")}</td>
              <td>${escapeHtml(r.status || "—")}</td>
            </tr>`
            )
            .join("") || `<tr><td colspan="7" class="text-dim">No committee members recorded yet.</td></tr>`}
        </tbody>
      </table>
      <div class="report-section-head" style="margin-top:14px;">PREPARED / REVIEWED</div>
      ${ReportEngine.renderSignatureBlock(
        {
          preparedByName: data.company?.defaultPreparedByName,
          preparedByTitle: data.company?.defaultPreparedByPosition,
          reviewedByName: data.company?.defaultReviewedByName,
          reviewedByTitle: data.company?.defaultReviewedByPosition,
        },
        "oshcReg"
      )}
      ${ReportEngine.pageNumber(pageCount, pageCount)}
    </section>`;

  document.getElementById("oshCommitteeRegisterReport").innerHTML = `
    <div id="oshCommitteeRegisterToolbar"></div>
    ${meetingPagesHtml}
    ${membersPageHtml}
    <p class="text-dim no-print" style="font-size:11px;margin-top:20px;">Generated ${fmtDateTime(new Date().toISOString())} from live Asbenz Motors EHSMS data.</p>
  `;

  ReportEngine.mountToolbar(document.getElementById("oshCommitteeRegisterToolbar"), {
    editHref: isAdmin ? "/admin.html" : null,
    onPrint: () => window.print(),
    onExportExcel: () => oshCommitteeRegisterExportExcel(data),
  });
}

async function oshCommitteeRegisterExportExcel(data) {
  await ReportEngine.loadExcelJs().catch((err) => {
    toast(err.message, true);
    throw err;
  });

  const wb = new window.ExcelJS.Workbook();

  const meetingsWs = ReportEngine.newWorksheet(wb, "Meeting Minutes Log", { orientation: "landscape" });
  const meetingCols = ["Reference", "Date", "Type", "Chairperson", "Secretary", "Attendees", "Key Decisions", "Next Meeting", "Status"];
  meetingsWs.columns = meetingCols.map(() => ({ width: 18 }));
  ReportEngine.excelHeaderRow(meetingsWs, 1, meetingCols, { freeze: true, repeat: true });
  (data.meetingRows || []).forEach((r, idx) => {
    ReportEngine.excelDataRow(meetingsWs, idx + 2, [
      r.meetingReference, fmtDate(r.meetingDate), r.meetingType, r.chairperson, r.secretary,
      r.attendees, r.keyDecisions, fmtDate(r.nextMeetingDate), r.status,
    ]);
  });

  const membersWs = ReportEngine.newWorksheet(wb, "Members Roster", { orientation: "portrait" });
  const memberCols = ["Member Name", "Position", "Department", "Term Start", "Term End", "Contact", "Status"];
  membersWs.columns = memberCols.map(() => ({ width: 18 }));
  ReportEngine.excelHeaderRow(membersWs, 1, memberCols, { freeze: true, repeat: true });
  (data.memberRows || []).forEach((r, idx) => {
    ReportEngine.excelDataRow(membersWs, idx + 2, [
      r.memberName, r.position, r.department, fmtDate(r.termStart), fmtDate(r.termEnd), r.contact, r.status,
    ]);
  });

  await ReportEngine.downloadWorkbook(wb, `osh-committee-register-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
