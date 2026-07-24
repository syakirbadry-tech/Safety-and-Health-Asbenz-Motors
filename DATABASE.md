# Database and Data Architecture

## 1. Current database approach

The current application uses Airtable as its operational database layer. This is an effective early-stage choice because it allows rapid deployment, flexible schema adjustment and simple collaboration without needing a traditional database server.

In this project, the database is not just a data store; it is the foundation of the compliance workflow. Records for users, activity history and each EHS module are persisted in Airtable tables and accessed through a shared server-side wrapper.

## 2. Data domains

The system currently manages the following data domains:

- User accounts and roles
- Login and activity history
- Machinery compliance records (asset register + CF/PM/CM/Inspection/Calibration sub-tables)
- Chemical Management records (Chemicals register + Exposure Monitoring/Storage/Label Inspection/Waste Management sub-tables + CHRA)
- HRA records
- HIRARC records
- SOP records

## 3. Current Airtable structure

### 3.1 Users table

Purpose:
- Stores account credentials, roles, status and password reset state

Key concepts:
- Each user has a role such as Admin, HR (View Only) or Staff
- Passwords are never stored in plaintext; hashes are used
- The login activity and password change flow rely on this table

### 3.2 Activity log table

Purpose:
- Provides an audit trail for system activity

Typical events recorded:
- Login success and login failure
- Logout events
- Create, update and delete operations
- File uploads
- Password resets
- Admin changes
- Errors

This table is essential for governance, traceability and troubleshooting.

### 3.3 Machinery table

Purpose:
- Stores core machinery compliance records — the asset master for the Machinery module

Typical record fields include:
- Machine name
- Asset tag
- Category
- Location
- Operational status
- Responsible person
- Inspection dates
- License expiry
- DOSH certificate number
- Serial number
- Compliance status
- Photos (attachment gallery, added for the Machine Profile page)
- Linked assessment records and documents

### 3.3.1 Machinery sub-tables (added for the business-function redesign)

Added so the Machine Profile page can show real maintenance/certification/inspection history instead of a flat record — each links back to `Machinery` via a `Machine` linked-record field, so no data is duplicated onto the Machinery table itself.

**Machinery CF** — Certificates of Fitness. CF No, Machine (link), Issued Date, Expiry Date, Issuing Authority, Status (Valid / Expiring Soon / Expired), Certificate (attachment), Notes.

**Preventive Maintenance** — scheduled PM log. PM Reference, Machine (link), PM Type (Daily/Weekly/Monthly/Quarterly/Annual), Scheduled Date, Completed Date, Performed By, Status (Scheduled/Completed/Overdue), Checklist Notes, Attachment.

**Corrective Maintenance** — repair log. CM Reference, Machine (link), Fault Description, Date Reported, Date Resolved, Performed By, Status (Open/In Progress/Resolved), Cost, Attachment.

**Machinery Inspection** — periodic inspection log. Inspection Reference, Machine (link), Inspection Date, Inspector, Result (Pass/Conditional Pass/Fail), Findings, Next Due, Attachment.

**Calibration Records** — deliberately *not* Machinery-specific: it has an Equipment Type field (Machine Instrument / Noise Meter / Other) and an optional Machine link, so the Noise Management milestone can reuse the same table for noise-meter calibration instead of creating a near-duplicate table. Equipment Name, Equipment Type, Machine (link, optional), Calibration Date, Next Due, Calibrated By, Status (Valid/Due Soon/Expired), Certificate.

The Machine Profile's Risk Assessment tab does **not** introduce a new table — it's a filtered view of the existing `HIRARC` table (already linked to Machinery). Its Activity Timeline tab reads the existing `Activity Log` table, filtered by matching `Record Reference` against the machine's name (see §4 for the known limitation this implies).

A single backend endpoint, `GET /api/machinery/:id/profile`, fetches the machine plus all of the above in one call. It filters each sub-table in application code rather than via Airtable's `filterByFormula`, because Airtable resolves a linked-record field inside a formula to the linked record's *primary field text*, not its record ID — there's no formula function to match on the raw linked ID, so `FIND(machineId, ARRAYJOIN({Machine}))` would silently never match. These tables are workshop-scale, so fetching each in full and filtering in JS stays fast.

