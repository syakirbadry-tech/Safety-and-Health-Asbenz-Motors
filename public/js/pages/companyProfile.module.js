// Company Profile — print/export report, built on ReportEngine (see
// public/js/pages/chemical.module.js's Chemical Register report for the
// first use of this pattern). A one-page letterhead-style info sheet, not a
// register — no pagination, no signature block (there's nothing to sign off
// on; it's a snapshot of the company's own settings, not a compliance
// record). Reached from the Admin panel's Company Profile tab
// (public/admin.html — a separate non-SPA page, so this is a plain link to
// this SPA route, not a Router.register call there).

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
  const documentNumber = `PROFILE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

  const html = `
    <section class="report-page">
      <div class="report-title">COMPANY PROFILE</div>
      ${ReportEngine.renderBranding(c, { showLogo: true, showStamp: true })}
      ${ReportEngine.renderDocInfo({ documentNumber, reportVersion: COMPANY_PROFILE_REPORT_VERSION, generatedAt: new Date().toISOString() })}

      ${companyProfileSection("General Information", [
        ["Company Name", c.companyName],
        ["Company Registration No.", c.companyRegistrationNo],
        ["DOSH Registration No.", c.doshRegistrationNo],
        ["MSIC Code", c.msicCode],
        ["Code of Sector", c.codeOfSector],
        ["Class of Industry", c.classOfIndustry],
        ["Company Activity", (c.companyActivity || []).join(", ")],
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

      ${companyProfileSection("Report Defaults", [
        ["Default Prepared By", c.defaultPreparedByName],
        ["Default Prepared By — Position", c.defaultPreparedByPosition],
        ["Default Reviewed By", c.defaultReviewedByName],
        ["Default Reviewed By — Position", c.defaultReviewedByPosition],
      ])}

      ${ReportEngine.pageNumber(1, 1)}
    </section>
  `;

  document.getElementById("companyProfileReport").innerHTML = `
    <div id="companyProfileToolbar"></div>
    ${html}
    <p class="text-dim no-print" style="font-size:11px;margin-top:20px;">Generated ${fmtDateTime(new Date().toISOString())} from live Asbenz Motors EHSMS data.</p>
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
    ["MSIC Code", c.msicCode],
    ["Code of Sector", c.codeOfSector],
    ["Class of Industry", c.classOfIndustry],
    ["Company Activity", (c.companyActivity || []).join(", ")],
    ["Address Line 1", c.address],
    ["Address Line 2", c.addressLine2],
    ["City", c.city],
    ["Postcode", c.postcode],
    ["State", c.state],
    ["Country", c.country],
    ["Phone", c.telephone],
    ["Email", c.email],
    ["Website", c.website],
    ["Default Prepared By", c.defaultPreparedByName],
    ["Default Prepared By — Position", c.defaultPreparedByPosition],
    ["Default Reviewed By", c.defaultReviewedByName],
    ["Default Reviewed By — Position", c.defaultReviewedByPosition],
  ];
  rows.forEach((pair, idx) => ReportEngine.excelDataRow(ws, idx + 2, pair));

  await ReportEngine.downloadWorkbook(wb, `company-profile-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
