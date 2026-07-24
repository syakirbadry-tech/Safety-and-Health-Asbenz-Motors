// Shared print/export engine — the reusable foundation behind every
// generated report (Chemical Register, DOSH Chemical Register, Machinery
// Register, CAPA Register, OSH Committee Register, Company Profile, and any
// future report). Extracted from the DOSH Chemical Register's original
// bespoke implementation (see ARCHITECTURE.md's "Print/Export Engine"
// section) — every report template composes these primitives plus the
// `.report-*` CSS design system (public/css/styles.css) rather than
// reimplementing pagination, branding, signatures, footers, or Excel
// boilerplate per report. Plain global functions (no class, no build step),
// matching this codebase's existing style (see moduleFramework.js).
//
// A template function's job is layout only — data-shaping/derivation stays
// in the server's `/reports/*-data` endpoint that feeds it (the same split
// the DOSH register already uses), so "no business logic inside templates"
// holds without a literal template-file system, which this no-build-step
// vanilla-JS app has no precedent for.
const ReportEngine = (() => {
  // Splits `rows` into per-page chunks. The last page is capped at
  // `lastPageReserve` (if given) so trailing content (e.g. a signature
  // section) fits on the same sheet as the final page of rows — the DOSH
  // register's own Section C placement rule, generalized.
  function paginate(rows, { perPage, lastPageReserve } = {}) {
    const pages = [];
    let i = 0;
    while (i < rows.length) {
      const remaining = rows.length - i;
      const size = lastPageReserve && remaining <= lastPageReserve ? remaining : perPage;
      pages.push(rows.slice(i, i + size));
      i += size;
    }
    if (!pages.length) pages.push([]);
    return pages;
  }

  // One bordered box per character — the official DOSH form's fill-in
  // style, kept generic since any report reproducing a boxed government
  // form (not just DOSH) can reuse it.
  function charBoxes(value) {
    const chars = String(value || "").split("");
    if (!chars.length) return `<div class="report-charbox-row"></div>`;
    return `<div class="report-charbox-row">${chars
      .map((ch) => `<span class="report-charbox">${ch === " " ? "" : escapeHtml(ch)}</span>`)
      .join("")}</div>`;
  }

  // Company branding block (logo + name/address/contact). `showLogo`
  // defaults true; the DOSH register explicitly opts out (its official
  // guideline form has no logo — a deliberate prior design decision, not an
  // oversight) by passing `showLogo:false`.
  function renderBranding(company, opts = {}) {
    const c = company || {};
    const { showLogo = true, showStamp = false } = opts;
    const logoUrl = (c.logo && c.logo[0] && c.logo[0].url) || "";
    const address = [c.address, c.addressLine2].filter(Boolean).join(", ");
    const cityLine = [c.city, c.postcode, c.state].filter(Boolean).join(", ");
    return `
    <div class="report-branding">
      ${showLogo && logoUrl ? `<img class="report-branding-logo" src="${escapeHtml(logoUrl)}" alt="Company logo" />` : ""}
      <div class="report-branding-text">
        <div class="report-branding-name">${escapeHtml(c.companyName || "")}</div>
        ${address ? `<div>${escapeHtml(address)}</div>` : ""}
        ${cityLine ? `<div>${escapeHtml(cityLine)}</div>` : ""}
        <div>${[c.telephone, c.email].filter(Boolean).map(escapeHtml).join(" · ")}</div>
      </div>
      ${showStamp && c.stamp && c.stamp[0] && c.stamp[0].url ? `<img class="report-stamp" src="${escapeHtml(c.stamp[0].url)}" alt="Company stamp" />` : ""}
    </div>`;
  }

  // Document Number / Report Version / Generated Date strip.
  function renderDocInfo({ documentNumber, reportVersion, generatedAt }) {
    return `
    <div class="report-doc-info">
      <div><strong>Document No.</strong> ${escapeHtml(documentNumber || "—")}</div>
      <div><strong>Version</strong> ${escapeHtml(reportVersion || "—")}</div>
      <div><strong>Generated</strong> ${escapeHtml(fmtDateTime(generatedAt || new Date().toISOString()))}</div>
    </div>`;
  }

  // Prepared By / Reviewed By sign-off grid, generalized from the DOSH
  // register's Section C. `idPrefix` keeps element ids unique per report so
  // more than one report's signature block can exist in the same document
  // (not currently needed, but avoids an id collision trap for free).
  function renderSignatureBlock(values = {}, idPrefix = "sig") {
    const v = values || {};
    const col = (label, nameId, titleId, nameVal, titleVal) => `
      <div>
        <div class="field"><label>${label} — Name</label><input type="text" id="${idPrefix}${nameId}" value="${escapeHtml(nameVal || "")}" /></div>
        <div class="field"><label>${label} — Title</label><input type="text" id="${idPrefix}${titleId}" value="${escapeHtml(titleVal || "")}" /></div>
        <div class="report-sig-line">(Signature)</div>
      </div>`;
    return `
    <div class="report-signature-grid">
      ${col("Prepared By", "PreparedName", "PreparedTitle", v.preparedByName, v.preparedByTitle)}
      ${col("Reviewed By", "ReviewedName", "ReviewedTitle", v.reviewedByName, v.reviewedByTitle)}
    </div>`;
  }

  function pageNumber(pageNum, pageCount) {
    return `<div class="report-page-number">Page ${pageNum} of ${pageCount}</div>`;
  }

  // Standard "Print / Save as PDF" (+ optional "Export Excel", optional
  // "Edit Company Info" link) toolbar, generalized from the DOSH register's
  // own. Browser-native print is the PDF export mechanism app-wide — no
  // server-side PDF dependency, consistent with the app's stated print
  // philosophy (public/css/styles.css).
  function mountToolbar(el, { onPrint, onExportExcel, editHref } = {}) {
    if (!el) return;
    el.innerHTML = `
      <div class="no-print flex gap-8" style="justify-content:flex-end;margin-bottom:14px;">
        ${editHref ? `<a class="btn small" href="${editHref}" target="_blank" rel="noopener">Edit Company Profile</a>` : ""}
        ${onExportExcel ? `<button class="btn small" id="reportExportExcelBtn">Export Excel</button>` : ""}
        <button class="btn primary small" id="reportPrintBtn">Print / Save as PDF</button>
      </div>`;
    if (onPrint) el.querySelector("#reportPrintBtn").addEventListener("click", onPrint);
    if (onExportExcel) el.querySelector("#reportExportExcelBtn").addEventListener("click", onExportExcel);
  }

  // ---- Excel export helpers (ExcelJS, lazy-loaded from a CDN on first
  // use — see the DOSH register's original doshExportExcel for why: this
  // app has no build step, and a plain CSV can't reproduce a merged/
  // bordered report layout). Structural helpers only; each report still
  // builds its own sheet content since column sets differ per report. ----
  function loadExcelJs() {
    if (window.ExcelJS) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("Could not load the Excel export library."));
      document.head.appendChild(s);
    });
  }

  const EXCEL_BORDER = (() => {
    const thin = { style: "thin", color: { argb: "FF000000" } };
    return { top: thin, left: thin, bottom: thin, right: thin };
  })();

  function excelSectionHead(ws, row, text, numCols) {
    ws.mergeCells(row, 1, row, numCols);
    const cell = ws.getCell(row, 1);
    cell.value = text;
    cell.font = { bold: true, size: 11, name: "Arial", color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
  }

  // A row of label/value pairs, each pair spanning an equal share of
  // `numCols` — used for Company Info-style sections.
  function excelInfoRow(ws, row, pairs, numCols) {
    let col = 1;
    pairs.forEach(([label, value]) => {
      const span = Math.floor(numCols / pairs.length);
      const lc = ws.getCell(row, col);
      lc.value = label;
      lc.font = { bold: true, size: 9, name: "Arial" };
      lc.border = EXCEL_BORDER;
      ws.mergeCells(row, col + 1, row, col + span - 1);
      const vc = ws.getCell(row, col + 1);
      vc.value = value;
      vc.font = { size: 9, name: "Arial" };
      vc.border = EXCEL_BORDER;
      col += span + 1;
    });
  }

  function excelHeaderRow(ws, row, labels, opts = {}) {
    const hRow = ws.getRow(row);
    labels.forEach((label, i) => {
      const cell = hRow.getCell(i + 1);
      cell.value = label;
      cell.font = { bold: true, size: 9, name: "Arial" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = EXCEL_BORDER;
    });
    if (opts.freeze) ws.views = [{ state: "frozen", ySplit: row, showGridLines: false }];
    if (opts.repeat) ws.pageSetup.printTitlesRow = `${row}:${row}`;
  }

  function excelDataRow(ws, row, values) {
    const r = ws.getRow(row);
    values.forEach((v, i) => {
      const cell = r.getCell(i + 1);
      cell.value = v ?? "";
      cell.font = { size: 9, name: "Arial" };
      cell.alignment = { wrapText: true, vertical: "top" };
      cell.border = EXCEL_BORDER;
    });
    return r;
  }

  function newWorksheet(wb, name, { orientation = "landscape" } = {}) {
    return wb.addWorksheet(name, {
      pageSetup: {
        orientation,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0, footer: 0 },
      },
      views: [{ showGridLines: false }],
    });
  }

  async function downloadWorkbook(wb, filename) {
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Generic wrapper for a per-report generation audit log (a "Report
  // Generations" style table, as DOSH already has). Optional — most reports
  // don't have one yet; callers that don't pass `endpoint` simply skip
  // logging rather than failing.
  async function logGeneration(endpoint, body) {
    if (!endpoint) return;
    try {
      await api(endpoint, { method: "POST", body });
    } catch (err) {
      console.error(`Could not log report generation (${endpoint}):`, err);
    }
  }

  return {
    paginate,
    charBoxes,
    renderBranding,
    renderDocInfo,
    renderSignatureBlock,
    pageNumber,
    mountToolbar,
    loadExcelJs,
    EXCEL_BORDER,
    excelSectionHead,
    excelInfoRow,
    excelHeaderRow,
    excelDataRow,
    newWorksheet,
    downloadWorkbook,
    logGeneration,
  };
})();
