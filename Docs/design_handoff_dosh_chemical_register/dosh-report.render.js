// Replace the existing block in public/js/pages/chemical.module.js:
//   - the Router.register("/chemical/dosh-register", ...) handler
//   - the renderDoshReport(data, isAdmin) function
//   - its doshPrintBtn click handler
// with everything below. Everything else in the file (wizard, sub-tables,
// COMPANY_SETTINGS_FIELDS / DOSH_GEN_FIELDS constants, the "Edit Company Info"
// modal below renderDoshReport) is unchanged and still works as-is.
//
// Needs ExcelJS (CDN, loaded lazily on first Excel-export click — no build
// step, matches how the rest of this app loads things).

const DOSH_ROWS_PER_PAGE = 8;
const DOSH_ROWS_LAST_PAGE_WITH_C = 5;

Router.register("/chemical/dosh-register", async (params, path, isCurrent) => {
  const view = document.getElementById("view");
  const isAdmin = Auth.user()?.role === "Admin";
  view.innerHTML = `<div class="page-loading">Loading…</div>`;

  let data;
  try {
    data = await api("/chemicals/reports/dosh-register-data");
  } catch (err) {
    if (!isCurrent()) return;
    console.error(err);
    view.innerHTML = Components.emptyState("Could not load the DOSH register data.");
    return;
  }
  if (!isCurrent()) return;

  view.innerHTML = `
    <div class="no-print">${Components.breadcrumb([
      { label: "Dashboard", href: "/" },
      { label: "Chemical Management", href: "/chemical" },
      { label: "DOSH Chemical Register" },
    ])}</div>
    <div id="doshReport"></div>
  `;
  renderDoshReport(data, isAdmin);
});

function doshBuildPages(rows) {
  const pages = [];
  let i = 0;
  while (i < rows.length) {
    const remaining = rows.length - i;
    const size = remaining <= DOSH_ROWS_LAST_PAGE_WITH_C ? remaining : DOSH_ROWS_PER_PAGE;
    pages.push(rows.slice(i, i + size));
    i += size;
  }
  if (!pages.length) pages.push([]);
  return pages;
}

function doshCharBoxes(value) {
  const chars = String(value || "").split("");
  if (!chars.length) return `<div class="dosh-charbox-row"></div>`;
  return `<div class="dosh-charbox-row">${chars
    .map((c) => `<span class="dosh-charbox">${c === " " ? "" : escapeHtml(c)}</span>`)
    .join("")}</div>`;
}

