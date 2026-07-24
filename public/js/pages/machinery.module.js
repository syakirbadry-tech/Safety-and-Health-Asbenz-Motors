// Machinery module definition — the reference implementation of the generic
// module framework (public/js/framework/moduleFramework.js). Everything
// about the Machinery Dashboard/Register/Profile pages that used to be
// hand-written across machineryDashboard.js/machineryRegister.js/
// machineryProfile.js now lives here as data; the framework turns it into
// the full set of pages. A new module (e.g. Chemical Management) should only
// need a file shaped like this one.

const MACHINERY_MODULE = defineBusinessModule({
  key: "machinery",
  basePath: "/machinery",
  modulesKey: "machinery", // MODULES.machinery — reused for master CRUD via openRecordForm (incl. AI license-extract)
  title: "Machinery",
  dashboardTitle: "Machinery Dashboard",
  dashboardDesc: "Asset register, maintenance, certification and inspection status for all workshop machinery.",
  registerLabel: "Machine Register",
  registerDesc: "Every machine tracked by Asbenz Motors, with next-inspection status at a glance.",
  quickAddLabel: "Add Machine",
  parentLabel: "Machine",
  nameField: "Machine Name",
  statusDateField: "Next Inspection Due",
  masterCountLabel: "Registered Machines",
  masterCountLabelReports: "Total Machines",
  relatedLinks: [{ label: "Print / Export Report", path: "/machinery/register-report" }],

  registerColumns: [
    { key: "name", label: "Machine Name", field: "Machine Name", strong: true },
    { key: "location", label: "Location", field: "Location" },
    { key: "responsible", label: "Responsible Person", field: "Responsible Person (PIC)" },
    { key: "nextInspection", label: "Next Inspection Due", field: "Next Inspection Due", isDate: true },
  ],

  generalInfoFields: [
    "Machine Name", "Asset Tag", "Category", "Location", "Operational Status",
    "Responsible Person (PIC)", "Serial Number", "Last Inspection Date",
    "Next Inspection Due", "License Expiry Date", "DOSH Certificate No",
    "Country of Origin / Manufacturer", "Notes",
  ],
  headerSubtitleFields: ["Location", "Asset Tag"],

  dashboardSubTabOrder: ["cf", "pm", "cm", "inspection", "calibration"],

  subTables: {
    cf: {
      title: "Certificates of Fitness",
      api: "/machinery-cf",
      primary: "cfNo",
      parentFieldKey: "machine",
      fields: {
        cfNo: "fldYPRrvQrnsqjXc1",
        machine: "fldW0YUD7P1WNq33i",
        issuedDate: "fldztQ8M3Q2fDjvQW",
        expiryDate: "fldIYNCr9MbesRm9q",
        issuingAuthority: "fldRb0FrnetPoNaaO",
        status: "fldcGv9gfhyIxV4Vu",
        certificate: "fldibflKowaGsZAgH",
        notes: "fldjpwjNNA612WtLg",
      },
      formMeta: {
        labels: { cfNo: "CF No", issuedDate: "Issued Date", expiryDate: "Expiry Date", issuingAuthority: "Issuing Authority", status: "Status", notes: "Notes" },
        dateKeys: ["issuedDate", "expiryDate"],
        selectOptions: { status: ["Valid", "Expiring Soon", "Expired"] },
        textareaKeys: ["notes"],
        attachmentKey: "certificate",
        attachmentLabel: "Certificate",
      },
      listColumns: ["issuedDate", "expiryDate", "status"],
      dueField: "expiryDate",
      dueSoonLabel: "CF Expiring/Expired",
      overdueLabel: "Expired CF Certificates",
    },
    pm: {
      title: "Preventive Maintenance",
      api: "/preventive-maintenance",
      primary: "pmReference",
      parentFieldKey: "machine",
      fields: {
        pmReference: "fldVicxSFN1Oz8bHe",
        machine: "fldro4Jb6Sd4PUQqB",
        pmType: "fldkfVzyaqYJpL3vL",
        scheduledDate: "fld1kUDkYL7lAq5yi",
        completedDate: "flduTf5nEeOfZMVxb",
        performedBy: "fld8muHHuiWmZUxFd",
        status: "fldjrCBAtGGHKa580",
        checklistNotes: "flddpxK6EHv0YdJcf",
        attachment: "fld1Ct6NScdju81ak",
      },
      formMeta: {
        labels: { pmReference: "PM Reference", pmType: "PM Type", scheduledDate: "Scheduled Date", completedDate: "Completed Date", performedBy: "Performed By", status: "Status", checklistNotes: "Checklist Notes" },
        dateKeys: ["scheduledDate", "completedDate"],
        selectOptions: { pmType: ["Daily", "Weekly", "Monthly", "Quarterly", "Annual"], status: ["Scheduled", "Completed", "Overdue"] },
        textareaKeys: ["checklistNotes"],
        attachmentKey: "attachment",
        attachmentLabel: "Attachment",
      },
      listColumns: ["pmType", "scheduledDate", "status"],
      countLabel: "PM Logged",
    },
    cm: {
      title: "Corrective Maintenance",
      api: "/corrective-maintenance",
      primary: "cmReference",
      parentFieldKey: "machine",
      fields: {
        cmReference: "fldAdlnYWXslINOxA",
        machine: "fldEz0SpymLftKzSo",
        faultDescription: "fldB1I81xTxTdab95",
        dateReported: "fldSYbtyqOPFvZrZB",
        dateResolved: "fldCKIF3kZo490hVf",
        performedBy: "fldZclQEzoCjVKxRk",
        status: "fldZ9pWtU9qzY9ld2",
        cost: "fldAuonAmNsniWyKG",
        attachment: "fldaUDi4iFUaFytea",
      },
      formMeta: {
        labels: { cmReference: "CM Reference", faultDescription: "Fault Description", dateReported: "Date Reported", dateResolved: "Date Resolved", performedBy: "Performed By", status: "Status", cost: "Cost (RM)" },
        dateKeys: ["dateReported", "dateResolved"],
        selectOptions: { status: ["Open", "In Progress", "Resolved"] },
        textareaKeys: ["faultDescription"],
        numberKeys: ["cost"],
        attachmentKey: "attachment",
        attachmentLabel: "Attachment",
      },
      listColumns: [{ key: "faultDescription", truncate: 60 }, "dateReported", "status"],
      openStatusField: "status",
      openValues: ["Open", "In Progress"],
      openLabel: "Open Corrective Maintenance",
    },
    inspection: {
      title: "Inspection",
      api: "/machinery-inspection",
      primary: "inspectionReference",
      parentFieldKey: "machine",
      fields: {
        inspectionReference: "fldvGHvWcDGWtE5oo",
        machine: "fldtws7fmnbmGSIa4",
        inspectionDate: "fldPCRSl8MNvicYMh",
        inspector: "fldylmRbOirpV5njf",
        result: "fldzZQp1rDHwMzl3J",
        findings: "fldHz2LNranWei0cu",
        nextDue: "fldZPH2pvpRfUUM2V",
        attachment: "fld27CstJbn1xRJ7Q",
      },
      formMeta: {
        labels: { inspectionReference: "Inspection Reference", inspectionDate: "Inspection Date", inspector: "Inspector", result: "Result", findings: "Findings", nextDue: "Next Due" },
        dateKeys: ["inspectionDate", "nextDue"],
        selectOptions: { result: ["Pass", "Conditional Pass", "Fail"] },
        textareaKeys: ["findings"],
        attachmentKey: "attachment",
        attachmentLabel: "Attachment",
      },
      listColumns: ["inspectionDate", "result", "nextDue"],
      dueField: "nextDue",
      dueSoonLabel: "Inspections Due (30d)",
      overdueLabel: "Overdue Inspections",
    },
    calibration: {
      title: "Calibration",
      api: "/calibration-records",
      primary: "equipmentName",
      parentFieldKey: "machine",
      fields: {
        equipmentName: "fldba7itmRcbkjko9",
        equipmentType: "fld66q4tmGJYsJFVL",
        machine: "fldq4gystGfrChCAO",
        calibrationDate: "fldnMZVZaq5wrxog3",
        nextDue: "fld4u9dRM9VmSSgbp",
        calibratedBy: "fldsaZ0MEODOtEqnU",
        status: "fld2iJqUgdxOrSnoa",
        certificate: "fldX51br3yaO257Jn",
      },
      formMeta: {
        labels: { equipmentName: "Equipment Name", equipmentType: "Equipment Type", calibrationDate: "Calibration Date", nextDue: "Next Due", calibratedBy: "Calibrated By", status: "Status" },
        dateKeys: ["calibrationDate", "nextDue"],
        selectOptions: { equipmentType: ["Machine Instrument", "Noise Meter", "Other"], status: ["Valid", "Due Soon", "Expired"] },
        textareaKeys: [],
        attachmentKey: "certificate",
        attachmentLabel: "Certificate",
      },
      listColumns: ["equipmentType", "nextDue", "status"],
      dueField: "nextDue",
      dueSoonLabel: "Calibrations Due (30d)",
      overdueLabel: "Overdue Calibrations",
    },
  },

  // Machine Profile merges PM + CM into one "Maintenance History" timeline
  // (Dashboard still shows them as separate tabs — see dashboardSubTabOrder).
  historyTab: {
    key: "maintenance",
    label: "Maintenance History",
    combine: [
      { subKey: "pm", typeLabel: "Preventive", dateKey: "scheduledDate" },
      { subKey: "cm", typeLabel: "Corrective", dateKey: "dateReported" },
    ],
  },

  // CF and Inspection get their own Profile tab as-is; CM appears as "Repair
  // History" there (in addition to being part of the merged history above).
  profileSubTabs: [
    { subKey: "cf", tabKey: "cf", label: "CF Certificate", emptyNoun: "CF certificates" },
    { subKey: "inspection", tabKey: "inspection", label: "Inspection History", emptyNoun: "inspections" },
    { subKey: "cm", tabKey: "repair", label: "Repair History", emptyNoun: "repairs" },
  ],

  // Risk Assessment reuses the existing HIRARC table — not duplicated.
  riskAssessment: {
    label: "Risk Assessment",
    api: "/hirarc",
    parentFieldKey: "machinery",
    profileSourceKey: "hirarc",
    primary: "referenceNo",
    fields: MODULES_SCHEMA.hirarc.fields,
    labels: { referenceNo: "Reference No", riskRating: "Risk Rating", assessor: "Assessor", reviewDueDate: "Review Due" },
    listColumns: ["riskRating", "assessor", "reviewDueDate"],
    dateKeys: ["reviewDueDate"],
    selectFields: ["riskRating"],
  },

  photos: { fieldKey: "Photos", uploadKey: "photos" },

  documents: {
    label: "Documents",
    fields: [
      { label: "License Document", key: "License Document" },
      { label: "Service History", key: "Service History" },
      { label: "Photos", key: "Photos" },
    ],
  },

  attachmentsNote: 'To upload or replace files (including AI auto-fill from a license document), use "Edit / Manage Files" above.',
});

