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
- **Layer 2 — DOSH compliance.** A generated, read-only report (`/chemical/dosh-register`) that reproduces the guidance document's Section A (Company Information) / Section B (per-chemical hazard-and-usage table) / Section C (Prepared By/Reviewed By) layout entirely from Layer 1 data — nothing is filled in twice. `GET /api/chemicals/reports/dosh-register-data` aggregates it server-side, including two flags computed at request time rather than stored (CSDS Y/N, Label Y/N), since both already exist elsewhere in the system. The browser's native "Print to PDF" produces the actual file — no server-side PDF-generation dependency was added.

SDS revisions are never overwritten: `server/routes/sdsDocuments.js` intercepts record creation so that saving a new revision as the Current one automatically flips any prior Current revision(s) for that chemical to Superseded, preserving full history — the one route in the app where the generic `buildModuleRouter` factory's default create behavior wasn't reusable as-is (see the code comment there for why).

### 5.3 Legacy per-table modules (HRA, HIRARC, SOP)

Each remaining compliance module still follows the original architectural pattern until its business-function milestone ships:

- A route definition for CRUD operations
- A shared generic router builder for consistent behavior (`server/lib/moduleRouter.js` — `buildModuleRouter`, also reused for every module-framework sub-table)
- Field mapping through a centralized schema definition
- Attachments handled through file upload endpoints
- Audit events emitted for every create, update, delete and upload action

### 5.4 Admin capability layer

The Admin layer provides governance control for:

- User onboarding and role assignment
- Temporary password management
- Access control review
- Activity history review
- Backup and bulk import/export of module data
- System health monitoring

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