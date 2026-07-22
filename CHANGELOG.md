# Changelog

## Unreleased

### Add Chemical wizard refactor — drag & drop, extraction retry, AI-field highlighting, new workplace fields
- Rebuilt Step 1 of the "+ Add Chemical" wizard as a proper drag-and-drop PDF-only dropzone (plus Browse) — upload is mandatory before the form appears, and non-PDF files are rejected client-side with a clear message.
- Added an explicit extraction-progress state (spinner + status text) between upload and the review form, and a failure state with **Retry Extraction** and **Continue Manually** actions — extraction failure no longer silently drops the user straight into a blank form.
- AI-populated fields on the review screen are now visually highlighted (accent border + "AI" badge) so it's clear at a glance what came from the SDS vs. what needs the user's own input — matches the existing convention from Machinery's license-extract flow.
- Reorganized the wizard's workplace section around the fields actually needed day to day — Storage Location, Department, Responsible Person, Quantity, Unit, Internal Code, Review Frequency, Status — with the DOSH-Register-specific fields (Process, Workers Exposed, Type of Use, Control Measures, PPE Actually Used, Internal Remarks) kept in a clearly separated "Additional Details" section rather than removed, since the generated DOSH register depends on them.
- Added 5 new additive `Chemicals` fields: Responsible Person, Unit, Internal Code, Review Frequency, Status. Every existing field and record is unchanged.
- The first SDS for a new chemical is now explicitly recorded as Revision 1 when the AI doesn't extract a version number, instead of being saved with a blank version.
- **Found and fixed a real latent bug** while wiring the new fields: the previous milestone added `Department`/`Process`/`Control Measures`/`PPE Actually Used`/`Type of Use`/`Internal Remarks` to the *backend* schema (`server/lib/schema.js`) but never to the *frontend* `MODULES.chemicals.fields` map — so `saveWizard()`'s field lookups (`CF["Department"]`, etc.) were silently resolving to `undefined` and writing to a bogus key that Airtable would reject or ignore. Fixed by completing the frontend field map; verified by resolving every field key the wizard uses against the live config and confirming each maps to a real Airtable field ID, plus a live create round-trip.
- No extraction logic was duplicated — the wizard still calls the same `server/lib/extract.js` → `extractSDSData()` → `/api/chemicals/extract-sds-preview` pipeline built in the previous milestone; only the upload UI and review-form UI around it changed. SDS versioning, the supersede-on-new-Current rule, and audit logging are all unchanged and unaffected by this refactor.