function renderDoshReport(data, isAdmin) {
  const c = data.company || {};
  const activities = c.companyActivity || [];
  const activityMark = (name) => (activities.includes(name) ? "✓" : "");
  const pages = doshBuildPages(data.rows);
  const pageCount = pages.length + 1;

  const sectionAHtml = `
    <section class="dosh-page">
      <div class="dosh-title">REGISTER OF CHEMICALS HAZARDOUS TO HEALTH</div>
      <p style="text-align:center;font-size:10.5px;" class="text-dim">Prepared under the Occupational Safety and Health (Use and Standard of Exposure of Chemicals Hazardous to Health) Regulations 2000</p>

      <div class="dosh-section-head">SECTION A : COMPANY INFORMATION</div>
      <div class="dosh-form-box">
        <div class="dosh-form-row"><label>Name</label>${doshCharBoxes(c.companyName)}</div>
        <p class="dosh-form-note">(Refer to Appendix 4 for Code of Sector and Appendix 5 for Class of Industry)</p>
        <div class="dosh-form-row"><label>Address</label>${doshCharBoxes(c.address)}</div>
        <div class="dosh-form-row dosh-form-row-split">
          <div class="dosh-form-row"><label>City</label>${doshCharBoxes(c.city)}</div>
          <div class="dosh-form-row"><label>Postcode</label>${doshCharBoxes(c.postcode)}</div>
        </div>
        <div class="dosh-form-row"><label>State</label>${doshCharBoxes(c.state)}</div>
        <div class="dosh-form-row"><label>Telephone No.</label>${doshCharBoxes(c.telephone)}</div>
        <div class="dosh-form-row"><label>Email</label>${doshCharBoxes(c.email)}</div>
        <div class="dosh-form-row"><label>DOSH Registration No.</label>${doshCharBoxes(c.doshRegistrationNo)}</div>
        <div class="dosh-form-row dosh-form-row-split">
          <div class="dosh-form-row"><label>Code of Sector</label>${doshCharBoxes(c.codeOfSector)}</div>
          <div class="dosh-form-row"><label>Class of Industry</label>${doshCharBoxes(c.classOfIndustry)}</div>
        </div>
        <div style="margin-top:8px;">
          <div style="font-weight:600;margin-bottom:4px;">Company Activity (Please enter ( / ) in the appropriate box):</div>
          <div class="dosh-activity-grid">
            ${["Manufacturer", "Importer", "Distributor", "Formulator", "End-User"]
              .map((name) => `<div>${name}</div><div class="dosh-activity-box">${activityMark(name)}</div>`)
              .join("")}
          </div>
        </div>
      </div>
      <div class="dosh-page-number">Page 1 of ${pageCount}</div>
    </section>
  `;

  const sectionBHtml = pages
    .map((rows, idx) => {
      const showC = idx === pages.length - 1;
      return `
    <section class="dosh-page">
      <div class="dosh-section-head">SECTION B : LIST OF CHEMICALS HAZARDOUS TO HEALTH</div>
      <div class="dosh-b-meta">
        <div>Location: <strong>${escapeHtml(rows[0]?.storageLocation || "—")}</strong></div>
        <div>Process Operation: <strong>${escapeHtml(rows[0]?.process || "—")}</strong></div>
        <div>No. of Hazardous Chemicals: <strong>${data.rows.length}</strong></div>
      </div>
      <table class="dosh-table dosh-table-b">
        <thead>
          <tr>
            <th rowspan="2">Product Name</th>
            <th rowspan="2">Name of Chemical</th>
            <th rowspan="2">CAS No.</th>
            <th rowspan="2">Physical Form</th>
            <th rowspan="2">Active Ingredients</th>
            <th rowspan="2">Quantity</th>
            <th rowspan="2">Type#</th>
            <th rowspan="2">Class</th>
            <th rowspan="2">CSDS<br>(Y/N)</th>
            <th rowspan="2">Label<br>(Y/N)</th>
            <th rowspan="2">Complies CPL 1977<br>(Y/N)</th>
            <th rowspan="2">Workers<br>Exposed</th>
            <th rowspan="2">Usage of Chemical</th>
            <th colspan="2">Type of Control Measures</th>
            <th rowspan="2">Supplier Name, Address &amp; Contact</th>
          </tr>
          <tr>
            <th>Engineering Control</th>
            <th>PPE</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td>${escapeHtml(r.productName || "—")}</td>
              <td>${escapeHtml(r.chemicalName || "—")}</td>
              <td>${escapeHtml(r.casNumber || "—")}</td>
              <td>${escapeHtml(r.physicalForm || "—")}</td>
              <td>${escapeHtml(r.activeIngredients || "—")}</td>
              <td>${escapeHtml(String(r.quantity || "—"))}</td>
              <td style="text-align:center;">${escapeHtml(r.typeCode || "—")}</td>
              <td style="text-align:center;">${escapeHtml(r.hazardClass || "—")}</td>
              <td style="text-align:center;">${r.csds}</td>
              <td style="text-align:center;">${r.label}</td>
              <td style="text-align:center;">${escapeHtml(r.compliesCpl || "—")}</td>
              <td style="text-align:center;">${escapeHtml(String(r.workersExposed === "" ? "—" : r.workersExposed))}</td>
              <td>${escapeHtml(r.typeOfUse || "—")}</td>
              <td>${escapeHtml(r.controlMeasures || "—")}</td>
              <td>${escapeHtml(r.ppeActuallyUsed || "—")}</td>
              <td>${escapeHtml(r.supplier || "—")}</td>
            </tr>`
            )
            .join("") || `<tr><td colspan="16" class="text-dim">No chemicals registered yet.</td></tr>`}
        </tbody>
      </table>
      ${
        showC
          ? `
      <div class="dosh-section-head" style="margin-top:14px;">SECTION C : NAME OF PERSON WHO PREPARED OR REVIEWED</div>
      <div class="grid no-print-grid-fix" style="grid-template-columns:1fr 1fr;gap:20px;">
        <div>
          <div class="field"><label>Prepared By — Name</label><input type="text" id="doshPreparedName" /></div>
          <div class="field"><label>Prepared By — Title</label><input type="text" id="doshPreparedTitle" /></div>
        </div>
        <div>
          <div class="field"><label>Reviewed By — Name</label><input type="text" id="doshReviewedName" /></div>
          <div class="field"><label>Reviewed By — Title</label><input type="text" id="doshReviewedTitle" /></div>
        </div>
      </div>`
          : ""
      }
      <div class="dosh-page-number">Page ${idx + 2} of ${pageCount}</div>
    </section>`;
    })
    .join("");

  document.getElementById("doshReport").innerHTML = `
    <div class="no-print flex gap-8" style="justify-content:flex-end;margin-bottom:14px;">
      ${isAdmin ? `<button class="btn small" id="doshEditCompanyBtn">Edit Company Info</button>` : ""}
      <button class="btn small" id="doshExportExcelBtn">Export Excel</button>
      <button class="btn primary small" id="doshPrintBtn">Print / Save as PDF</button>
    </div>
    ${sectionAHtml}
    ${sectionBHtml}
    <p class="text-dim no-print" style="font-size:11px;margin-top:20px;">Generated ${fmtDateTime(new Date().toISOString())} from live Asbenz Motors EHSMS data.</p>
  `;

  document.getElementById("doshPrintBtn").addEventListener("click", async () => {
    try {
      const me = Auth.user();
      await api("/dosh-register-generations", {
        method: "POST",
        body: {
          fields: {
            [DOSH_GEN_FIELDS.generationReference]: `DOSH-REG-${Date.now()}`,
            [DOSH_GEN_FIELDS.generatedDate]: new Date().toISOString(),
            [DOSH_GEN_FIELDS.generatedBy]: me?.fullName || me?.email || "Unknown",
            [DOSH_GEN_FIELDS.preparedByName]: document.getElementById("doshPreparedName").value,
            [DOSH_GEN_FIELDS.preparedByTitle]: document.getElementById("doshPreparedTitle").value,
            [DOSH_GEN_FIELDS.reviewedByName]: document.getElementById("doshReviewedName").value,
            [DOSH_GEN_FIELDS.reviewedByTitle]: document.getElementById("doshReviewedTitle").value,
          },
        },
      });
    } catch (err) {
      console.error("Could not log DOSH register generation:", err);
    }
    window.print();
  });

  document.getElementById("doshExportExcelBtn").addEventListener("click", () => doshExportExcel(data));

  if (isAdmin) {
    document.getElementById("doshEditCompanyBtn")?.addEventListener("click", () => openDoshCompanyEditor(data.company));
  }
}

// ---- Excel export (ExcelJS, loaded lazily from CDN — no build step) ----
async function doshExportExcel(data) {
  if (!window.ExcelJS) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const c = data.company || {};
  const rows = data.rows || [];
  const wb = new window.ExcelJS.Workbook();
  const ws = wb.addWorksheet("Chemical Register", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0, footer: 0 } },
    views: [{ showGridLines: false }],
  });
  const thin = { style: "thin", color: { argb: "FF000000" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const cols = ["Product Name", "Name of Chemical", "CAS No.", "Physical Form", "Active Ingredients", "Quantity", "Type#", "Class", "CSDS (Y/N)", "Label (Y/N)", "Complies CPL 1977 (Y/N)", "Workers Exposed", "Usage of Chemical", "Engineering Control", "PPE", "Supplier Name, Address & Contact"];
  ws.columns = cols.map(() => ({ width: 16 }));
  const CTRL_START = cols.indexOf("Engineering Control") + 1;

  ws.mergeCells(1, 1, 1, cols.length);
  Object.assign(ws.getCell(1, 1), { value: "REGISTER OF CHEMICALS HAZARDOUS TO HEALTH" });
  ws.getCell(1, 1).font = { bold: true, size: 14, name: "Arial" };
  ws.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell(1, 1).border = border;
  ws.getRow(1).height = 22;

  const sectionHead = (row, text) => {
    ws.mergeCells(row, 1, row, cols.length);
    const cell = ws.getCell(row, 1);
    cell.value = text;
    cell.font = { bold: true, size: 11, name: "Arial", color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
  };
  sectionHead(2, "SECTION A : COMPANY INFORMATION");

  const addRow = (r, pairs) => {
    let col = 1;
    pairs.forEach(([label, value, span]) => {
      span = span || Math.floor(cols.length / pairs.length);
      const lc = ws.getCell(r, col);
      lc.value = label; lc.font = { bold: true, size: 9, name: "Arial" }; lc.border = border;
      ws.mergeCells(r, col + 1, r, col + span - 1);
      const vc = ws.getCell(r, col + 1);
      vc.value = value; vc.font = { size: 9, name: "Arial" }; vc.border = border;
      col += span + 1;
    });
  };
  addRow(3, [["Name", c.companyName], ["DOSH Reg. No.", c.doshRegistrationNo]]);
  addRow(4, [["Address", c.address], ["Sector Code", c.codeOfSector]]);
  addRow(5, [["City / Postcode", [c.city, c.postcode].filter(Boolean).join(" / ")], ["Class of Industry", c.classOfIndustry]]);
  addRow(6, [["State", c.state], ["Telephone", c.telephone]]);
  addRow(7, [["Email", c.email], ["Company Activity", (c.companyActivity || []).join(", ")]]);

  sectionHead(8, "SECTION B : LIST OF CHEMICALS HAZARDOUS TO HEALTH");
  const groupRow = 9, headerRow = 10;
  ws.mergeCells(groupRow, CTRL_START, groupRow, CTRL_START + 1);
  const groupCell = ws.getCell(groupRow, CTRL_START);
  groupCell.value = "Type of Control Measures";
  groupCell.font = { bold: true, size: 9, name: "Arial" };
  groupCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } };
  groupCell.alignment = { horizontal: "center", vertical: "middle" };
  groupCell.border = border;
  const hRow = ws.getRow(headerRow);
  cols.forEach((label, i) => {
    const colNum = i + 1;
    const inGroup = colNum === CTRL_START || colNum === CTRL_START + 1;
    if (!inGroup) ws.mergeCells(groupRow, colNum, headerRow, colNum);
    const top = ws.getCell(groupRow, colNum);
    if (!inGroup) top.value = label;
    top.font = { bold: true, size: 9, name: "Arial" };
    top.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } };
    top.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    top.border = border;
    const bottom = hRow.getCell(colNum);
    bottom.value = inGroup ? label : undefined;
    bottom.font = { bold: true, size: 9, name: "Arial" };
    bottom.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } };
    bottom.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    bottom.border = border;
  });
  ws.views = [{ state: "frozen", ySplit: headerRow, showGridLines: false }];
  ws.pageSetup.printTitlesRow = `${groupRow}:${headerRow}`;

  rows.forEach((r, idx) => {
    const row = ws.getRow(headerRow + 1 + idx);
    const vals = [r.productName, r.chemicalName, r.casNumber, r.physicalForm, r.activeIngredients, r.quantity, r.typeCode, r.hazardClass, r.csds, r.label, r.compliesCpl, r.workersExposed, r.typeOfUse, r.controlMeasures, r.ppeActuallyUsed, r.supplier];
    vals.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.font = { size: 9, name: "Arial" };
      cell.alignment = { wrapText: true, vertical: "top" };
      cell.border = border;
    });
    row.height = 28;
  });

  let sigRow = headerRow + rows.length + 2;
  sectionHead(sigRow, "SECTION C : NAME OF PERSON WHO PREPARED OR REVIEWED");
  const half = Math.floor(cols.length / 2);
  const sigLine = (r, label) => {
    ws.mergeCells(r, 1, r, half);
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { size: 9, name: "Arial" };
    ws.getCell(r, 1).border = border;
    ws.mergeCells(r, half + 1, r, cols.length);
    ws.getCell(r, half + 1).border = border;
  };
  sigLine(sigRow + 1, `Prepared By — Name: ${document.getElementById("doshPreparedName")?.value || ""}   Title: ${document.getElementById("doshPreparedTitle")?.value || ""}`);
  sigLine(sigRow + 2, `Reviewed By — Name: ${document.getElementById("doshReviewedName")?.value || ""}   Title: ${document.getElementById("doshReviewedTitle")?.value || ""}`);
  ws.pageSetup.printArea = `A1:P${sigRow + 2}`;

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chemical-register-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
