# Project Roadmap — Enterprise EHSMS Evolution

## 1. Strategic objective

The project should evolve into a scalable, audit-ready Environment, Health & Safety Management System for Asbenz Motors Sdn. Bhd. The roadmap below intentionally balances near-term operational value with the long-term requirements of OSHA 2022, DOSH alignment and ISO 45001-style governance.

## 2. Guiding principles

- Start with what is already working: structured compliance records and admin controls
- Improve governance, traceability and accountability at each phase
- Keep the system usable for the business while preparing for enterprise scale
- Design for future integrations rather than isolated point solutions

## 3. Roadmap phases

### Phase 0 — Foundation stabilization (current baseline)

Status: In progress / baseline established

Objectives:
- Stabilize the existing web application and document the architecture clearly
- Confirm core roles, permissions and audit practices
- Ensure reliable Airtable-backed CRUD operations for all modules
- Preserve data integrity and secure admin controls

Deliverables:
- Completed architecture and database documentation
- Clear admin/governance workflows
- Stable authentication and module management flows

### Phase 0.5 — Business-function dashboard redesign (active)

This phase supersedes the document-oriented navigation described in earlier phases below wherever they overlap. It reorganizes the platform around business functions — Machinery, Chemical Management, Noise Management, Operational Safety — each a full workspace (`Dashboard -> Module Dashboard -> Register -> Profile -> History/Documents/Reports`) instead of a flat table view. Delivered module by module, with verification and a documentation update after each, per the project's own delivery rule — never all at once.

Milestones:

1. **Foundation + Machinery module — done.** Client-side router, reusable component kit (KPI cards, data tables, tabs, breadcrumb, activity feed), service layer, redesigned top-level Dashboard (4 business-function tiles), and a fully rebuilt Machinery module: Machinery Dashboard, Machine Register, and a Machine Profile page per machine (General Information, Maintenance History, CF Certificate, Inspection History, Repair History, Photos, Attachments, Risk Assessment, Activity Timeline). New Airtable tables: Machinery CF, Preventive Maintenance, Corrective Maintenance, Machinery Inspection, Calibration Records (see DATABASE.md §3.3.1).
2. **Generic module framework — done.** Machinery's Dashboard/Register/Profile pages, sub-record CRUD form, and profile-aggregation endpoint were extracted into a declarative config-driven engine (`public/js/framework/moduleFramework.js` + `server/lib/profileAggregation.js`, documented in ARCHITECTURE.md §5.2) so every future module is a config file, not copied page code. Machinery was refactored onto the framework and re-verified with a full regression pass (CRUD, permissions, linked-record filtering, route specificity, tab-state) before anything else was built on top of it.
3. **Chemical Management module — done.** Built directly on the framework as proof it generalizes: no new page-rendering code, only `public/js/pages/chemical.module.js` + new Airtable tables. Chemical Management Dashboard, Chemical Register, and a Chemical Profile page per chemical (General Information, Exposure Monitoring, Storage Inspection, Label Inspection, Waste Management, Photos, Attachments, CHRA/Risk Assessment, Activity Timeline), plus an Emergency Spill Procedure tab (filtered SOP records). New Airtable tables: `Chemicals`, `Exposure Monitoring`, `Chemical Storage Inspection`, `Chemical Label Inspection`, `Waste Management`, plus a `Chemical` link field on CHRA and a `Document Type` field on SOP (see DATABASE.md §3.4.1, §3.7).
3a. **DOSH-compliant Chemical Management — done.** Brought the module in line with the DOSH "Guidelines for the Preparation of a Chemical Register" (USECHH Regulations 2000): an SDS-driven "+ Add Chemical" wizard (upload SDS → AI extraction via a new `extractSDSData` alongside Machinery's existing `extractLicenseData` → one editable review screen), a real versioned `SDS Documents` table (never-overwritten revision history, supersede-on-new-Current handled server-side), a sixth "Chemical Safety Training" sub-table, and a generated, print-ready DOSH Chemical Register report built entirely from stored data (Section A/B/C, matching the guidance document's layout) rather than a manually-filled second form. New Airtable tables: `SDS Documents`, `Chemical Safety Training`, `Company Settings`, `DOSH Register Generations`; 7 additive workplace fields on `Chemicals` (see DATABASE.md §3.4.2). Added one new framework primitive (`customAddHandler`, ARCHITECTURE.md §5.2) so a module can swap in a bespoke "+ Add" flow — Machinery is unaffected.
3b. **Platform Foundation — done.** Added ahead of Milestone 3c so the growing platform (OSH-C is intended to be the first of several applications sharing this codebase's foundations) doesn't need rework as it scales: an Event Bus (`server/lib/eventBus.js`, an `EventEmitter` wrapper — `buildModuleRouter`'s new optional `eventPrefix` emits lifecycle events for any module that opts in, no consumers yet), a Configuration/Feature-Flag Service (`server/lib/config.js` + `server/config/features.json` + `GET /api/config/flags`), and AI Extraction Logging (new `AI Extraction Logs` table, `server/lib/aiExtractionLog.js`, wired into both of `server/lib/extract.js`'s extraction functions). All additive, module-independent, and purely preparatory — see ARCHITECTURE.md §5.2.3.
3c. **Chemical Lifecycle Management v2.0 — done.** A further redesign of Chemical Management (additive on top of 3a, not a rewrite) into a Product → SDS Revisions → Substances → Storage/Label/Waste/Training → Documents → CHRA lifecycle: a new `Substances` sub-table auto-populated from SDS Section 3 (Product Name vs. Chemical Name are now properly distinct), automatic SDS expiry calculation (Revision Date + 5 years), a merged Storage tab (profile + inspection history), a centralized cross-sub-table Documents tab (replacing separate Photos/Attachments tabs), an enriched General Information tab with a Compliance Summary, four new framework primitives (`postProcess`, `documents.mode: "aggregated"`, `profileHeaderFields`, `registerFilters`, conditional `profileSubTabs`/`extraProfileTabs` — see ARCHITECTURE.md §5.2.2), a redesigned Register page (Filter/Search/Quick Filters/Export Excel+PDF/View SDS column), clickable KPI cards platform-wide, and a new additional Master-Detail Cockpit interface (`/chemical/cockpit`) inspired by SAP/Salesforce/XENTRY-style split-pane cockpits. Four new conditional-module flags (Exposure Monitoring/LEV/Biological Monitoring/Health Surveillance Required) are manual and assessor-set rather than AI-inferred, for compliance-auditability reasons; LEV/Biological Monitoring/Health Surveillance remain placeholder tabs until their own future milestones (below) ship real tables. New Airtable tables: `Substances`, `AI Extraction Logs`; see DATABASE.md §3.4.3 for the full field-level changes.
3d. **Management capabilities — Corrective Actions (CAPA) and OSH Committee — done.** Prioritized ahead of Noise Management per an explicit decision to build cross-cutting management capabilities before the next technical/document module. New `Actions` table — the CAPA engine, presented as one register (default view: Corrective + Preventive; "All Actions" is the same register unfiltered) rather than two separate modules — with optional Source Module/Source Reference tracing an action back to whatever finding raised it, across any module. New `OSH Committee Meetings` (a full framework module, `/osh-committee`) and `OSH Committee Members` (a small dedicated roster page, `/osh-committee/members`, since members and meetings are a many-to-many relationship the module framework's master/sub-table shape doesn't fit). The top-level Dashboard became a genuine cross-module "Management Dashboard": Chemical Management KPIs (previously Machinery-only), a CAPA KPI row, an OSH Committee snippet, and an "Open Corrective Actions" mini-table. Two new generic framework primitives (`relatedLinks`, and an `extraOverviewKpis` that now also receives the master record list) — see ARCHITECTURE.md §5.2.4, DATABASE.md §3.9.
3e. **DOSH Chemical Register reporting stabilization — done.** Rebuilt the DOSH Chemical Register's PDF and Excel export against the official DOSH guideline (verified directly against the source PDF, correcting an external design draft's citation errors and fabricated fields). Section B changed to one row per linked Substance; added Excel export via ExcelJS (the platform's first third-party runtime dependency, scoped to this one report); fixed print layout overflow. See ARCHITECTURE.md §5.2.1, DATABASE.md §3.4.4.

3f. **Company Profile module — done.** Promoted `Company Settings` from a DOSH-register-only table into a platform-wide, reusable single source of truth for company information, edited via a new Admin panel tab rather than the DOSH register's own inline form (removed). 11 new additive fields (Company Registration Number, MSIC Code, Address Line 2, Country, Website, Logo, Stamp, Report Defaults). No new table, no new API route. See ARCHITECTURE.md §5.5, DATABASE.md §3.10.

4. **Noise Management module.** Noise Monitoring, Noise Mapping, Engineering Controls, Audiometric Tests, Employee Exposure tables; reuses HRA (filtered) and the shared Calibration Records table from Milestone 1. Expected to be a config file on the existing framework.
5. **Operational Safety module** (merges High Risk + SOP). Generalized Permit To Work table, new Contractors and Safety Inspections tables; reuses SOP's `Document Type` field (already added for Milestone 3) for a Work Instructions tab. Expected to be a config file on the existing framework.

Until a module's milestone ships, its Dashboard tile opens the classic record list/form it has always used (HRA, HIRARC, SOP) — no existing functionality is removed while later modules are staged.

### Phase 1 — Governance maturity

Objectives:
- Introduce stronger lifecycle management for records
- Add status-based workflow states for each module
- Improve data completeness and mandatory field enforcement
- Standardize document control and review due dates

Deliverables:
- Record status workflow (Draft, Under Review, Active, Expired, Archived)
- Mandatory field validation and review reminders
- Better document versioning and approval traceability

### Phase 2 — Operational EHS processes

Objectives:
- Expand beyond static record keeping into action-driven EHS operations
- Cover incident reporting, corrective actions, inspections and follow-up tasks
- Support more complete operational control rather than passive documentation

Deliverables:
- Incident management module
- Corrective and preventive action (CAPA) workflow
- Inspection checklist and task tracking
- Escalation rules for overdue or high-risk actions

### Phase 3 — Analytics, reporting and assurance

Objectives:
- Strengthen management visibility and compliance assurance
- Provide KPI dashboards for overdue items, corrective actions and audit readiness
- Support period-based reporting for management and regulatory review

Deliverables:
- Dashboard for overdue assessments, actions and compliance trends
- Management reporting pack
- Audit-ready evidence summaries
- Executive reporting views for safety performance

### Phase 4 — Mobile and field operations

Objectives:
- Support mobile users in the field, workshop and site inspections
- Improve access for supervisors and safety personnel
- Reduce dependency on desktop-based data entry

Deliverables:
- Responsive mobile-first workflows
- Offline-capable or cached submission capability where needed
- Digital inspection forms and checklist completion
- Signature and photo capture support for evidence gathering

### Phase 5 — Enterprise integration and scale

Objectives:
- Position the system as a true enterprise platform rather than a departmental tool
- Integrate with broader organizational systems and external data sources
- Improve resilience, governance and long-term maintainability

Deliverables:
- Enterprise authentication and SSO integration
- Integration with HR, maintenance or permit systems
- Centralized document repository and retention controls
- Migration from Airtable to a more scalable enterprise data platform if required

## 4. Success criteria

The system should be considered enterprise-ready when it can reliably support:

- Structured EHS record management across all major domains
- Role-based governance and approvals
- Auditable history for all significant actions
- Timely reporting of compliance status and risk exposure
- Mobile and field-based operational use
- Stronger integration with business processes and management reporting

## 5. Recommended implementation order

1. Harden the current module model and admin controls
2. Add workflow states and approval logic
3. Expand with operational modules such as incidents and CAPA
4. Introduce reporting and dashboarding
5. Prepare for mobile and enterprise integrations

## 6. Strategic note

The current platform is already a credible foundation for an EHS management system. The next evolution should focus less on building more forms and more on enabling reliable, controlled, auditable and actionable safety processes.