// Backend profile aggregation expects sub-table results under these exact
// keys ("cf", "pm", "cm", "inspection", "calibration", "hirarc") — see
// server/routes/machinery.js's buildProfileRoute call, which must stay in
// sync with the subTables/riskAssessment keys above.

// ---------------------------------------------------------------------
// Machinery Register — print/export report, built on ReportEngine (see
// public/js/pages/chemical.module.js's Chemical Register report for the
// first use of this pattern). Landscape — 11 columns doesn't fit A4
// portrait cleanly. Reached from the Machinery Dashboard's "Print / Export
// Report" quick-action (relatedLinks above), since Machinery uses the
// plain registerColumns register (no Filter/Search toolbar to hang a
// printReportPath button off, unlike Chemical/CAPA's registerFilters).
// ---------------------------------------------------------------------
const MACHINERY_REGISTER_REPORT_VERSION = "v1.0";
const MACHINERY_REGISTER_ROWS_PER_PAGE = 14;
const MACHINERY_REGISTER_ROWS_LAST_PAGE_WITH_SIGNOFF = 10;

Router.register("/machinery/register-report", async (params, path, isCurrent) => {
  const view = document.getElementById("view");
  const isAdmin = Auth.user()?.role === "Admin";
  view.innerHTML = `<div class="page-loading">Loading…</div>`;

  let data;
  try {
    data = await api("/machinery/reports/register-data");
  } catch (err) {
    if (!isCurrent()) return;
    console.error(err);
    view.innerHTML = Components.emptyState("Could not load the Machinery Register data.");
    return;
  }
  if (!isCurrent()) return;

  view.innerHTML = `
    <div class="no-print">${Components.breadcrumb([
      { label: "Dashboard", href: "/" },
      { label: "Machinery", href: "/machinery" },
      { label: "Machinery Register Report" },
    ])}</div>
    <div id="machineryRegisterReport"></div>
  `;
  renderMachineryRegisterReport(data, isAdmin);
});