### 3.4 CHRA table

Purpose:
- Stores chemical health risk assessment records. Reused, unmodified in structure, as the Chemical Management module's Risk Assessment tab (§3.4.1) — the same pattern as HIRARC for Machinery.

Typical record fields include:
- Reference number
- Chemical / substance (free text — kept as-is for backward compatibility)
- Chemical (linked record to `Chemicals`, added for the Chemical Management module — see §3.4.1)
- Assessor
- Assessment date
- Review due date
- Supporting document and SDS attachment
- Notes
- Compliance status

### 3.4.1 Chemicals table and sub-tables (added for the Chemical Management module)

`Chemicals` is the master/inventory table that CHRA never had on its own — previously "Chemical / Substance" was just free text with no chemical entity to hang storage, hazard classification, PPE requirements or SDS off of. Fields: Chemical Name, CAS Number, Supplier, Storage Location, Hazard Classification (Flammable / Corrosive / Toxic / Irritant / Oxidizing / Environmental Hazard / Other), Quantity, PPE Requirement, Exposure Limit, SDS (attachment), Photos (attachment), Notes.

Four sub-tables link back to `Chemicals` via a `Chemical` linked-record field, same pattern as the Machinery sub-tables:

**Exposure Monitoring** — Monitoring Reference, Chemical (link), Monitoring Date, Sampling Method, Result Value, OEL Limit, Exceedance (Yes/No), Assessor, Attachment.

**Chemical Storage Inspection** — Inspection Reference, Chemical (link), Inspection Date, Inspector, Result (Pass/Conditional Pass/Fail), Findings, Next Due, Attachment.

**Chemical Label Inspection** — Inspection Reference, Chemical (link), Inspection Date, Inspector, Compliant (Yes/No), Findings, Attachment.

**Waste Management** — Disposal Reference, Chemical (link), Waste Type, Disposal Date, Disposal Method, Contractor, Quantity, Manifest (attachment).

Emergency Spill Procedure is a filtered view of `SOP` records where the `Document Type` field (§3.7) equals "Spill Response" — not a separate table. SDS Library was originally planned as a view over `Chemicals.SDS`; §3.4.2 below replaces that with a proper versioned table — the `Chemicals.SDS` attachment field is kept in place, unused by new records, purely for backward compatibility.

`GET /api/chemicals/:id/profile` aggregates a chemical with all of the above (plus linked CHRA, SDS Documents and Chemical Safety Training — see §3.4.2) in one call, built from the same generic `server/lib/profileAggregation.js` helper the Machinery profile endpoint uses (see §3.3.1 for why filtering happens in application code, not `filterByFormula`).

### 3.4.2 DOSH-compliant SDS intake, versioned SDS Library, Training, and generated Chemical Register

Added to satisfy the DOSH "Guidelines for the Preparation of a Chemical Register" (USECHH Regulations 2000) operationally — the register itself is generated from stored data (Layer 2), never a second place to type things in; the tables below are the working system (Layer 1).

