# Handoff: DOSH Chemical Register — PDF/Excel Export Rebuild

## Overview
Rebuilds the "DOSH Chemical Register" generated report (`/chemical/dosh-register`) in
**syakirbadry-tech/Safety-and-Health-Asbenz-Motors** so its Print/PDF and new Excel
export match the official DOSH "Guidelines for the Preparation of a Chemical Register"
(Appendix 4/5) layout: Section A (Company Info) as its own printed page, Section B
(chemical list) as a grouped-header table with `Type of Control Measures →
Engineering Control / PPE`, auto-paginating, Section C (Prepared/Reviewed By) on the
final page.

## About these files
These are **real drop-in code for the existing app**, not HTML mockups to reinterpret —
this codebase already exists (Node/Express + vanilla JS + Airtable), and the task is to
paste these into the existing files at the exact insertion points below, then wire the
two schema gaps noted under "Remaining work." `dosh-chemical-register-template.html`
is the one exception: a static reference file (with literal `{{ }}` placeholders) showing
final Section A/B/C layout/CSS in isolation — useful for design QA, not meant to be
served as-is.

## Fidelity
High-fidelity. Grounded directly in the real repo (read via GitHub): exact field IDs from
`server/lib/schema.js`, the real `/chemicals/reports/dosh-register-data` endpoint, and
the real `renderDoshReport` function in `public/js/pages/chemical.module.js`. Colors,
spacing, and copy match the official guideline's black-and-white form styling — no new
palette introduced.

## Files in this bundle
| File | Replaces | Insertion point |
|---|---|---|
| `dosh-register-data.route.js` | `server/routes/chemicals.js` | The existing `router.get("/reports/dosh-register-data", ...)` handler — replace it whole. |
| `dosh-report.render.js` | `public/js/pages/chemical.module.js` | The existing `Router.register("/chemical/dosh-register", ...)` block **and** the `renderDoshReport` function — replace both. Everything else in that file (the Add Chemical wizard, `COMPANY_SETTINGS_FIELDS`/`DOSH_GEN_FIELDS` constants, the company-info editor modal below `renderDoshReport`) is unchanged. |
| `dosh-register.css` | `public/css/styles.css` | Additive — append after the existing "DOSH Chemical Register (generated report)" block. Existing `.dosh-report`/`.dosh-table`/`@media print` rules stay. |
| `dosh-chemical-register-template.html` | — (reference only) | Not served by the app; open directly in a browser for a static preview of the final layout. |

## Screens / Views

### Section A — Company Information (own printed page)
- Full A4-landscape page, `0.4in` padphysical margin, black text on white.
- Title bar: `REGISTER OF CHEMICALS HAZARDOUS TO HEALTH`, centered, bordered, 15px bold, with a Regulation subtitle beneath (10px, gray `#555`).
- `SECTION A : COMPANY INFORMATION` — black bar, white bold text, 12.5px.
- Form fields (Name, Address, City, Postcode, State, Telephone, Email, DOSH Reg. No., Code of Sector, Class of Industry) render as **individual character boxes**: one 18×18px bordered square per letter (`.charbox`), spaces render as an empty box gap — matches the guideline's actual form fill-in style (verified from the PDF's extracted text, which showed single-letter spacing throughout every field).
- Company Activity: 5-item checkbox row (Manufacturer/Importer/Distributor/Formulator/End-User), each a 26×20px bordered box showing `✓` when active — sourced from Company Settings' `companyActivity` multi-select field.
- Footer: `Page 1 of {N}` bottom-right, 9px gray.

