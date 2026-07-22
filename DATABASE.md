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

**`Company Settings`** — a single-row table holding Section A of the generated register (Company Name, Address, City, Postcode, State, Telephone, Email, DOSH Registration No., Code of Sector, Class of Industry, Company Activity). Modeled as an ordinary table via the generic router; the app always operates on the first record, creating one if none exists.

**`DOSH Register Generations`** — audit log, one record per "Generate DOSH Chemical Register" action: Generation Reference, Generated Date, Generated By, Prepared By Name/Title, Reviewed By Name/Title, Notes.

**AI-assisted SDS intake**: `server/lib/extract.js` gained `extractSDSData()` alongside the existing `extractLicenseData()` — same Gemini 2.0 Flash pattern (structured JSON out, `null` for anything not confidently visible, never invented), new prompt covering the full SDS field list. The "+ Add Chemical" wizard (`public/js/pages/chemical.module.js`) uploads an SDS, extracts it, and shows one editable review screen before creating the `Chemicals` record and its first `SDS Documents` record together, linked.

**Generated DOSH Chemical Register**: `GET /api/chemicals/reports/dosh-register-data` aggregates Company Settings + every Chemical's workplace fields + two *derived* flags — CSDS (Y/N: does the chemical have a Current SDS Documents record) and Label (Y/N: the most recent Chemical Label Inspection's Compliant value) — computed at request time rather than stored, since both already exist elsewhere in the system. Rendered as a print-optimized HTML report (`/chemical/dosh-register`) matching the guidance document's Section A/B/C layout; the browser's native "Print to PDF" produces the actual file rather than adding a server-side PDF-generation dependency.

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