**`Chemicals` — 12 additive workplace fields** (existing fields unchanged): Department, Process, No. of Workers Exposed, Control Measures, PPE Actually Used, Type of Use (Raw Material/Product/By-product/Intermediate-product/Stored/Waste/Cleaning/Degreasing/Other — matches the guidance document's own usage-type codes), Internal Remarks, Responsible Person, Unit, Internal Code, Review Frequency (Monthly/Quarterly/Semi-Annually/Annually/Biennially/Other), Status (Active/Under Review/Inactive/Discontinued). The first seven feed Section B of the generated register directly; the latter five are day-to-day operational fields surfaced in the Add Chemical wizard.

**`SDS Documents`** — the real, versioned SDS Library. One record per SDS revision/language, linked to `Chemicals`. Fields: SDS Reference, Chemical (link), Product Name, Manufacturer, Supplier, CAS Number, EC Number, Revision Date, SDS Version, Hazard Classification, Signal Word (Danger/Warning/None), GHS Pictograms (the 9 standard GHS classes), H Statements, P Statements, Physical Form, First Aid, Fire Fighting, PPE Recommended, Storage Requirements, Disposal Requirements, Exposure Limits, UN Number, Transport Information, Language (English/Bahasa Malaysia/Other), Status (Current/Superseded), SDS File (attachment), Notes, Extracted By AI (checkbox). Revisions are **never overwritten or deleted** — `server/routes/sdsDocuments.js` intercepts creation: saving a new record with Status=Current automatically flips any other Current record(s) for the same chemical to Superseded first, preserving full document history. (This required overriding the generic `buildModuleRouter` factory's POST route for this one table only — see the code comment there for why a simple "add a route after the factory" approach, used everywhere else, doesn't work for an intercept-before-create rule.)

**`Chemical Safety Training`** — sixth Chemical Management sub-table, same shape as the other five: Training Reference, Chemical (link), Training Date, Trainer, Topic, Attendees, Number of Attendees, Next Due, Status (Completed/Scheduled/Overdue), Attachment. Added purely as config on the module framework — no new page-rendering code.

**`Company Settings`** — a single-row table originally holding just Section A of the generated register (Company Name, Address, City, Postcode, State, Telephone, Email, DOSH Registration No., Code of Sector, Class of Industry, Company Activity). Modeled as an ordinary table via the generic router; the app always operates on the first record, creating one if none exists. Promoted into the platform-wide **Company Profile** module in v2.1 — see §3.10 for the full field list and the Admin-panel editing UI that replaced the DOSH register's own inline edit form.

**`DOSH Register Generations`** — audit log, one record per "Generate DOSH Chemical Register" action: Generation Reference, Generated Date, Generated By, Prepared By Name/Title, Reviewed By Name/Title, Notes, **Export Format** (v2.1 — single select, PDF/Excel, set programmatically by whichever export button triggered the generation).

**AI-assisted SDS intake**: `server/lib/extract.js` gained `extractSDSData()` alongside the existing `extractLicenseData()` — same Gemini 2.0 Flash pattern (structured JSON out, `null` for anything not confidently visible, never invented), new prompt covering the full SDS field list. The "+ Add Chemical" wizard (`public/js/pages/chemical.module.js`) uploads an SDS, extracts it, and shows one editable review screen before creating the `Chemicals` record and its first `SDS Documents` record together, linked.

**Generated DOSH Chemical Register**: `GET /api/chemicals/reports/dosh-register-data` aggregates Company Settings + every Chemical's workplace fields + two *derived* flags — CSDS (Y/N: does the chemical have a Current SDS Documents record) and Label (Y/N: the most recent Chemical Label Inspection's Compliant value) — computed at request time rather than stored, since both already exist elsewhere in the system. Rendered as a print-optimized HTML report (`/chemical/dosh-register`) matching the guidance document's Section A/B/C layout; the browser's native "Print to PDF" produces the actual file rather than adding a server-side PDF-generation dependency.

### 3.4.3 Chemical Lifecycle Management v2.0 — Substances, Storage profile, conditional flags, AI Extraction Logs

Redesigns Chemical Management from a document-oriented module into an enterprise Chemical Lifecycle Management system (Product → SDS Revisions → Substances → Storage/Label/Waste/Training → Documents → CHRA), per the v2.0 brief. Additive only — nothing below removes or renames any field ID, only adds new fields/tables or relabels a field's *display name* (its ID, and therefore every route that reads it, is unchanged).

**`Chemicals` — relabels:** the name field (`fldbGqmRy2suVjH6G`) is now displayed as **Product Name** — the trade/product identity, distinct from the SDS-defined "Chemical Name," which now lives per-ingredient on `Substances` (below). Never use Product Name where the guidance document means Chemical Name, and vice versa. `Internal Code` → **Product Code**. `Quantity` → **Current Quantity**.

**`Chemicals` — new fields:** Storage profile (Cabinet, Maximum Quantity, Storage Method, Temperature, Ventilation, Segregation, Incompatible Chemicals) — merged into the Storage tab alongside the existing `Chemical Storage Inspection` history, not a separate table. Conditional-module flags (Exposure Monitoring / LEV / Biological Monitoring / Health Surveillance Required, each Yes/No/Not Assessed) — **manual, assessor-set fields, not AI-inferred**, gating whether those Profile tabs appear at all.