### Section B — List of Chemicals Hazardous to Health (1+ pages)
- `SECTION B : LIST OF CHEMICALS HAZARDOUS TO HEALTH` black bar.
- Meta row: Location / Process Operation / No. of Hazardous Chemicals — bordered strip, 11.5px.
- Table, 9-9.5px, `border-collapse: collapse`, every cell bordered `1px solid #000`.
- **Two-row header**: row 1 has every column `rowspan="2"` except one `colspan="2"` cell reading `Type of Control Measures`; row 2 has just `Engineering Control` and `PPE` beneath it. Header background `#e5e5e5`.
- Columns, in order: Product Name, Name of Chemical, CAS No., Physical Form, Active Ingredients, Quantity, Type#, Class, CSDS (Y/N), Label (Y/N), Complies CPL 1977 (Y/N), Workers Exposed, Usage of Chemical, Engineering Control, PPE, Supplier Name/Address/Contact.
- **Row unit = one substance, not one product** (see "Multi-substance products" below) — no merged/rowspan body cells; every row repeats the full product-level data.
- Pagination: 8 rows/page; the final page caps at 5 rows so Section C fits below it on the same sheet (matches the guideline's Appendix 5 blank-form pagination, where Section C sits directly under the last table page).
- Footer: `Page {N} of {total}` bottom-right per page.

#### Multi-substance products
A product/chemical can have many linked Substances records (see the user's own screenshot: "Hinterachsgetriebeöl MB 235.62" → 6 substances). Confirmed behavior (per direct user feedback in this conversation):
- One table row **per substance**, not per product.
- **No merged/rowspan cells** — every row repeats the product-level columns in full (Product Name, Physical Form, Quantity, Type#, Class, CSDS, Label, Complies CPL, Workers Exposed, Usage, Engineering Control, PPE, Supplier).
- **"Name of Chemical" is always literally `Not Applicable`** for these rows — the product itself has no single named chemical.
- The substance's own name + concentration go in **Active Ingredients** instead, formatted as `{{chemicalName}} ({{concentration}})`, e.g. `Polysulfides, di-tert-Bu (≤ 5 %)`.
- CAS No. is the substance's own CAS number (`—` if the substance has none, e.g. UVCB/reaction-product substances).

### Section C — Name of Person Who Prepared or Reviewed (bottom of final Section B page)
- `SECTION C : NAME OF PERSON WHO PREPARED OR REVIEWED` black bar.
- Two-column grid: Prepared By / Reviewed By, each with Name, Title, Date (editable inputs in the live app — `#doshPreparedName` etc., unchanged from the existing implementation) and a signature line (`1px solid #000` top border, "(Signature)" label beneath).

## Interactions & Behavior
- **Print/PDF**: unchanged mechanism — `window.print()`, browser-native, no server PDF library (matches the app's existing stated philosophy in `styles.css`'s comment). New CSS makes each `.dosh-page` `break-after: page` (last page `break-after: auto`), pins `@page { size: A4 landscape; margin: 0 }`, and repeats the Section B `<thead>` + guards rows with `break-inside: avoid`.
- **Excel export** (new): a second toolbar button, "Export Excel", next to the existing "Print / Save as PDF". Lazily loads ExcelJS from CDN (`https://cdn.jsdelivr.net/npm/exceljs@4.4.0/...`, no build-step dependency added) on first click, builds a workbook with merged/bordered Section A + a real header-grouped Section B table (frozen header row, `printTitlesRow` so it repeats on every printed Excel page) + Section C, landscape + fit-to-width page setup, then downloads as `chemical-register-{date}.xlsx`.
- **Generation audit log**: unchanged — `POST /dosh-register-generations` still fires once per Print click, logging generatedBy/preparedBy/reviewedBy exactly as before.
- **Admin-only "Edit Company Info"**: unchanged, still gated on `Auth.user()?.role === "Admin"`.

## State Management
No new client-side state beyond what already exists (`data` from the one `/chemicals/reports/dosh-register-data` fetch). Pagination (`doshBuildPages`) is a pure function over `data.rows`, recomputed on render — nothing persisted.

## Design Tokens
- Ink: `#000` text/borders on `#fff` — no color, matches the official monochrome DOSH form (explicit user preference, confirmed earlier in this conversation).
- Header/section bars: `#000` background, `#fff` text.
- Table header tint: `#e5e5e5`.
- Font: Arial/Helvetica sans-serif throughout, 9–15px depending on section (form fields 12px, table 9–9.5px, titles 14–16px).
- Spacing: `0.4in` page padding; `18px` character boxes; `8px`/`4px` cell padding in tables.

## Assets
None — no logo in the original guideline template (explicit choice: "Keep it exactly as the original (no logo)"), no icons, no imagery.

## Remaining work (flagged, not fabricated)
1. **3 missing Airtable fields on `chemicals`**: `Type#`, `Class` (coded hazard type/class per the guideline — distinct from the existing free-text `Hazard Classification`), and `Complies with CPL Regulation 1977 (Y/N)`. All three render `—` in the patch until added; add them + register the field IDs in `server/lib/schema.js`, then read them directly in `dosh-register-data.route.js`.
2. **Multi-register export framework**: this pass only rebuilds Chemical Register. Generalizing to Noise/Machinery/CAPA/Committee/Training registers needs a shared config (columns, section labels, data endpoint) driving one PDF+Excel renderer instead of each module hardcoding its own `render*Report` — worth doing once a second register needs the same treatment.
3. Excel export is client-side/on-demand only; no server-generated-file endpoint exists (not needed unless you want scheduled/emailed exports later).

## Source repo
`github.com/syakirbadry-tech/Safety-and-Health-Asbenz-Motors` (branch `main`) — all field IDs, table IDs, and existing function names above are copied verbatim from `server/lib/schema.js`, `server/routes/chemicals.js`, and `public/js/pages/chemical.module.js` as they exist in that repo today.
