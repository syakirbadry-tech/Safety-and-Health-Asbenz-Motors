# Enterprise EHSMS Architecture — Asbenz Motors Sdn. Bhd.

## 1. Purpose and vision

This project is evolving from a compliance tracker into a scalable Enterprise Environment, Health & Safety Management System (EHSMS) for Asbenz Motors Sdn. Bhd. The current implementation establishes the foundations of a modern EHS platform: role-based access, structured compliance modules, audit logging, document management, and AI-assisted data capture.

The long-term objective is to support regulatory readiness for OSHA 2022, DOSH expectations, and ISO 45001-aligned governance while remaining practical for day-to-day operations in a manufacturing or workshop environment.

## 2. Current solution scope

The platform is being reorganized around business-function modules (see §5). Two are fully built on the module framework:

- **Machinery** — asset register, certificates of fitness, preventive/corrective maintenance, inspection, calibration
- **Chemical Management** — chemical register, exposure monitoring, storage/label inspection, waste management, CHRA (reused as risk assessment)

Three remaining domains are still reachable through the original flat-list pattern pending their own milestone:

- HRA (Health Risk Assessment) — will become Noise Management
- HIRARC (Hazard Identification, Risk Assessment and Risk Control) and SOP (Standard Operating Procedures) — will merge into Operational Safety

It also includes:

- Authentication and role-based authorization
- Admin panel for user management and governance
- Activity/audit trail logging
- File upload support for compliance documents
- AI-assisted extraction for machinery license documents

## 3. Architectural overview

### 3.1 Presentation layer

The frontend is a lightweight, browser-based web application served as static assets from the Express server. As of the business-function redesign (see §5), it is a single-page app shell with real client-side routing — still plain HTML/CSS/vanilla JavaScript, no build step, no framework — rather than one static dashboard page with a modal overlay for everything.

- Public pages:
  - Login page (`login.html`)
  - App shell (`index.html`) — sidebar + router-driven `#view` region
  - Admin console (`admin.html`) — unchanged, independent of the router
- Frontend implementation:
  - Plain HTML, CSS and vanilla JavaScript, loaded as classic `<script>` tags in a fixed dependency order (no bundler)
  - `public/js/router.js` — a small History-API router. Registers `path pattern -> render function` and swaps `#view`'s content; `[data-navigate]` on any element triggers in-app navigation without a full page reload. The Express catch-all (`app.get("*", ...)`) already serves `index.html` for every path, so deep links and refreshes work unchanged.
  - `public/js/components/` — reusable, mostly pure render functions shared by every module dashboard: `kpiCard`/`kpiRow`, `statusPill`, `dataTable`, `breadcrumb`, `mountTabs` (interactive tab panels with lazy per-tab rendering), `activityFeed`. New modules should reuse these rather than writing bespoke markup.
  - `public/js/services/linkedTableService.js` — a generic CRUD factory (`list`/`get`/`create`/`update`/`remove`/`upload`/`getProfile`) for any table built on the server's `buildModuleRouter` pattern. Every module's services are built from this one factory — no module needs a hand-written service file.
  - `public/js/framework/moduleFramework.js` — the generic business-module engine (see §5.2). `defineBusinessModule(config)` turns a declarative config object into a full Register/Dashboard/Profile page set.
  - `public/js/pages/` — one config file per business module (`machinery.module.js`, `chemical.module.js`, …) plus the top-level `dashboard.js`. A module's page file is data, not page-rendering code — see §5.2.
  - `public/js/app.js` — shell bootstrap: profile bar/auth wiring, the shared `#overlay` record-form modal (used for master-record create/edit + attachment upload, including the AI license-extract flow), the legacy per-table overlay list/form for modules not yet migrated to a business-module config, and finally `Router.start()`.
  - UI is optimized for desktop and mobile-responsive access

### 3.2 Application layer

The backend is implemented in Node.js with Express.

Key responsibilities:

- Session and token validation
- Role-based access enforcement
- CRUD operations for each compliance module
- File upload handling
- Audit logging
- Admin operations such as user management, export/import, health monitoring

The server is organized into:

- Entry point: server/index.js
- Routes: server/routes/
- Middleware: server/middleware/
- Shared libraries: server/lib/
- Utility scripts: server/scripts/

### 3.3 Data layer

The current persistence layer is Airtable.