**New table — `Substances`.** One `Chemicals` record has many `Substances` records, extracted automatically from the SDS's Section 3 (Composition/Information on Ingredients) by the same Gemini extraction pipeline that already reads SDS Section 1 data (`server/lib/extract.js`'s `extractSDSData`, extended with a `substances[]` array in its response schema). Fields: Chemical Name, `Chemical` (link → Chemicals), CAS Number, EC Number, REACH Number, Concentration, Hazard Classification, Signal Word, H Statements, P Statements, GHS Pictograms. Never manually duplicated — the "+ Add Chemical" wizard bulk-creates these records right after creating the Chemical and its first SDS Documents record.

**`SDS Documents` — new field:** `Expiry Date`, an Airtable **formula field** — `DATEADD({Revision Date}, 5, 'years')`. This is a different concept from the existing `Status` field (Current/Superseded, which tracks revision history — never overwritten, see §3.4.2): Expiry Date drives a *time-based* Current/Expiring Soon/Expired status, computed at request time (90-day "Expiring Soon" window) in `server/routes/chemicals.js`, never stored — same "compute, don't duplicate" pattern the DOSH register's CSDS/Label flags already use.

**`Chemical Storage Inspection` — new field:** Corrective Action.

**`Chemical Label Inspection` — new fields:** Label Condition (Good/Faded/Damaged/Missing), Corrective Action. The existing `attachment` field is now used as a multi-file Photos gallery (Airtable attachment fields already support multiple files — no schema change required for that part).

**`Waste Management` — new fields:** Scheduled Waste Code, Disposal Certificate (attachment). Relabels: `Waste Type` → **Waste Category**, `Contractor` → **Licensed Contractor**, `Manifest` → **Consignment Note**.

**Centralized Documents.** No new table — `GET /api/chemicals/:id/profile` now returns a computed `documents[]` array flattening every attachment field across the Chemical record and every linked sub-table (SDS files, inspection photos, training certificates, waste certificates, CHRA reports, …), each tagged with its source module/record. This is the data source for the Profile page's single Documents tab, which replaces the old separate Photos + Attachments tabs. Built via a new optional `postProcess` hook on `buildProfileRoute` (`server/lib/profileAggregation.js`) — generic, unused by Machinery, fully backward compatible.

**`AI Extraction Logs` (new table, platform-wide, not Chemical-specific).** Operational log of every AI (Gemini) extraction call — license and SDS intake alike. Not business data; feeds a future AI Operations Center. Fields: Log Reference, Extraction Type (SDS/License), Model Used, Prompt Version, Extraction Version, Timestamp, Duration (ms), Success, Warnings, Record Reference. Written by `server/lib/aiExtractionLog.js`, called from both `extractLicenseData` and `extractSDSData` in `server/lib/extract.js`.

### 3.4.4 DOSH Chemical Register reporting stabilization (v2.1)

Rebuilds the generated DOSH Chemical Register's PDF and Excel export to match the official DOSH "Guidelines for the Preparation of a Chemical Register" (Appendix 1/2/3/5) layout, verified directly against `Docs/Regulations/chemical registered list - Copy.pdf` — not against an unverified external design draft that had mis-cited two Appendix numbers and proposed three fields the guideline doesn't actually require (see DOSH_REGISTER_FIELD_MAPPING.md for the full trace).

