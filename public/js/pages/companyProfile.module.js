// Company Profile — print/export report, built on ReportEngine (see
// public/js/pages/chemical.module.js's Chemical Register report for the
// first use of this pattern). A one-page letterhead-style info sheet, not a
// register — no pagination, no signature block (there's nothing to sign off
// on; it's a snapshot of the company's own settings, not a compliance
// record). Reached from the Admin panel's Company Profile tab
// (public/admin.html — a separate non-SPA page, so this is a plain link to
// this SPA route, not a Router.register call there).
//
// Also hosts the "Preview Report" route (ARCHITECTURE.md §5.7) — a second,
// separate page reached only from the admin form, not the Company Profile
// report above.

const COMPANY_PROFILE_REPORT_VERSION = "v1.0";

Router.register("/company-profile/report", async (params, path, isCurrent) => {
  const view = document.getElementById("view");
  const isAdmin = Auth.user()?.role === "Admin";
  view.innerHTML = `<div class="page-loading">Loading…</div>`;

  let data;
  try {
    data = await api("/company-settings/reports/profile-data");
  } catch (err) {
    if (!isCurrent()) return;
    console.error(err);
    view.innerHTML = Components.emptyState("Could not load the Company Profile data.");
    return;
  }
  if (!isCurrent()) return;

  view.innerHTML = `
    <div class="no-print">${Components.breadcrumb([
      { label: "Dashboard", href: "/" },
      { label: "Company Profile Report" },
    ])}</div>
    <div id="companyProfileReport"></div>
  `;
  renderCompanyProfileReport(data, isAdmin);
});