This is a pragmatic and fast-to-implement choice for early deployment, but it introduces architectural constraints that should be addressed as the system matures. The current data access layer is abstracted behind server/lib/airtable.js so that the rest of the application does not interact with Airtable directly.

### 3.4 Security model

The current security model is built around:

- JWT-based authentication
- Password hashing using bcrypt
- Role-based access control with Admin and non-Admin roles
- Server-side enforcement for write operations
- Activity logging for accountability

## 4. Runtime flow

A typical user journey is as follows:

1. User signs in through the login page.
2. The server validates credentials and issues a JWT.
3. The frontend stores the token and sends it on subsequent API calls.
4. The server validates the token and enforces access permissions.
5. The request is routed to the corresponding compliance module handler.
6. Data is read from or written to Airtable through the shared Airtable wrapper.
7. Activity events are recorded in the activity log table.

## 5. Module architecture

### 5.0 Business-function redesign (current direction)

The platform is being reorganized from document-oriented modules (one tile per Airtable table) into business-function workspaces — each a complete dashboard, not a single list:

- **Machinery** — asset register, certificates of fitness, preventive/corrective maintenance, inspection, calibration, risk assessment, documents, reports. **Built on the generic module framework** (§5.2).
- **Chemical Management** — supersedes the standalone "CHRA" tile; chemical register/inventory, exposure monitoring, storage/label inspection, waste management, SDS library, CHRA (reused as risk assessment), Emergency Spill Procedure. **Built on the generic module framework** (§5.2), proving it generalizes beyond Machinery.
- **Noise Management** — supersedes the standalone "HRA" tile; will add noise monitoring, noise mapping, engineering controls, audiometric testing, employee exposure tracking. Not yet built.
- **Operational Safety** — merges "HIRARC" (high risk) and "SOP"; will add permit-to-work (LOTO, working at height, hot work, confined space, electrical, lifting, excavation), contractor safety, general inspection forms. Not yet built.

Noise Management and Operational Safety are scheduled as the next milestones (PROJECT_ROADMAP.md), each expected to be a config file on the existing framework rather than new page-rendering code. Until a module's dashboard ships, its tile on the main Dashboard opens the classic record list/form it has always used (HRA, HIRARC, SOP) — nothing already working is removed while the rebuild is staged.

### 5.1 Navigation pattern

Every business-function module follows the same navigation depth, enforced by the framework itself (never wire a tile directly to a raw table list):

```
Dashboard -> Module Dashboard -> Register -> Profile -> History / Documents / Reports
```

Concretely for Machinery: `/` -> `/machinery` (Overview + section tabs) -> `/machinery/register` (Machine Register) -> `/machinery/:id` (Machine Profile) -> the profile's own tabs. Chemical Management follows the identical shape at `/chemical`.

### 5.2 The module framework

`public/js/framework/moduleFramework.js` turns a declarative config object into a full working module — Register page, Module Dashboard (Overview + one tab per sub-table + optional Risk Assessment + Documents + Reports), Profile page (General Information + optional merged "history" tab + one tab per sub-table + Photos + Attachments + Risk + Activity Timeline), and the sub-record CRUD form shared by every module. `server/lib/profileAggregation.js` is the backend half: `buildProfileRoute({ masterTableId, masterNameFieldId, subTables })` builds a module's `GET /:id/profile` endpoint from the same shape of config.