**Section B row unit changed from one row per Chemical to one row per linked Substance** (`GET /api/chemicals/reports/dosh-register-data`, `server/routes/chemicals.js`) — a rendering/aggregation change only, no change to the underlying data model: `Chemicals` remains the master record with many linked `Substances`. Product-level fields (Product Name, Physical Form, Quantity, Type#, Class, CSDS, Label, Workers Exposed, Usage of Chemical, Control Measures, PPE, Supplier) repeat on every row for that chemical; "Name of Chemical," "CAS No.," and "Active Ingredients" come from the specific `Substances` record for that row. A Chemical with no linked Substances yet still emits exactly one row (blank Name of Chemical/CAS No.), so it's never silently missing from a legally-required register.

**"Type#" and "Class" are derived, not new fields**, per the guideline's own Appendix 1 instructions:
- Type# is `Chemicals.typeOfUse`'s own value mapped to its single-letter code (Raw Material→R, Product→P, By-product→B, Intermediate-product→I, Stored→S, Waste→W, Cleaning→C, Degreasing→D, Other→O) — a display-layer lookup table in `chemicals.js`, not a stored field.
- Class is `Chemicals.hazardClassification` verbatim, or `NA` when unset — matching the guideline's own instruction ("if classified using other classification system, please enter NA").
- There is no separate "Complies with CPL 1997" field — the guideline's "Comply with Classification, Packaging and Labelling Regulation, 1997" section is CSDS + Class + Label together, not a fourth column.

**`DOSH Register Generations` — new field:** Export Format (PDF/Excel), see §3.4.2 above.

**Excel export (new)**: a true formatted `.xlsx` — merged/bordered Section A, a grouped-header Section B table (repeating header row via `printTitlesRow`), Section C — built client-side with ExcelJS, lazy-loaded from a CDN on first click (`public/js/pages/chemical.module.js`'s `doshExportExcel`). This is the app's first runtime dependency on a third-party script; it's scoped to this one report and doesn't affect any other module. Distinct and unrelated to the main Chemical Register page's own "Export Excel" button, which remains a plain client-side CSV (`moduleFramework.js`'s `exportFwRowsAsCsv`) — unchanged.

**PDF export**: unchanged mechanism (browser-native `window.print()`, no server-side PDF dependency), but Section A and each Section B page-chunk now render as their own `.dosh-page` sheet with a fixed-width, 15-column table (`table-layout: fixed` + an explicit `<colgroup>`) so the wide table can't overflow the printed page, and explicit monochrome styling so the report isn't affected by the app's dark theme (`public/css/styles.css`).

### 3.4.5 Chemical Process Usage, SDS duplicate detection, DOSH completion tracking (v2.2)

Closes the gaps identified in a compliance audit against the real DOSH guideline PDF (see DOSH_CHEMICAL_REGISTER_COMPLIANCE_REPORT.md for the full gap analysis) that were genuinely missing, as opposed to a since-superseded external design draft's claims — see DOSH_REGISTER_FIELD_MAPPING.md for that trace. Additive throughout: no existing field ID is removed, renamed, or repurposed.

**New table — `Chemical Process Usage` (`tbl3kESP5Ta7FP7B6`).** A chemical can be used across multiple processes/locations, each with its own quantity/workers-exposed/engineering-controls/PPE/type-of-use — previously only representable as one flat value per Chemical record. Fields: `Process / Operation` (primary), `Chemical` (link → Chemicals), `Location`, `Quantity Used`, `Workers Exposed`, `Engineering Controls`, `PPE`, `Type of Use` (same options as `Chemicals.typeOfUse`), `Remarks`, `Is Primary Usage` (checkbox — an informational marker for the row auto-created from an existing chemical's flat fields, never read as "explicitly false"). `Chemicals` gained an automatic inverse link field (`processUsage`) from creating this table; not written to directly by any route.

**Backward-compatible, not a migration.** The 7 flat fields already on `Chemicals` (Process, Storage Location, Current Quantity, Workers Exposed, Control Measures, PPE Actually Used, Type of Use) are untouched and remain the source of truth for any chemical with zero linked Chemical Process Usage records. `server/scripts/backfill-process-usage.js` (one-time, run manually, idempotent) created one `Is Primary Usage` record per existing chemical from those flat values — every consumer below prefers the child table when records exist there, falling back to the flat fields otherwise, so nothing regresses mid-migration and nothing requires the backfill to have run.

**Consumers:** the Add Chemical wizard now also creates the first Chemical Process Usage record (marked primary) alongside the Chemical it already creates; the Chemical Profile page gets a new "Process Usage" sub-tab (add further processes there); `GET /chemicals/reports/dosh-register-data` expands Section B's row unit from one row per Substance to one row per (Process Usage × Substance) — a chemical used in 2 processes with 3 substances now emits 6 rows, each carrying that process's own values (and therefore its own derived Type# code) instead of one chemical-wide value.

**SDS import duplicate detection.** `GET /chemicals/lookup/find-existing?casNumber=&productName=&manufacturer=&supplier=` (server/routes/chemicals.js) checks a new SDS upload against existing chemicals — exact CAS Number match first, then Product Name matched together with Manufacturer (from the chemical's most recent SDS) or Supplier — before the wizard lets the user save. A match surfaces an "Existing Chemical Found" panel (View Existing / Update Existing / Create New Anyway); "Update Existing" PATCHes the matched Chemical and adds the new SDS as a revision (reusing `sds-documents.js`'s existing auto-supersede logic) instead of creating a duplicate. Nothing is overwritten automatically — matching only surfaces the choice, and no new field or table was needed for this.

**DOSH completion tracking.** `server/lib/chemicalCompletion.js` defines the single mandatory-field list for "is this chemical DOSH-register-ready" (Product Name, CAS Number, an SDS on file, Hazard Classification, Storage Location, Supplier, a fully-specified Process Usage, a Label Inspection on file) and scores a chemical against it — no new stored field, purely computed. Surfaced as a completion badge + missing-fields checklist on the Chemical Profile page (folded into the existing `/:id/profile` `postProcess` hook, alongside `complianceSummary`/`documents`/`generalInfo`), a "DOSH Complete" column + "Requires Attention" quick filter on the Register list (`/reports/register-data`), and a "DOSH Register Completion X/Y" KPI card on both the Chemical Management module dashboard and the main dashboard (computed client-side there from data already fetched, mirroring the server definition — same reasoning as the existing `clientSdsExpiryStatus` mirror).

**Print by Process / Print This Chemical.** `GET /chemicals/reports/dosh-register-data` gained optional `?process=` and `?chemicalId=` query params, scoping the returned rows to one process or one chemical — no new report template, the exact same DOSH register page just renders a filtered row set. Reaching a scoped URL needed a small additive change to `public/js/router.js`: it previously had no query-string support at all (routes matched on `location.pathname` only); `Router.navigate`/`render` now split an optional `"?..."` off the path before matching and hand it to the route as a new 4th `search` argument — existing `Router.register` callbacks are unaffected since it's purely an extra argument.

**`SOP` — new field:** `Chemical` (optional link → Chemicals) — ties an Emergency Spill Procedure (or any SOP) to the chemical(s) it covers, surfaced as a new read-only "Emergency Response" tab on the Chemical Profile page (`profile.subTables.sop`, added to the `/:id/profile` aggregation). SOPs without it are unaffected, still filterable by the existing Document Type field on the Module Dashboard's tab.

**Investigated, no change needed:** the CHRA table's legacy free-text `Chemical / Substance` field (`fldslcI2rmy78LlcC`, distinct from the proper `chemicalLink` field added in an earlier pass). The real, reachable Chemical Profile CHRA tab already reads `chemicalLink` exclusively; the free-text field is referenced only by an orphaned `MODULES.chra` config with no route in the app today. Left untouched — editing dead code would have had zero user-visible effect.

### 3.5 HRA table

Purpose:
- Stores health risk assessment records

Typical record fields include:
- Reference number
- Hazard type
- Assessor
- Assessment date
- Review due date
- Notes
- Compliance status

### 3.6 HIRARC table

Purpose:
- Stores hazard identification and risk control records

Typical record fields include:
- Reference number
- Hazard identified
- Risk rating
- Control measures
- Assessor
- Assessment date
- Review due date
- Notes
- Compliance status

### 3.7 SOP table

Purpose:
- Stores standard operating procedures and revision information

Typical record fields include:
- SOP title
- Version
- Effective date
- Review due date
- Approved by
- Notes
- Compliance status
- Document Type (SOP / Work Instruction / Spill Response) — added for the Chemical Management module's Emergency Spill Procedure tab (§3.4.1); also earmarked for Operational Safety's future "Work Instructions" tab, so both filter this one table instead of duplicating it. Existing records default to no value (treated as a plain SOP).

### 3.8 Target schema for deferred modules (designed, not yet built)

Documented here so the redesign is traceable end to end; these tables are created in their own milestone, not this one.

**Noise Management** — `HRA` is reused and filtered by `Hazard Type = Noise` for the Noise Risk Assessment tab, rather than duplicated. New tables: `Noise Monitoring`, `Noise Mapping`, `Engineering Controls`, `Audiometric Tests`, `Employee Noise Exposure`. The Calibration tab reuses the `Calibration Records` table added in §3.3.1 (`Equipment Type = Noise Meter`) instead of a second calibration table.

**Operational Safety** (merges High Risk + SOP) — `HIRARC` is reused as the High Risk Activities register. A single generalized `Permit To Work` table with an `Activity Type` singleSelect (LOTO, Working at Height, Hot Work, Confined Space, Electrical Work, Lifting Operations, Excavation) replaces what would otherwise be seven near-identical permit tables. `SOP`'s `Document Type` field (added above) lets "Safe Work Procedures" and "Work Instructions" both be filtered views of the same table. New `Contractors` table for Contractor Safety. New `Safety Inspections` table for general (non-machine, non-chemical) Inspection Forms.

Both are expected to be implemented as a new config file on the module framework (§5.2 of ARCHITECTURE.md) rather than new page-rendering code, following the pattern Chemical Management already proved out.

### 3.9 Management capabilities — Actions (Corrective Actions/CAPA), OSH Committee

Added between Chemical Lifecycle Management v2.0 and Noise Management, per the decision to build cross-cutting management capabilities before the next technical/document module.

**`Actions`** — the Corrective Actions/CAPA engine. One unified table, presented in the UI as a single register (default view: Corrective + Preventive combined, branded "Corrective Actions/CAPA"; "All Actions" is the same register with an unfiltered quick-filter chip — there is no separate "Action Tracking" table or route). Fields: Action Reference, Title, Description, Date Raised, Action Type (Corrective/Preventive/General/Improvement), Priority (Low/Medium/High/Critical), Status (Open/In Progress/Completed/Cancelled), Assigned To, Assigned Department, Representation (Employer Representative/Employee Representative/Management/Safety & Health Officer/N/A — mirrors `OSH Committee Members`' Position options), Due Date, Completed Date, Source Module (Machinery/Chemical Management/HRA/HIRARC/SOP/CHRA/OSH Committee/Incident/Audit/Other), Source Reference, Root Cause, Corrective/Preventive Measures, Effectiveness Review, Verified Effective (Yes/No/Pending), Evidence (attachment), Notes.

Source Module + Source Reference optionally trace an action back to whatever finding raised it — a failed inspection, a CHRA finding, an OSH Committee meeting decision — using the same free-text-pointer pattern as `Activity Log`'s `Record Reference` (§3.2), not a hard link, since the source can be any table in the app. Freestanding actions simply leave both blank.

`GET /api/actions/reports/register-data` computes `isOverdue` (Due Date < today AND Status not in [Completed, Cancelled]) at request time rather than storing it — the same "compute, don't duplicate" pattern as Chemical Management's SDS expiry status (§3.4.3).

**`OSH Committee Meetings`** — meeting schedule and minutes. Meeting Reference, Meeting Date, Meeting Type (Ordinary/Special/Annual General), Chairperson, Secretary, Attendees (free text — a v1 simplification; a linked multi-select to `OSH Committee Members` is a natural later upgrade), Agenda, Key Decisions/Notes, Minutes (attachment), Next Meeting Date, Status (Scheduled/Completed/Cancelled).

**`OSH Committee Members`** — the committee roster, independent of any single meeting (a member attends many meetings; a meeting has many attendees — a many-to-many relationship the master/sub-table module framework doesn't fit, so this is a flat table with its own small dedicated page rather than a sub-table of Meetings — see ARCHITECTURE.md §5.2.4). Member Name, Position (Chairman/Secretary/Employer Representative/Employee Representative/Safety & Health Officer/Member), Department, Term Start, Term End, Contact, Status (Active/Inactive).

### 3.10 Company Profile — platform-wide single source of truth

Promotes `Company Settings` (originally added in §3.4.2 purely as Section A of the DOSH Chemical Register) into a genuine platform module: every generated report reads company information from here, and nothing duplicates it elsewhere. Edited exclusively via the Admin panel's **Company Profile** tab (`public/js/admin.js`) — the DOSH register's own inline "Edit Company Info" modal was removed; it now links to Admin instead of editing a second copy.

Still the same single-row table, same convention as before (the app always operates on the first record, creating one on first Save if none exists). No new table was created — additive fields only, per the "reuse the existing table" requirement.

**Existing fields, reused as-is** (relabeled in the UI where noted, field IDs unchanged): Company Name, `Address` (now labeled **Address Line 1**), City, Postcode, State, `Telephone` (now labeled **Phone**), Email, DOSH Registration Number, Code of Sector (DOSH-specific, Appendix 2 of the Chemical Register guideline), Class of Industry (DOSH-specific, Appendix 3), Company Activity.

**New fields, additive:**
- General: Company Registration Number (SSM registration number — distinct from DOSH Registration Number).
- Business Information: MSIC Code (Malaysia Standard Industrial Classification — a general-purpose classification, distinct from the DOSH-specific Code of Sector/Class of Industry pair above; do not conflate the two).
- Address: Address Line 2, Country.
- Contact: Website.
- Branding: Company Logo, Company Stamp (both attachments; Stamp is optional).
- Report Defaults: Default Prepared By, Default Prepared By Position, Default Reviewed By, Default Reviewed By Position — pre-fill a generated report's Prepared By/Reviewed By fields (currently just the DOSH register; any future report reuses the same defaults), always editable per generation, never forced.

**DOSH Register integration**: `GET /api/chemicals/reports/dosh-register-data` now concatenates Address Line 1 + Line 2 into the guideline's single "Address" form field, and returns the four Report Defaults so `renderDoshReport()` pre-fills Section C's Prepared By/Reviewed By inputs (still plain, editable `<input>`s — nothing is locked). No other report reads Company Profile yet — Noise Management, Machinery, CAPA, and Committee reports don't exist yet (Noise/Operational Safety are still pre-milestone; Machinery/CAPA/Committee have no generated report of their own today) — but the module is deliberately table/field-generic, not Chemical-specific, so wiring in a future report is expected to be a read-only fetch of the same table, not new schema.

## 4. Relationship and linkage model

The current implementation uses Airtable field mappings and module-specific schemas to organize data. Some module tables are designed to reference or link to machinery and other compliance records, but the current UI primarily treats each module as a structured record set.

As the platform matures, the data model should move toward a more explicit relational structure where:

- Assets are managed independently
- Assessments reference the relevant assets and processes
- Actions and incidents link back to the parent risk or asset record
- Audit evidence is stored in a standardized document repository

**Known limitation:** the Machine Profile's Activity Timeline (§3.3.1) matches `Activity Log` rows to a machine by comparing `Record Reference` (free text) against the machine's name, because `Activity Log` was designed to store a human-readable label, not a linked record. This works today but is fragile if a machine is ever renamed. A future improvement would add a proper linked-record field (or a stored record ID) to `Activity Log` so activity is joined by ID rather than by label text.

## 5. Current data handling patterns

### 5.1 Read and write operations

The application uses a shared server-side wrapper to perform:

- Record listing
- Record retrieval
- Record create/update/delete operations
- Attachment upload operations

This approach keeps the Airtable PAT secure by preventing direct browser access to the data layer.

### 5.2 Audit trail

Every significant action is written to the activity log so that the system can provide a defensible event history.

### 5.3 Bulk operations

The admin panel supports:

- Exporting module data as JSON
- Bulk appending records
- Bulk overwrite operations

These functions are useful for backup, migration and administrative control.

## 6. Data quality and governance considerations

The current schema supports structured compliance data, but governance maturity will improve if the platform adopts:

- Mandatory field validation
- Standardized review cycles
- Controlled document versions
- Clear ownership and approval rules
- Consistent vocabulary across modules

## 7. Recommended future data architecture

For long-term enterprise growth, the system should evolve from Airtable to a more scalable data architecture such as:

- Relational database for core operational records
- Object storage for documents and attachments
- A reporting store or analytics layer for dashboards and trend analysis
- A workflow and audit layer for approval and review processes

This will improve performance, integrity, governance and integration readiness while preserving the business logic already established by the present system.

## 8. Summary

The current database design is practical and effective for a first-generation EHS management portal. It provides a strong foundation for compliance tracking and governance. The next evolution should focus on making the data model more relational, auditable and enterprise-ready while preserving the simplicity that makes the system usable in day-to-day operations.