### DOSH-compliant Chemical Management — SDS-driven intake, versioned SDS Library, Training, generated Chemical Register
- Rebuilt "+ Add Chemical" as an SDS-driven wizard: upload the Safety Data Sheet, AI reads it (new `extractSDSData` in `server/lib/extract.js`, same Gemini pattern as Machinery's existing license extraction), and one combined review screen shows every extracted field pre-filled and editable alongside blank workplace-specific fields (storage location, department, process, workers exposed, quantity, control measures, PPE actually used, type of use, remarks). Saving creates the Chemical record and its first SDS Documents record together, linked.
- Added a real, versioned SDS Library (`SDS Documents` table) — SDS revisions are never overwritten or deleted; saving a new revision as the current one automatically supersedes the chemical's previous current revision server-side, preserving full document history. Supports multiple languages per chemical (English / Bahasa Malaysia / Other) and tracks whether a revision was AI-extracted, for future extraction-quality tracking.
- Added a sixth Chemical Management sub-table, `Chemical Safety Training`, purely as configuration on the module framework — no new page-rendering code, proving the framework's "new operational area = config, not code" value again.
- Added a generated DOSH Chemical Register (`/chemical/dosh-register`): reproduces the DOSH "Guidelines for the Preparation of a Chemical Register" (USECHH Regulations 2000) Section A (Company Information)/Section B (per-chemical hazard-and-usage table)/Section C (Prepared By/Reviewed By) layout entirely from data already in the system — nothing is filled in twice. Two report columns (CSDS, Label compliance) are computed at generation time rather than stored. Print-optimized for the browser's native "Print to PDF" — no server-side PDF-generation dependency added. Every generation is logged to a new `DOSH Register Generations` audit table.
- New Airtable tables: `SDS Documents`, `Chemical Safety Training`, `Company Settings`, `DOSH Register Generations`. New additive fields on `Chemicals`: Department, Process, No. of Workers Exposed, Control Measures, PPE Actually Used, Type of Use, Internal Remarks — every existing field and record untouched.
- Added one new framework primitive, `customAddHandler`, so a module can swap in a bespoke "+ Add" flow instead of the default record-form overlay (`public/js/framework/moduleFramework.js`) — additive and backward-compatible; Machinery keeps its existing default behavior unchanged.
- Found and fixed a real design gap during implementation: the generic `buildModuleRouter` factory's default "add a custom route after the factory call" pattern (used everywhere else in the app) can't intercept-before-create, which the SDS supersede rule needs. `server/routes/sdsDocuments.js` composes a small custom router in front of the generic one instead, so the business rule lives at the data layer and is correct regardless of which UI path creates a record.
- Verified live end to end: workplace fields on Chemicals, SDS supersede-on-create (old revision confirmed still retrievable, not deleted), profile aggregation including the two new sub-tables, DOSH register data aggregation (including a real CSDS=Y / Label=— derivation check), Company Settings create/edit round-trip, generation audit logging, and non-admin permission enforcement on every new route. Live Gemini extraction accuracy could not be verified in this environment (no configured `GEMINI_API_KEY`) — confirmed instead that the failure path degrades gracefully (clear error, not a crash) both server- and client-side.

### Business-function dashboard redesign — Machinery module
- Reorganized the platform's navigation around business functions instead of raw document tables: the Dashboard now shows Machinery, Chemical Management, Noise Management and Operational Safety as full workspaces, following `Dashboard -> Module Dashboard -> Register -> Profile -> History/Documents/Reports`.
- Added a client-side History-API router (`public/js/router.js`), a reusable UI component kit (KPI cards, data tables, tabs, breadcrumb, activity feed — `public/js/components/`), and a service layer (`public/js/services/`) separating data access from rendering. No build step or framework introduced — still plain HTML/CSS/vanilla JS, same Render deployment.
- Rebuilt the Machinery module end to end: a Machinery Dashboard (Overview, Machine Register, Certificates of Fitness, Preventive Maintenance, Corrective Maintenance, Inspection, Calibration, Risk Assessment, Documents, Reports) and a full Machine Profile page per machine (General Information, Maintenance History, CF Certificate, Inspection History, Repair History, Photos, Attachments, Risk Assessment, Activity Timeline).
- Added 5 new Airtable tables — Machinery CF, Preventive Maintenance, Corrective Maintenance, Machinery Inspection, and a shared Calibration Records table (designed to be reused by the future Noise Management module) — plus a `Photos` field on Machinery. All link back to Machinery by record, avoiding duplicated data.
- Added a `GET /api/machinery/:id/profile` endpoint that aggregates a machine with every linked sub-record in one call, and new CRUD routes for each new table, built on the existing `buildModuleRouter` factory (no new backend pattern needed).
- Noise Management and Operational Safety are not yet rebuilt — their Dashboard tiles currently open the same classic record list/form HRA, HIRARC and SOP have always used, so nothing already working was removed. Full target schema and page design for both are documented in DATABASE.md and PROJECT_ROADMAP.md ahead of their own milestones.
- Fixed a data-correctness bug found during verification: Airtable's `filterByFormula` resolves a linked-record field to the linked record's primary-field text, not its record ID, so a naive `FIND(machineId, ARRAYJOIN({Machine}))` filter would have silently returned zero results. The profile endpoint instead fetches each sub-table and filters on the actual linked record ID in application code.

### Generic module framework + Chemical Management module
- Extracted the Machinery Dashboard/Register/Profile pages, sub-record CRUD form, and profile-aggregation endpoint into a declarative config-driven engine: `public/js/framework/moduleFramework.js` (frontend — `defineBusinessModule(config)`) and `server/lib/profileAggregation.js` (backend — `buildProfileRoute(config)`). A module is now a config object (master table, linked sub-tables, optional reused risk-assessment table, attachments, tab layout) instead of hand-written pages per module.
- Refactored Machinery onto the framework (`public/js/pages/machinery.module.js` replaces the old `machineryDashboard.js`/`machineryRegister.js`/`machineryProfile.js`/`machineryService.js`) and re-verified it end to end — live CRUD on all 5 sub-tables, linked-record aggregation, file uploads, admin/non-admin permissions, route specificity, and tab-state across saves — before building anything on top of it, per the explicit "Machinery must show zero regression first" requirement. Also hardened the router itself: route matching now prefers static routes (`/machinery/register`) over dynamic ones (`/machinery/:id`) regardless of `<script>` tag order, removing a latent fragility.
- Built Chemical Management directly on the framework as proof it generalizes: `public/js/pages/chemical.module.js` is the only new page-rendering-adjacent code (a small config file plus one bespoke tab for Emergency Spill Procedure) — no new Dashboard/Register/Profile logic was written. Chemical Management Dashboard, Chemical Register, and a Chemical Profile page per chemical, covering Exposure Monitoring, Storage Inspection, Label Inspection, Waste Management, SDS Library, CHRA (reused as Risk Assessment), Photos, Attachments and Activity Timeline.
- New Airtable tables: `Chemicals` (master/inventory), `Exposure Monitoring`, `Chemical Storage Inspection`, `Chemical Label Inspection`, `Waste Management`; a `Chemical` linked-record field added to the existing `CHRA` table (its old free-text substance field is untouched); a `Document Type` field added to `SOP` (SOP / Work Instruction / Spill Response) so Emergency Spill Procedure — and the future Operational Safety Work Instructions tab — filter the existing table instead of duplicating it.
- The Chemical Management tile on the main Dashboard now opens the real module instead of the classic CHRA record list; CHRA itself is retired as a standalone destination and lives on as Chemical Management's Risk Assessment tab, matching the original "CHRA should no longer exist as a top-level module" requirement.

### Documentation and architectural baseline
- Created a structured enterprise architecture document for the Asbenz Motors EHSMS initiative.
- Documented the current project structure, module architecture, routing model, authentication model and Airtable-backed data layer.
- Defined a phased roadmap for evolving the platform into a scalable, audit-ready EHS management system.
- Published a database architecture overview reflecting the current Airtable implementation and the future enterprise direction.

## 0.1.0 — 2026-07-22

### Added
- Initial web-based EHS compliance portal for Asbenz Motors.
- Role-based access for Admin, HR/View Only and Staff roles.
- Core compliance modules for Machinery, CHRA, HRA, HIRARC and SOP.
- Admin panel for user management, activity history and system health monitoring.
- Airtable-backed CRUD operations and attachment uploads for compliance records.
- AI-assisted extraction support for machinery license documents.

### Architecture highlights
- Node.js and Express backend serving static frontend assets.
- JWT-based authentication with server-side enforcement.
- Centralized schema and field mapping for Airtable integration.
- Activity logging for accountability and operational visibility.

### Notes
- This release establishes the foundation for a practical EHS compliance portal.
- The documentation in this repository now frames the platform as an enterprise EHSMS initiative rather than a standalone web application.