function renderMachineryRegisterReport(data, isAdmin) {
  const rows = data.rows || [];
  const pages = ReportEngine.paginate(rows, {
    perPage: MACHINERY_REGISTER_ROWS_PER_PAGE,
    lastPageReserve: MACHINERY_REGISTER_ROWS_LAST_PAGE_WITH_SIGNOFF,
  });
  const documentNumber = `MACH-REG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

  const pagesHtml = pages
    .map((pageRows, idx) => {
      const showSignoff = idx === pages.length - 1;
      return `
    <section class="report-page report-page--landscape">
      ${idx === 0 ? `
      <div class="report-title">MACHINERY REGISTER</div>
      ${ReportEngine.renderBranding(data.company, { showLogo: true, showStamp: true })}
      ${ReportEngine.renderDocInfo({ documentNumber, reportVersion: MACHINERY_REGISTER_REPORT_VERSION, generatedAt: new Date().toISOString() })}
      ` : ""}
      <table class="report-table report-table--compact">
        <thead>
          <tr>
            <th>Machine Name</th>
            <th>Asset Tag</th>
            <th>Category</th>
            <th>Location</th>
            <th>Operational Status</th>
            <th>Responsible Person</th>
            <th>Last Inspection</th>
            <th>Next Inspection Due</th>
            <th>DOSH Cert No.</th>
            <th>Compliance Status</th>
            <th>License Expiry</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows
            .map(
              (r) => `
            <tr>
              <td>${escapeHtml(r.machineName || "—")}</td>
              <td>${escapeHtml(r.assetTag || "—")}</td>
              <td>${escapeHtml(r.category || "—")}</td>
              <td>${escapeHtml(r.location || "—")}</td>
              <td>${escapeHtml(r.operationalStatus || "—")}</td>
              <td>${escapeHtml(r.responsiblePerson || "—")}</td>
              <td>${escapeHtml(fmtDate(r.lastInspectionDate) || "—")}</td>
              <td>${escapeHtml(fmtDate(r.nextInspectionDue) || "—")}</td>
              <td>${escapeHtml(r.doshCertNo || "—")}</td>
              <td>${escapeHtml(r.complianceStatus || "—")}</td>
              <td>${escapeHtml(fmtDate(r.licenseExpiryDate) || "—")}</td>
            </tr>`
            )
            .join("") || `<tr><td colspan="11" class="text-dim">No machinery registered yet.</td></tr>`}
        </tbody>
      </table>
      ${
        showSignoff
          ? `
      <div class="report-section-head" style="margin-top:14px;">PREPARED / REVIEWED</div>
      ${ReportEngine.renderSignatureBlock(
        {
          preparedByName: data.company?.defaultPreparedByName,
          preparedByTitle: data.company?.defaultPreparedByPosition,
          reviewedByName: data.company?.defaultReviewedByName,
          reviewedByTitle: data.company?.defaultReviewedByPosition,
        },
        "machReg"
      )}`
          : ""
      }
      ${ReportEngine.pageNumber(idx + 1, pages.length)}
    </section>`;
    })
    .join("");

  document.getElementById("machineryRegisterReport").innerHTML = `
    <div id="machineryRegisterToolbar"></div>
    ${pagesHtml}
    <p class="text-dim no-print" style="font-size:11px;margin-top:20px;">Generated ${fmtDateTime(new Date().toISOString())} from live Asbenz Motors EHSMS data.</p>
  `;

  ReportEngine.mountToolbar(document.getElementById("machineryRegisterToolbar"), {
    editHref: isAdmin ? "/admin.html" : null,
    onPrint: () => window.print(),
    onExportExcel: () => machineryRegisterExportExcel(data),
  });
}

async function machineryRegisterExportExcel(data) {
  await ReportEngine.loadExcelJs().catch((err) => {
    toast(err.message, true);
    throw err;
  });

  const rows = data.rows || [];
  const wb = new window.ExcelJS.Workbook();
  const ws = ReportEngine.newWorksheet(wb, "Machinery Register", { orientation: "landscape" });

  const cols = [
    "Machine Name", "Asset Tag", "Category", "Location", "Operational Status", "Responsible Person",
    "Last Inspection", "Next Inspection Due", "DOSH Cert No.", "Compliance Status", "License Expiry",
  ];
  ws.columns = cols.map(() => ({ width: 18 }));
  ReportEngine.excelHeaderRow(ws, 1, cols, { freeze: true, repeat: true });
  rows.forEach((r, idx) => {
    ReportEngine.excelDataRow(ws, idx + 2, [
      r.machineName, r.assetTag, r.category, r.location, r.operationalStatus, r.responsiblePerson,
      fmtDate(r.lastInspectionDate), fmtDate(r.nextInspectionDue), r.doshCertNo, r.complianceStatus, fmtDate(r.licenseExpiryDate),
    ]);
  });

  await ReportEngine.downloadWorkbook(wb, `machinery-register-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
