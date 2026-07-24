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
//
// Central administration (ARCHITECTURE.md §5.7): every primitive below that
// touches branding/signatures/footer text reads its defaults straight off
// the `company` object (server/lib/companyProfile.js's getCompanyProfile()
// shape) — a report only needs to pass `company` through, never re-derive
// or re-pass individual show/hide flags itself. `overrides`/explicit args
// exist only for a report's own hard structural reasons (DOSH's
// `showLogo:false`, matching its official government-form layout, is the
// one case that exists today) — they are opt-outs, not restatements of the
// default.
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

  // Company branding block (logo + name/address/contact + stamp). Logo/
  // stamp visibility defaults to the admin's Export Settings
  // (company.exportSettings.showLogo/showStamp); `overrides.showLogo:false`
  // (DOSH's case) still wins over any setting, since it's a fixed
  // government-form requirement, not a user preference.
  function renderBranding(company, overrides = {}) {
    const c = company || {};
    const es = c.exportSettings || {};
    const showLogo = overrides.showLogo !== undefined ? overrides.showLogo : es.showLogo !== false;
    const showStamp = overrides.showStamp !== undefined ? overrides.showStamp : es.showStamp !== false;
    const logoUrl = (c.logo && c.logo[0] && c.logo[0].url) || "";
    const address = [c.address, c.addressLine2].filter(Boolean).join(", ");
    const cityLine = [c.city, c.postcode, c.state].filter(Boolean).join(", ");
    return `
    <div class="report-branding">
      ${showLogo && logoUrl ? `<img class="report-branding-logo" src="${escapeHtml(logoUrl)}" alt="Company logo" />` : ""}
      <div class="report-branding-text">
        <div class="report-branding-name">${escapeHtml(c.companyName || "")}</div>
        ${c.industry ? `<div>${escapeHtml(c.industry)}</div>` : ""}
        ${address ? `<div>${escapeHtml(address)}</div>` : ""}
        ${cityLine ? `<div>${escapeHtml(cityLine)}</div>` : ""}
        <div>${[c.telephone, c.email].filter(Boolean).map(escapeHtml).join(" · ")}</div>
      </div>
      ${showStamp && c.stamp && c.stamp[0] && c.stamp[0].url ? `<img class="report-stamp" src="${escapeHtml(c.stamp[0].url)}" alt="Company stamp" />` : ""}
    </div>`;
  }

  // Faint page-wide watermark image, when the admin has uploaded one.
  // Print/screen rendering is best-effort: any opaque element (e.g. a
  // table cell's white background) will cover it in that area, the same
  // limitation any lightweight CSS watermark has under a browser's print
  // engine — see PRINT_EXPORT_IMPLEMENTATION_REPORT.md.
  function renderWatermark(company) {
    const c = company || {};
    const url = c.watermark && c.watermark[0] && c.watermark[0].url;
    if (!url) return "";
    return `<img class="report-watermark" src="${escapeHtml(url)}" alt="" />`;
  }

  // Top-right "CONFIDENTIAL" marking, driven by the admin's Company
  // Confidential toggle.
  function renderConfidentialBanner(company) {
    const c = company || {};
    if (!c.companyConfidential) return "";
    return `<div class="report-confidential-banner">Confidential</div>`;
  }

  // Builds a report's Document Number: {Document Prefix (admin-set) or the
  // report's own default code}-{YYYYMMDD}. Centralizes what each report
  // used to hardcode inline (e.g. `DOSH-REG-${date}`).
  function documentNumber(company, reportCode) {
    const prefix = (company && company.documentPrefix) || reportCode;
    return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  }

  // Document Number / Version / Generated Date+Time strip — each piece
  // shown per the admin's Export Settings (Show Document Number/Version/
  // Generated Date/Generated Time). `reportVersion` falls back to the
  // admin's Default Version, then "v1.0".
  function renderDocInfo(company, { documentNumber: docNo, reportVersion, generatedAt } = {}) {
    const c = company || {};
    const es = c.exportSettings || {};
    const version = reportVersion || c.defaultVersion || "v1.0";
    const when = generatedAt ? new Date(generatedAt) : new Date();
    const parts = [];
    if (es.showDocumentNumber !== false && docNo) parts.push(`<div><strong>Document No.</strong> ${escapeHtml(docNo)}</div>`);
    if (es.showDocumentVersion !== false) parts.push(`<div><strong>Version</strong> ${escapeHtml(version)}</div>`);
    if (es.showGeneratedDate !== false || es.showGeneratedTime !== false) {
      const dateStr = es.showGeneratedDate !== false ? fmtDate(when.toISOString()) : "";
      const timeStr = es.showGeneratedTime !== false ? when.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }) : "";
      parts.push(`<div><strong>Generated</strong> ${escapeHtml([dateStr, timeStr].filter(Boolean).join(" "))}</div>`);
    }
    if (!parts.length) return "";
    return `<div class="report-doc-info">${parts.join("")}</div>`;
  }

  // Prepared By / Reviewed By / Approved By sign-off grid, generalized from
  // the DOSH register's original 2-column Section C. Approved By is now a
  // standard third signatory (matching Prepared/Reviewed) across every
  // report that calls this. When `company.signatures.*` has an uploaded
  // image for a role, it's embedded above that role's name instead of
  // today's blank sign-off line. `idPrefix` keeps element ids unique per
  // report.
  function renderSignatureBlock(values = {}, idPrefix = "sig", company = null) {
    const v = values || {};
    const sig = (company && company.signatures) || {};
    const col = (label, nameId, titleId, nameVal, titleVal, sigUrl) => `
      <div>
        ${sigUrl ? `<img src="${escapeHtml(sigUrl)}" alt="${escapeHtml(label)} signature" class="report-sig-image" />` : ""}
        <div class="field"><label>${label} — Name</label><input type="text" id="${idPrefix}${nameId}" value="${escapeHtml(nameVal || "")}" /></div>
        <div class="field"><label>${label} — Title</label><input type="text" id="${idPrefix}${titleId}" value="${escapeHtml(titleVal || "")}" /></div>
        ${sigUrl ? "" : `<div class="report-sig-line">(Signature)</div>`}
      </div>`;
    return `
    <div class="report-signature-grid report-signature-grid--3">
      ${col("Prepared By", "PreparedName", "PreparedTitle", v.preparedByName, v.preparedByTitle, sig.prepared?.[0]?.url)}
      ${col("Reviewed By", "ReviewedName", "ReviewedTitle", v.reviewedByName, v.reviewedByTitle, sig.reviewed?.[0]?.url)}
      ${col("Approved By", "ApprovedName", "ApprovedTitle", v.approvedByName, v.approvedByTitle, sig.approved?.[0]?.url)}
    </div>`;
  }

  function pageNumber(pageNum, pageCount) {
    return `Page ${pageNum} of ${pageCount}`;
  }

  // Per-page footer strip: custom footer text (Show Footer) + page number
  // (Show Page Numbers). Replaces each report's own bare `pageNumber()`
  // call.
  function renderFooter(company, { pageNum, pageCount } = {}) {
    const c = company || {};
    const es = c.exportSettings || {};
    const bits = [];
    if (es.showFooter !== false && c.documentFooter) bits.push(escapeHtml(c.documentFooter));
    if (es.showPageNumbers !== false && pageNum != null) bits.push(pageNumber(pageNum, pageCount));
    if (!bits.length) return "";
    return `<div class="report-page-number">${bits.join(" · ")}</div>`;
  }

  // The screen-only "Generated {date} {time} by {user} from live data" note
  // shown once beneath a report (not per-page) — per Show Generated Date/
  // Time/By. Replaces each report's own hand-written paragraph.
  function renderGeneratedNote(company, { generatedAt, generatedBy } = {}) {
    const c = company || {};
    const es = c.exportSettings || {};
    const when = generatedAt ? new Date(generatedAt) : new Date();
    const showDate = es.showGeneratedDate !== false;
    const showTime = es.showGeneratedTime !== false;
    if (!showDate && !showTime) return "";
    const dateStr = showDate ? fmtDate(when.toISOString()) : "";
    const timeStr = showTime ? when.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }) : "";
    const byStr = es.showGeneratedBy !== false && generatedBy ? ` by ${escapeHtml(generatedBy)}` : "";
    return `<p class="text-dim no-print" style="font-size:11px;margin-top:20px;">Generated ${escapeHtml([dateStr, timeStr].filter(Boolean).join(" "))}${byStr} from live Asbenz Motors EHSMS data.</p>`;
  }

  // Resolves a report page's orientation/paper-size class + inline style.
  // `structuralOrientation` is "landscape"/"portrait" for reports whose
  // column count hard-requires an orientation (DOSH/Machinery/CAPA) —
  // always wins. Omit it to let the admin's Default Orientation decide
  // (Chemical Register/OSH Committee/Company Profile). Paper size beyond A4
  // (Letter/Legal) is applied via a named @page (public/css/styles.css);
  // A4 relies on the existing default/`.report-page--landscape` rules
  // unchanged, so nothing about an A4 report's CSS path changes here.
  // `colours:false` (DOSH's case) skips applying Primary/Secondary Colour
  // regardless of what's set — its official government-form layout stays
  // black-and-white unconditionally, matching renderBranding's showLogo/
  // showStamp overrides.
  const HEX_COLOUR_RE = /^#[0-9a-f]{6}$/i;
  function pageAttrs(company, structuralOrientation, { colours = true } = {}) {
    const c = company || {};
    const paper = (c.defaultPaperSize || "A4").toLowerCase();
    const landscape =
      structuralOrientation === "landscape" ||
      (structuralOrientation !== "portrait" && (c.defaultOrientation || "Portrait") === "Landscape");
    const cls = landscape ? "report-page--landscape" : "";
    let style = "";
    if (paper !== "a4") style += `page:report-${paper}${landscape ? "-landscape" : ""};`;
    if (colours) {
      if (HEX_COLOUR_RE.test(c.primaryColour || "")) style += `--report-primary:${c.primaryColour};`;
      if (HEX_COLOUR_RE.test(c.secondaryColour || "")) style += `--report-secondary:${c.secondaryColour};`;
    }
    return { class: cls, style };
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
    renderWatermark,
    renderConfidentialBanner,
    documentNumber,
    renderDocInfo,
    renderSignatureBlock,
    pageNumber,
    renderFooter,
    renderGeneratedNote,
    pageAttrs,
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
