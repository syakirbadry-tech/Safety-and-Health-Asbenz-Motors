# Company Profile — Central Administration Implementation Report

Expands Company Profile from a company-info form into the single administration surface for everything a generated report's appearance depends on: branding, document defaults, signatories, and export settings — edited entirely from the frontend, with every report reading it automatically. Architecture is documented in `ARCHITECTURE.md` §5.7; this report covers what was built, how it was verified, and what's left.

## Files changed

**Backend**
- `server/lib/schema.js` — 28 new field IDs registered under `companySettings.fields`.
- `server/lib/companyProfile.js` — `getCompanyProfile()` returns every new field, plus derived `exportSettings` (10 booleans) and `signatures` objects.
- `server/routes/companySettings.js` — `attachmentFields` gained the 4 new image fields (watermark + 3 signatures); no new routes (upload/delete reuse the existing generic endpoints).

**Frontend**
- `public/admin.html` — Company Profile tab expanded to 5 sections (Company Information, Branding, Document Settings, Signatories, Export Settings) plus an unsaved-changes banner and a Preview Report button.
- `public/js/admin.js` — `mountCpImageUpload` (one reusable drag-and-drop component for all 6 image fields), dirty-state tracking + tab-switch guard, colour picker sync, extended validation, expanded save/load, Preview Report handoff via `sessionStorage`.
- `public/js/modules.config.js` — `MODULES.companySettings` field-ID map and `attachments` array extended.
- `public/js/services/reportEngine.js` — `renderBranding`/`renderSignatureBlock` made company-driven; new `renderWatermark`, `renderConfidentialBanner`, `documentNumber`, `renderFooter`, `renderGeneratedNote`, `pageAttrs`; `renderDocInfo` made company-aware.
- `public/css/styles.css` — watermark/confidential-banner/3-column-signature-grid/signature-image styles, colour custom-property hooks, Letter/Legal named `@page` rules.
- Six report files (`chemical.module.js` ×2, `machinery.module.js`, `actions.module.js`, `oshCommittee.module.js`, `companyProfile.module.js`) — adopted the company-driven engine calls, dropped their own override/hardcoded-prefix/footer code.
- `public/js/pages/companyProfile.module.js` — new `/company-profile/preview` route.

## Components created

- **`mountCpImageUpload(slot)`** (`admin.js`) — the one reusable upload component behind Logo, Stamp, Watermark, and the three signature fields: drag-and-drop, click-to-browse, type/size validation, oversized-dimension warning, duplicate-upload prevention, Airtable-thumbnail preview, Remove button.
- **`ReportEngine.pageAttrs(company, structuralOrientation, opts)`** — single place resolving a report page's orientation class, non-A4 paper-size named `@page`, and colour custom properties, replacing what would otherwise be per-report conditional logic.
- **`/company-profile/preview`** — a second report route, reached only from the Admin form, rendering a synthetic sample register through the same `ReportEngine` calls a real report uses.

## Database changes

28 new fields, additive, all on the existing Company Settings table (`tbllJtwpaBgF04ra1`) — no new table, matching the "one record" requirement. Full list in `ARCHITECTURE.md` §5.7. Notably: the 10 Export Settings toggles (plus Company Confidential/Default Paper Size/Default Orientation/Default Language) are `singleSelect` fields, not checkboxes — Airtable's REST API omits an unchecked checkbox from a record's `fields` entirely, indistinguishable from "never touched," so a checkbox can't reliably represent "the admin explicitly turned this off." A select's explicit choice is always returned.

## Report engine integration

Before this pass, each report's data endpoint already called `getCompanyProfile()` (from the prior Print/Export Engine work), but each report's **render function** still had to pass its own `{ showLogo: true, showStamp: true }` overrides, build its own hardcoded document-number prefix, and hand-write its own page-number/footer/"Generated..." markup. This pass pushed that logic into `ReportEngine` itself:

