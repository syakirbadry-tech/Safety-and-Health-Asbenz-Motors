# Changelog

## Unreleased

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