function companyProfileSection(title, pairs) {
  return `
    <div class="report-section-head" style="margin-top:14px;">${escapeHtml(title)}</div>
    <table class="report-table">
      <tbody>
        ${pairs
          .map(
            ([label, value]) => `
          <tr><td style="width:220px;font-weight:600;">${escapeHtml(label)}</td><td>${escapeHtml(value || "—")}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderCompanyProfileReport(data, isAdmin) {
  const c = data.company || {};
  const documentNumber = ReportEngine.documentNumber(c, "PROFILE");
  // No structural orientation requirement — respects the admin's Default
  // Orientation.
  const pageAttrs = ReportEngine.pageAttrs(c);
  const pageAttrsStr = `class="report-page ${pageAttrs.class}" style="${pageAttrs.style}"`;

  const html = `
    <section ${pageAttrsStr}>
      ${ReportEngine.renderWatermark(c)}
      ${ReportEngine.renderConfidentialBanner(c)}
      <div class="report-title">COMPANY PROFILE</div>
      ${ReportEngine.renderBranding(c)}
      ${ReportEngine.renderDocInfo(c, { documentNumber, reportVersion: COMPANY_PROFILE_REPORT_VERSION, generatedAt: new Date().toISOString() })}

      ${companyProfileSection("General Information", [
        ["Company Name", c.companyName],
        ["Company Registration No.", c.companyRegistrationNo],
        ["DOSH Registration No.", c.doshRegistrationNo],
        ["Industry", c.industry],
        ["Tax Number", c.taxNumber],
        ["MSIC Code", c.msicCode],
        ["Code of Sector", c.codeOfSector],
        ["Class of Industry", c.classOfIndustry],
        ["Company Activity", (c.companyActivity || []).join(", ")],
        ["Description", c.description],
      ])}

      ${companyProfileSection("Address", [
        ["Address Line 1", c.address],
        ["Address Line 2", c.addressLine2],
        ["City", c.city],
        ["Postcode", c.postcode],
        ["State", c.state],
        ["Country", c.country],
      ])}

      ${companyProfileSection("Contact", [
        ["Phone", c.telephone],
        ["Email", c.email],
        ["Website", c.website],
      ])}

      ${companyProfileSection("Document Settings", [
        ["Document Prefix", c.documentPrefix],
        ["Default Version", c.defaultVersion],
        ["Document Footer", c.documentFooter],
        ["Default Paper Size", c.defaultPaperSize],
        ["Default Orientation", c.defaultOrientation],
        ["Default Language", c.defaultLanguage],
        ["Company Confidential", c.companyConfidential ? "On" : "Off"],
      ])}

      ${companyProfileSection("Signatories", [
        ["Prepared By", [c.defaultPreparedByName, c.defaultPreparedByPosition].filter(Boolean).join(" — ")],
        ["Reviewed By", [c.defaultReviewedByName, c.defaultReviewedByPosition].filter(Boolean).join(" — ")],
        ["Approved By", [c.approvedByName, c.approvedByPosition].filter(Boolean).join(" — ")],
      ])}

      ${ReportEngine.renderFooter(c, { pageNum: 1, pageCount: 1 })}
    </section>
  `;

  const me = Auth.user();
  document.getElementById("companyProfileReport").innerHTML = `
    <div id="companyProfileToolbar"></div>
    ${html}
    ${ReportEngine.renderGeneratedNote(c, { generatedBy: me?.fullName || me?.email })}
  `;

  ReportEngine.mountToolbar(document.getElementById("companyProfileToolbar"), {
    editHref: isAdmin ? "/admin.html" : null,
    onPrint: () => window.print(),
    onExportExcel: () => companyProfileExportExcel(c),
  });
}

async function companyProfileExportExcel(c) {
  await ReportEngine.loadExcelJs().catch((err) => {
    toast(err.message, true);
    throw err;
  });

  const wb = new window.ExcelJS.Workbook();
  const ws = ReportEngine.newWorksheet(wb, "Company Profile", { orientation: "portrait" });
  ws.columns = [{ width: 30 }, { width: 50 }];
  ReportEngine.excelHeaderRow(ws, 1, ["Field", "Value"]);

  const rows = [
    ["Company Name", c.companyName],
    ["Company Registration No.", c.companyRegistrationNo],
    ["DOSH Registration No.", c.doshRegistrationNo],
    ["Industry", c.industry],
    ["Tax Number", c.taxNumber],
    ["MSIC Code", c.msicCode],
    ["Code of Sector", c.codeOfSector],
    ["Class of Industry", c.classOfIndustry],
    ["Company Activity", (c.companyActivity || []).join(", ")],
    ["Description", c.description],
    ["Address Line 1", c.address],
    ["Address Line 2", c.addressLine2],
    ["City", c.city],
    ["Postcode", c.postcode],
    ["State", c.state],
    ["Country", c.country],
    ["Phone", c.telephone],
    ["Email", c.email],
    ["Website", c.website],
    ["Document Prefix", c.documentPrefix],
    ["Default Version", c.defaultVersion],
    ["Document Footer", c.documentFooter],
    ["Default Paper Size", c.defaultPaperSize],
    ["Default Orientation", c.defaultOrientation],
    ["Default Language", c.defaultLanguage],
    ["Company Confidential", c.companyConfidential ? "On" : "Off"],
    ["Default Prepared By", c.defaultPreparedByName],
    ["Default Prepared By — Position", c.defaultPreparedByPosition],
    ["Default Reviewed By", c.defaultReviewedByName],
    ["Default Reviewed By — Position", c.defaultReviewedByPosition],
    ["Approved By", c.approvedByName],
    ["Approved By — Position", c.approvedByPosition],
  ];
  rows.forEach((pair, idx) => ReportEngine.excelDataRow(ws, idx + 2, pair));

  await ReportEngine.downloadWorkbook(wb, `company-profile-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ---------------------------------------------------------------------
// "Preview Report" — reached only from the Admin panel's Company Profile
// tab (public/js/admin.js's #cpPreviewBtn), never linked from anywhere
// else. Renders a synthetic sample register through the exact same
// ReportEngine calls every real report uses, so it's identical to a real
// exported PDF by construction. Reads the admin form's CURRENT (possibly
// unsaved) values from sessionStorage rather than the server, so edits show
// up before Save; falls back to the last-saved record if opened directly
// with no handoff (e.g. a stale/reloaded tab).
// ---------------------------------------------------------------------
Router.register("/company-profile/preview", async (params, path, isCurrent) => {
  const view = document.getElementById("view");
  view.innerHTML = `<div class="page-loading">Loading…</div>`;

  let c;
  const raw = sessionStorage.getItem("companyProfilePreview");
  if (raw) {
    try {
      c = JSON.parse(raw);
    } catch {
      c = null;
    }
  }
  if (!c) {
    try {
      const data = await api("/company-settings/reports/profile-data");
      c = data.company || {};
    } catch (err) {
      if (!isCurrent()) return;
      console.error(err);
      view.innerHTML = Components.emptyState("Could not load Company Profile data to preview.");
      return;
    }
  }
  if (!isCurrent()) return;

  view.innerHTML = `
    <div class="no-print">${Components.breadcrumb([
      { label: "Dashboard", href: "/" },
      { label: "Preview Report" },
    ])}</div>
    <p class="no-print text-dim" style="font-size:12px;margin:-4px 0 14px;">
      Sample report using your current Company Profile settings — built from the exact same ReportEngine calls
      every real report uses. Uploaded images reflect your last saved upload, not an in-progress file pick.
    </p>
    <div id="companyProfilePreview"></div>
  `;
  renderPreviewReport(c);
});

function renderPreviewReport(c) {
  const documentNumber = ReportEngine.documentNumber(c, "SAMPLE");
  const pageAttrs = ReportEngine.pageAttrs(c, "landscape"); // landscape so the sample table has room, same as most real registers
  const pageAttrsStr = `class="report-page ${pageAttrs.class}" style="${pageAttrs.style}"`;
  const sampleRows = [
    { name: "Sample Item A", ref: "REF-001", status: "Active", owner: "J. Tan" },
    { name: "Sample Item B", ref: "REF-002", status: "Pending", owner: "S. Kumar" },
    { name: "Sample Item C", ref: "REF-003", status: "Active", owner: "A. Rahman" },
  ];

  const html = `
    <section ${pageAttrsStr}>
      ${ReportEngine.renderWatermark(c)}
      ${ReportEngine.renderConfidentialBanner(c)}
      <div class="report-title">SAMPLE REGISTER — REPORT PREVIEW</div>
      ${ReportEngine.renderBranding(c)}
      ${ReportEngine.renderDocInfo(c, { documentNumber, generatedAt: new Date().toISOString() })}
      <table class="report-table report-table--compact">
        <thead>
          <tr><th>Item</th><th>Reference</th><th>Status</th><th>Owner</th></tr>
        </thead>
        <tbody>
          ${sampleRows.map((r) => `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.ref)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.owner)}</td></tr>`).join("")}
        </tbody>
      </table>
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
        "preview",
        c
      )}
      ${ReportEngine.renderFooter(c, { pageNum: 1, pageCount: 1 })}
    </section>
  `;

  const me = Auth.user();
  document.getElementById("companyProfilePreview").innerHTML = `
    <div id="companyProfilePreviewToolbar"></div>
    ${html}
    ${ReportEngine.renderGeneratedNote(c, { generatedBy: me?.fullName || me?.email })}
  `;

  ReportEngine.mountToolbar(document.getElementById("companyProfilePreviewToolbar"), {
    onPrint: () => window.print(),
  });
}