A module config describes:
- `master` — which `MODULES.<key>` entry (in `modules.config.js`) holds the master table's field map; master-record create/edit/delete and its own attachments (License Document, SDS, Photos, …) go through the existing `openRecordForm`/`openModuleList` overlay unchanged — the framework doesn't reinvent that, it wraps a workspace around it.
- `subTables` — one entry per linked Airtable table (field-ID map, form field metadata, which columns to list, optional "due soon / overdue" or "open count" KPI wiring).
- an optional `historyTab` (merges two or more sub-tables into one timeline — Machinery uses this for Preventive + Corrective Maintenance; Chemical Management doesn't, since none of its sub-tables share an obvious merged view),
- an optional `riskAssessment` (points at an existing table to reuse as the module's Risk Assessment tab — HIRARC for Machinery, CHRA for Chemical Management — never a new table),
- `photos`/`documents` config for the attachment-gallery and cross-record Documents tabs,
- an optional `extraDashboardTabs` escape hatch for a module-specific tab that doesn't fit the generic sub-table shape (Chemical Management's Emergency Spill Procedure, which filters the shared SOP table by a `Document Type` field instead of using a dedicated table; also how its "DOSH Register" launch tab is wired in),
- an optional `customAddHandler` — when a module's "+ Add" flow needs to be more than the plain master-record overlay form, this is called instead of the default `openRecordForm(modulesKey, null)` for both the Register page's Add button and the Dashboard's quick-add button. Chemical Management uses this for its SDS-driven "+ Add Chemical" wizard (upload SDS → AI extraction → one combined editable review screen, covering both the AI-extracted fields and workplace-specific fields) — see §5.2.1. Machinery doesn't set it, so it keeps the default.

Two reference configs exist: `public/js/pages/machinery.module.js` (the original implementation, extracted into this shape without behavior change — verified via a full regression pass) and `public/js/pages/chemical.module.js` (built directly on the framework — the only new page-rendering code Chemical Management needed beyond config was the wizard and the DOSH register report, both module-specific bespoke additions in the same spirit as Machinery's AI license-extract endpoints). A future module (Noise Management, Operational Safety) should only need the same: new Airtable tables + a new config file.

#### 5.2.1 DOSH-compliant Chemical Management: two-layer design

Chemical Management is deliberately split into two layers, per the DOSH "Guidelines for the Preparation of a Chemical Register" (USECHH Regulations 2000):

- **Layer 1 — the operational system.** The module framework's usual Dashboard/Register/Profile pages, plus the SDS-driven "+ Add Chemical" wizard and a versioned `SDS Documents` table (§3.4.2 of DATABASE.md) — this is the daily working interface.
- **Layer 2 — DOSH compliance.** A generated, read-only report (`/chemical/dosh-register`) that reproduces the guidance document's Section A (Company Information) / Section B (per-**Substance** hazard-and-usage table, v2.1 — one row per linked Substance, not per Chemical, see DATABASE.md §3.4.4) / Section C (Prepared By/Reviewed By) layout entirely from Layer 1 data — nothing is filled in twice. `GET /api/chemicals/reports/dosh-register-data` aggregates it server-side, including several values computed at request time rather than stored (CSDS Y/N, Label Y/N, Type# code, Class) since all already exist elsewhere in the system. The browser's native "Print to PDF" produces the PDF — no server-side PDF-generation dependency. Excel export (v2.1) is a real formatted `.xlsx` built client-side with ExcelJS, lazy-loaded from a CDN on first click — the app's one deliberate exception to "no new dependency." This report is now built on the shared Print/Export Engine (§5.6), which every other generated report also uses for its own Excel export; the Chemical Register **list page's** own "Export Excel" toolbar button (distinct from its dedicated print report, §5.6) is unrelated and stays plain client-side CSV.

SDS revisions are never overwritten: `server/routes/sdsDocuments.js` intercepts record creation so that saving a new revision as the Current one automatically flips any prior Current revision(s) for that chemical to Superseded, preserving full history — the one route in the app where the generic `buildModuleRouter` factory's default create behavior wasn't reusable as-is (see the code comment there for why).

#### 5.2.2 Chemical Lifecycle Management v2.0

A further redesign — additive on top of §5.2.1, not a rewrite — turns Chemical Management into a Product → SDS Revisions → Substances → Storage/Label/Waste/Training → Documents → CHRA lifecycle, adding four new generic primitives to the module framework (available to any future module, not Chemical-specific):

- `postProcess(result, master)` — an optional hook on `buildProfileRoute` (`server/lib/profileAggregation.js`) that lets a module attach derived fields to its profile response, computed from data the route already fetched (no extra Airtable calls). Chemicals uses it for a compliance summary, an aggregated cross-sub-table document list, and derived General Information fields (current SDS, its time-based expiry status, physical form) — see DATABASE.md §3.4.3.
- `documents: { mode: "aggregated" }` — the Profile page's Documents tab renders the `postProcess`-computed document list instead of the legacy fixed-field list, replacing the separate Photos + Attachments tabs entirely. `fields` is kept alongside for the Module Dashboard's cross-chemical Documents tab, which still uses the legacy per-field shape (aggregating every chemical's full sub-table documents there would be an expensive fetch — open a specific chemical's profile for its full list).
- `profileHeaderFields` (per sub-table) — renders selected master-record fields above a sub-table's history list, for tabs that merge a static "profile" with a "history" (Chemical Management's Storage tab: storage-profile fields above the Storage Inspection list).
- `registerFilters` — an opt-in Filter/Search/Quick-Filter/Export toolbar on the Register page, sourced from a pre-enriched data endpoint (avoids an N+1 fetch for derived columns) rather than the plain master-record list.
- `extraProfileTabs` / a `t.condition(record)` predicate on `profileSubTabs` entries — a Profile-page tab (real sub-table or bespoke placeholder) only renders when the condition passes. Drives Chemical Management's conditional modules: Exposure Monitoring/LEV/Biological Monitoring/Health Surveillance each gated by its own manual, assessor-set "`<X>` Required" flag on `Chemicals` — deliberately not AI-inferred, for compliance-auditability reasons. LEV/Biological Monitoring/Health Surveillance don't have real tables yet (future milestones per PROJECT_ROADMAP.md); their tabs show a short placeholder instead of a broken list, so the module is future-ready without another redesign.
- `Components.kpiCard`'s `tabKey`/`navigate` — every KPI card is now clickable, jumping to the corresponding sub-table tab (within the same Module Dashboard) or navigating to the Register page.

**Master-Detail Cockpit** (`/chemical/cockpit`, `public/js/pages/chemicalCockpit.js`) is a genuinely new, additional interface — not a config-only extension — inspired by SAP/Salesforce/XENTRY-style split-pane cockpits: left pane is the Chemical Register (reusing `registerFilters`'s data endpoint), right pane is a read-only, collapsible Overview built from a new `Components.mountAccordion` (sibling to the existing `mountTabs` — every section can be open at once, each lazily rendered on first expand) over the same profile response the full Chemical Profile page uses. Selecting a different chemical updates the right pane with no page reload; an "Open Full Chemical Profile" button links to the unmodified, still-current Chemical Profile page — per the brief, this cockpit does not replace it.

#### 5.2.3 Platform foundation services (Event Bus, Configuration Service, AI Extraction Logging)

Added ahead of the v2.0 Chemical Management work so nothing built on top needs redoing as the platform grows into a multi-project foundation (OSH-C is the first of several planned applications on it). All three are additive, module-independent, and have no consumers yet — they only prepare the ground:

- **Event Bus** (`server/lib/eventBus.js`) — a thin wrapper around Node's `EventEmitter`; the wrapper is the seam that lets a real broker (Redis pub/sub, n8n webhook, …) replace it later without touching call sites. `buildModuleRouter` accepts an optional `eventPrefix`; when set, create/update/delete/upload emit lifecycle events (`<Prefix>.Created`, etc.), plus a generic `Document.Uploaded` on any attachment upload regardless of module. Modules that don't set `eventPrefix` are completely unaffected. Future consumers (Notification Engine, Workflow Engine, Audit Trail, AI Agents) subscribe with `eventBus.on()`/`onAny()` — none exist yet.
- **Configuration Service** (`server/lib/config.js`, `server/config/features.json`, `GET /api/config/flags`) — centralized feature flags, file-backed for now (everything defaults to enabled). The `isEnabled`/`getConfig` interface is what a future Airtable- or Admin-panel-backed store would implement behind, mirroring how `server/lib/airtable.js` already abstracts the data layer for the rest of the app.
- **AI Extraction Logging** (`server/lib/aiExtractionLog.js`, new `AI Extraction Logs` table) — every Gemini extraction call (license or SDS) logs model, prompt version, duration, and success/failure, purely for future AI-operations monitoring — never affects the extraction's own return value or error handling. Also emits `AIExtraction.Completed`/`AIExtraction.Failed` on the Event Bus.

#### 5.2.4 Management capabilities — Corrective Actions/CAPA and OSH Committee

Two new business modules, built between Chemical Lifecycle Management v2.0 and Noise Management per the decision to prioritize cross-cutting management capabilities. Both proved the framework fits modules with **zero sub-tables** (`subTables: {}`, `profileSubTabs: []`) just as well as ones with several — the Dashboard/Register/Profile/Documents/Activity shape degrades gracefully when there's nothing to hang off the master record yet.

- **Corrective Actions (CAPA)** (`/capa`, `public/js/pages/actions.module.js`) — one `Actions` table (DATABASE.md §3.9), presented as a single register rather than two separate modules for "CAPA" and "Action Tracking." This uses `registerFilters` (§5.2.2) with its quick filters *ordered* so "CAPA" (Corrective + Preventive) is `quickFilters[0]` — `mountFwRegisterFilters` already defaults to the first entry, so no framework change was needed to make CAPA the default view and "All Actions" a broader one within the same page.
- **OSH Committee** (`/osh-committee`, `public/js/pages/oshCommittee.module.js`) — master = `OSH Committee Meetings`. `OSH Committee Members` is a **separate small page** (`/osh-committee/members`, `public/js/pages/oshCommitteeMembers.js`), not a sub-table — a member attends many meetings and a meeting has many attendees, a many-to-many shape the module framework's master/sub-table assumption doesn't fit. Rather than force it in either direction, Members gets its own real route (per the Navigation Principle in MASTER_PROMPT.md — every business surface gets a URL, not just a modal) built from the same primitives every other page already uses: `Components.dataTable` for the list and the existing `openRecordForm` modal for add/edit, with zero new form code. Because it isn't a framework module, `openRecordForm`'s automatic post-save refresh (keyed off `FRAMEWORK_MODULE_BASE_PATHS`) doesn't recognize it — the page works around this by setting `modalTouchesModulePath` itself right after opening the form, reusing `closeModal()`'s existing generic refresh logic rather than adding a second one.

Two small generic additions to `moduleFramework.js` came out of building these, both optional and unused by every existing module:
- `config.relatedLinks: [{ label, path }]` — extra quick-action buttons on a module's Overview tab pointing at a related-but-not-master-detail page (used here for OSH Committee → Committee Members).
- `extraOverviewKpis(dataByKey, masters)` — the `masters` argument is new (previously only `dataByKey`, the sub-table data, was passed). Corrective Actions/CAPA's "Open Actions"/"Overdue Actions" KPIs are computed from the master `Actions` list itself, not a sub-table, which the hook couldn't reach before this.

The top-level Dashboard (`public/js/pages/dashboard.js`, "Management Dashboard") gained a Chemical Management KPI row (previously Machinery-only — itself a gap this closed), a Corrective Actions/CAPA KPI row, an OSH Committee snippet, and an "Open Corrective Actions" mini-table (top 5 overdue actions across every source module, each linking to its Action profile) — same hand-rolled per-section fetch shape Machinery's row already used, not a new abstraction (not worth generalizing until a third module needs the identical shape again).

### 5.3 Legacy per-table modules (HRA, HIRARC, SOP)

Each remaining compliance module still follows the original architectural pattern until its business-function milestone ships:

- A route definition for CRUD operations
- A shared generic router builder for consistent behavior (`server/lib/moduleRouter.js` — `buildModuleRouter`, also reused for every module-framework sub-table)
- Field mapping through a centralized schema definition
- Attachments handled through file upload endpoints
- Audit events emitted for every create, update, delete and upload action

### 5.4 Admin capability layer

`public/admin.html`/`public/js/admin.js` — a tab-based page, deliberately independent of the SPA router (§3.1), providing governance control for:

- **Data Browser** — a dense, spreadsheet-style editable grid over every module in `MODULES` (`modules.config.js`); reuses each module's existing CRUD routes, no separate data-access code.
- **Users & Roles** — onboarding, role assignment, temporary password management, account status.
- **Company Profile** (v2.1) — see §5.5.
- **Login & Activity History** — the full audit trail (DATABASE.md §3.2), filterable by action type, including a red-highlighted "Error" filter.
- **Settings** — a system-health snapshot (errors/failed logins in the last 24h, active users, total records) plus per-module JSON export and bulk import (append or typed-confirmation wipe-and-replace).

### 5.5 Company Profile — platform-wide shared module (v2.1)

A reusable "single source of truth" for company information, consumed by every generated report (§5.6) — not a Chemical-Management-specific feature, even though it grew out of the DOSH register's Section A.

- **Not built on the module framework.** Company Settings is a single-row table, not a register of many records, so `defineBusinessModule`'s Dashboard/Register/Profile shape doesn't fit — it's a form, not a workspace. Instead it lives as a new tab in the existing Admin panel (§5.4), reusing the Admin panel's own tab-switching mechanism and the app's standard `.field`/`.grid`/`.section-head` form styling — no new UI primitive was introduced.
- **Backend**: unchanged `server/routes/companySettings.js` (`buildModuleRouter`, same generic CRUD/upload pattern as every other module) — the existing `/api/company-settings` route is reused as-is, per the "no duplicate APIs" requirement; only its `attachmentFields` map gained `logo`/`stamp` entries.
- **Frontend**: `MODULES.companySettings` (new entry in `modules.config.js`) centralizes the field-ID map — the Admin tab's form reads from it rather than hardcoding a second copy, and it doubles as a Data Browser entry for free.
- **Consumers read, never re-enter.** `server/lib/companyProfile.js`'s `getCompanyProfile()` (added when the Print/Export Engine, §5.6, generalized past DOSH) is the single place that fetches and shapes the Company Settings record — every report's `/reports/*-data` endpoint calls it rather than re-fetching or re-shaping company data itself. Nothing about Company Profile is Chemical-Management-specific or imported into `chemical.module.js`'s own code (its old inline "Edit Company Info" modal was deleted; every report links to `/admin.html` instead).
- **Validation**: Company Name required, Phone/Email format-checked client-side (`public/js/admin.js`) before save — the form uses `novalidate` and owns validation itself end to end, rather than relying on the browser's native constraint validation (which would otherwise block submission silently, before the app's own error messages ever ran).

### 5.6 Print/Export Engine

A reusable print/export system behind every generated report — Chemical Register, DOSH Chemical Register, Machinery Register, CAPA Register, OSH Committee Register, Company Profile — instead of one-off code per report. Grew directly out of the DOSH Chemical Register's original bespoke implementation: DOSH was rebuilt first onto the shared engine (proving the extraction changed nothing about its output), then five more reports were added on top of it.

```
Data (per-module server aggregation endpoint, GET /reports/*-data)
  → Report template function (colocated in each module's existing page file)
    → ReportEngine primitives (public/js/services/reportEngine.js)
      → shared .report-* print CSS (public/css/styles.css)
        → Print Preview (the on-screen render itself — no separate preview mode)
          → Browser Print → "Save as PDF" (no server-side PDF library)
```

- **No template-file system.** This is a pure Node/Express + vanilla-JS app with no build step and no precedent for `templates/*.html` files with placeholder syntax. "No business logic inside templates" is achieved the same way every other report in the app already separates concerns: data-shaping/derivation lives in the server's `/reports/*-data` endpoint (e.g. `server/routes/chemicals.js`'s `dosh-register-data`, `server/routes/machinery.js`'s `register-data`); the client's render function only lays out already-shaped plain-property rows.
- **`public/js/services/reportEngine.js`** — plain exported functions (no class, matching `moduleFramework.js`'s own functional style): `paginate`, `charBoxes`, `renderBranding` (logo/company/stamp header, company-driven — see §5.7), `renderDocInfo` (Document No./Version/Generated strip, company-driven), `renderSignatureBlock` (Prepared/Reviewed/Approved By grid with sign-off lines or embedded signature images), `renderFooter`/`renderGeneratedNote`/`pageNumber` (per-page footer and the once-per-report "Generated..." note), `renderWatermark`/`renderConfidentialBanner`/`pageAttrs` (orientation, paper size, colour — §5.7), `mountToolbar` (Print/Save as PDF + optional Export Excel), plus Excel structural helpers (`loadExcelJs` lazy-CDN-loads ExcelJS on first use, `newWorksheet`/`excelSectionHead`/`excelInfoRow`/`excelHeaderRow`/`excelDataRow`/`downloadWorkbook`) and `logGeneration` (a generic audit-log POST wrapper — used by DOSH's own `DOSH Register Generations` table only; the other five reports don't have a generations-log table and don't need one).
- **`public/css/styles.css`'s `.report-*` block** — `.report-page`/`.report-title`/`.report-section-head`/`.report-table`/`.report-table--compact` (wide multi-column registers)/`.report-meta-strip`/`.report-page-number`/`.report-branding`/`.report-doc-info`/`.report-signature-grid`/`.report-signature-grid--3`/`.report-sig-image`/`.report-watermark`/`.report-confidential-banner`/`.report-charbox`/`.report-check-grid`. Portrait by default (`@page{size:A4 portrait}`); a `.report-page--landscape` modifier switches to a named `@page report-landscape{size:A4 landscape}` via the CSS `page:` property, for wide registers (DOSH Section B, Machinery, CAPA); named `@page` rules also exist for Letter/Legal (§5.7).
- **`server/lib/companyProfile.js`'s `getCompanyProfile()`** — the single place every report's data endpoint gets company branding from (§5.5, expanded in §5.7).
- **Entry points differ by module shape, not by inventing a new mechanism per report**: modules using `registerFilters` (Chemical Register, CAPA) get an optional `registerFilters.printReportPath` rendered as a button in the existing Filter/Search toolbar (`moduleFramework.js`) — distinct from that toolbar's existing Export Excel/PDF buttons, which stay unchanged plain CSV/bare-print exports of the filtered grid. Modules using the plain `registerColumns` register (Machinery, OSH Committee) reuse the existing `relatedLinks` dashboard quick-action primitive instead. Company Profile (not a `defineBusinessModule` at all) gets a plain link from its Admin panel tab, since `admin.html` is a separate non-SPA page.
- **PDF export is browser-native everywhere** — `window.print()`, no server-side PDF-generation dependency, consistent with the app's original stated print philosophy. Excel export (where included) lazy-loads ExcelJS from a CDN on first use per report — the app's only runtime third-party script dependency, scoped to reports that opt in.
- **Adding a new report**: (1) add a `GET /reports/*-data` (or reuse an existing one) that returns `{ rows, company }` (call `getCompanyProfile()` for the `company` key); (2) write a `render<X>Report(data, isAdmin)` function using `ReportEngine`'s primitives plus the module's own column list; (3) add a `Router.register` for its route; (4) wire an entry point via `printReportPath` or `relatedLinks` depending on the module's shape. No engine changes needed.

### 5.7 Company Profile as central administration (report branding/export settings)

Company Profile (§5.5) grew from ~20 company-info fields into the single administration surface for everything a generated report's appearance depends on — branding assets, document numbering/footer/paper defaults, a third signatory (Approved By) with an optional signature image per signatory, and ten show/hide export-setting toggles — so an admin never needs to open Airtable directly to change how a report looks, and a change takes effect on every report the next time it's generated.

- **28 new fields, still one Company Settings record** (no new table): Industry/Tax Number/Description; Watermark + Primary/Secondary Colour (hex text, paired with a native `<input type="color">` in the Admin UI for the picker); Document Prefix/Default Version/Document Footer/Default Paper Size/Default Orientation/Default Language/Company Confidential; Approved By (+ Position + signature image), alongside the existing Prepared/Reviewed By (+ new signature-image fields for those two as well); ten Export Settings toggles.
- **Export Settings (and Confidential/Paper Size/Orientation/Language) are `singleSelect` fields, never checkboxes.** Airtable's REST API omits an unchecked checkbox from a record's `fields` entirely — indistinguishable from "never touched." A select's explicit choice (`Show`/`Hide`, `On`/`Off`, `Repeat`/`Don't Repeat`) is always returned, so "unset" cleanly defaults to today's shipped appearance (everything shows) while an admin can still reliably turn a setting off and back on. The Admin UI still presents these as ordinary checkboxes — the select-vs-checkbox distinction is a storage detail `server/lib/companyProfile.js` hides behind a derived `exportSettings: {...}` object of real booleans.
- **`getCompanyProfile()`** returns every new field in the same friendly-property shape it already used, plus `exportSettings` (10 derived booleans) and `signatures: { prepared, reviewed, approved }` (attachment arrays). No report route touches a raw Airtable field ID or select string for any of this.
- **`ReportEngine` primitives read `company` for their defaults instead of requiring each report to pass every flag through**: `renderBranding` defaults `showLogo`/`showStamp` from `company.exportSettings` (a report's own `overrides.showLogo:false` — DOSH's case — still wins, since it's a fixed structural reason, not a preference); `renderSignatureBlock` always renders a 3-column Prepared/Reviewed/Approved grid and embeds an uploaded signature image above a name when one exists; `renderFooter`/`renderGeneratedNote`/`renderDocInfo` show or hide each piece (footer text, page number, generated date/time/by, document number/version) per `company.exportSettings`; `pageAttrs(company, structuralOrientation, { colours })` resolves orientation (a report's structural requirement always wins over the admin's Default Orientation — DOSH/Machinery/CAPA are landscape because their column counts require it, not by preference; Chemical Register/OSH Committee/Company Profile let the admin decide), non-A4 paper size (Letter/Legal via named `@page` rules), and Primary/Secondary Colour as CSS custom properties (`--report-primary`/`--report-secondary`, falling back to the existing black — DOSH opts out via `colours:false`, keeping its official government-form layout unconditionally monochrome).
- **Uploads**: one reusable drag-and-drop component (`public/js/admin.js`'s `mountCpImageUpload`) drives all six image fields (logo/stamp/watermark/3 signatures) — type/size validation, an oversized-dimension warning, duplicate-upload prevention, and Airtable's own returned attachment thumbnails for the preview (no new image-resize dependency; Airtable already generates small/large/full thumbnails on upload). "Remove" `PATCH`es the attachment field to `[]` — no new delete endpoint, since an Airtable attachment field is just an array.
- **"Preview Report"** (`/company-profile/preview`, reached only from the Admin panel) renders a synthetic sample register through the exact same `ReportEngine` calls a real report uses, fed via `sessionStorage` from the admin form's current in-memory values — proving fidelity to a real exported PDF by sharing code, not by comparison. It reflects unsaved text/toggle edits; uploaded images reflect the last **saved** upload (an in-progress unsaved file pick isn't previewable without uploading it first).
- **Known, documented scope boundaries** (not silently dropped): Default Language is stored but not translated — no i18n infrastructure exists anywhere in this app, and building one was out of proportion to this pass. Default Orientation only applies to reports without a structural column-count requirement. A watermark is a best-effort CSS overlay — any opaque element (e.g. a table cell's white background) covers it in that area, the same limitation any lightweight print watermark has under a browser's print engine.

## 6. Integration strategy

### 6.1 Airtable integration

Airtable is used as the operational data store for the initial release. It provides a flexible, low-friction environment for rapid record capture and collaboration.

Current integration characteristics:

- Server-side only access to the PAT
- REST-based communication through a dedicated wrapper
- Field mapping centralized in server/lib/schema.js
- Support for attachments and record updates

### 6.2 AI-assisted extraction

Machinery license uploads can be processed using Google Gemini to infer values such as:

- Serial number
- Category
- Origin/manufacturer
- License expiry date
- DOSH certificate number

This is a strong example of how the platform can reduce manual data entry and improve consistency across records.

## 7. Design principles

The current design follows these principles:

- Keep the system simple and operationally useful for end users
- Centralize business rules and field mapping in one place
- Protect sensitive credentials and avoid client-side access to secrets
- Preserve an audit trail for every significant action
- Make the system suitable for both desktop and mobile use

## 8. Enterprise evolution path

The current architecture is a solid baseline, but the target state should be more robust and scalable.

### Target-state architecture direction

A mature enterprise EHSMS should evolve into:

- A secure multi-tier application with dedicated backend services
- A relational database or enterprise-grade document store as the system of record
- Role-based workflow engines for review, approval and escalation
- Notification and alerting services for due dates, incidents and non-conformities
- Reporting and analytics layer for compliance dashboards and audit readiness
- Integration layer for HR, maintenance, incident reporting and document control systems

### Recommended future architecture components

- Frontend: progressive web app or modern web application framework
- Backend: modular API services with clear domain boundaries
- Data layer: PostgreSQL or equivalent relational database for core EHS data
- File management: enterprise object storage with metadata indexing
- Workflow engine: approval and task routing for investigations and corrective actions
- Analytics: KPI dashboards for compliance performance, overdue actions and trend analysis

## 9. Constraints and risks

The present implementation is effective for early adoption, but it has the following constraints:

- Airtable is suitable for rapid deployment, but it is not yet the ideal long-term system of record for an enterprise-grade EHSMS
- The current UI is strong for administration and record capture but would benefit from deeper workflow and reporting capabilities
- The platform currently focuses on record management rather than full operational process orchestration
- Larger-scale compliance reporting and audit traceability will require stronger data modeling and integration services

## 10. Summary

The system already demonstrates the core ingredients of a credible EHS platform: secure access, structured compliance data, document handling, governance controls and audit readiness. The next step is to evolve this foundation into a more complete enterprise-grade EHSMS capable of supporting regulatory compliance, operational control and executive reporting at scale.
## Product Architecture

This application is an Enterprise Environment, Health & Safety Management System (EHSMS).

Every business function is an independent workspace.

Each workspace shall have:

- Dashboard
- Overview
- Register
- Profile Page
- Related Records
- Reports
- Analytics

Each workspace must have its own URL.

Example:

/machinery
/machinery/register
/machinery/profile/:id

/chemical
/chemical/register
/chemical/profile/:id

/noise
/noise/register
/noise/profile/:id

/operational-safety
/gap-analysis
/project-progress

Every workspace shall behave as if it is its own mini application while sharing the same framework.