- `renderBranding(company, overrides)` — `overrides` is now for a report's own hard structural reason only (DOSH's `showLogo:false`); every other report just passes `company` and inherits the admin's Export Settings.
- `renderSignatureBlock` — always 3 columns (Approved By is now a standard signatory), embeds a signature image when one's uploaded.
- `renderFooter`/`renderGeneratedNote`/`renderDocInfo` — single implementations honoring Export Settings, used by all 6 reports instead of 6 hand-written versions.
- `pageAttrs` — orientation/paper-size/colour in one call; DOSH opts out of colour via `{ colours: false }`, the one report that must stay unconditionally black-and-white (its official government-form layout).

Net effect: a report template's job is now purely "lay out my own columns and call the shared primitives" — no report re-derives or re-passes a show/hide flag.

## Testing performed

No automated test suite exists for this browser-rendering feature; verification was a headless-Chromium (Playwright) pass against live production Airtable data, using a throwaway `dev-verify@local.test` Admin account (continuing the approach approved in the prior Print/Export Engine session):

- All 5 admin form sections render; 10 export-setting checkboxes and 6 upload slots confirmed present.
- Save → reload round-trip confirmed for text fields, colour, and a logo upload (persisted correctly after a full page reload).
- Logo upload → Remove round-trip confirmed (attachment field correctly cleared via `PATCH .../[]`).
- Watermark and a signature (Prepared By) upload confirmed via direct Airtable record inspection after an initial test-script timing race gave a false negative (fixed by waiting for the actual DOM update rather than a fixed delay — not an application bug).
- Dirty-state guard confirmed in both directions: canceling the "unsaved changes" confirm dialog keeps you on the Company Profile tab; accepting it switches away.
- All 6 real reports (DOSH, Chemical Register, Machinery, CAPA, OSH Committee, Company Profile) re-verified after the `ReportEngine` refactor: zero console errors, correct real-data rendering (DOSH: 18 pages against 134 live substance rows — the underlying production data grew between sessions, unrelated to this change).
- DOSH specifically re-confirmed unconditionally black-and-white (no logo, no admin-set colour) with its new 3-column signature grid, and its document-number prefix unaffected by the admin's "ASB" Document Prefix setting (DOSH keeps its own fixed code).
- Company Profile report and the new Preview Report both confirmed picking up an admin-set Primary Colour (section headers, title border) — proving the colour pipeline works end-to-end and only where it's supposed to.
- Export Settings toggle verified functionally, not just cosmetically: turning off "Show Page Numbers" and saving made the page-number element actually disappear from a real report's rendered output; re-enabling brought it back.
- Excel export re-verified downloading a valid `.xlsx` after the engine refactor.
- Preview Report confirmed rendering via the same engine, reflecting unsaved form edits (document prefix, colour) before Save was clicked.

**Cleanup**: Company Settings is a genuine single global record, not scoped to the test account. It was empty (`null`) before this session. After testing, the test record (test company name, industry text, "ASB" prefix, blue test colour, 1×1 test images for logo/watermark/signature) was deleted via the API, restoring the pre-session empty state — real branding data was never present to overwrite.

## Remaining recommendations

- **Populate a real Company Profile record** (real logo, real signature images, real colours) and spot-check all 6 reports once — everything was verified against a 1×1 test PNG, which confirms the plumbing but not real-world visual quality (image aspect ratio, a colour that's too light against white section-head text, etc.).
- **CAPA and OSH Committee** still haven't been seen with populated (non-empty) data in this environment — worth a look once real records exist, particularly the 3-column signature grid and Approved By on a genuinely multi-page render.
- **Default Language** is stored but not translated — if multi-language reports become a real requirement, that's a separate, larger i18n effort (every report template's hardcoded English strings would need externalizing).
- **Default Orientation/Paper Size beyond A4** are wired but only exercised in this pass for the reports without a structural requirement — worth a print-preview check with a real Letter/Legal choice if a user outside Malaysia's A4-standard workflow needs it.
- Consider whether the throwaway `dev-verify@local.test` Admin account (used for this and the prior session's verification) should be deleted from Users now that both passes are complete.
