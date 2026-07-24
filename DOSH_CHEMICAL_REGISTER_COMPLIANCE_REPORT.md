# DOSH Chemical Register — Compliance Gap Analysis & Implementation Report

This is the final deliverable requested for this pass: a field-by-field gap analysis of the attached "Design Handoff" package against the current OSH-C Portal implementation and the real DOSH "Guidelines for the Preparation of a Chemical Register" (2000), followed by the implementation of every genuine gap the analysis found. It restates the plan approved before implementation began, with results.

## 0. The handoff package — what it was, and what happened to it

The attached Design Handoff (README, HTML template, CSS, `dosh-register-data.route.js`, `dosh-report.render.js`) is byte-identical to `Docs/design_handoff_dosh_chemical_register/`, already present in this repo, dated 2026-07-23. That earlier submission had already been implemented once, checked directly against the guideline PDF, found to contain three fabricated fields (Type#, Class, "Complies CPL 1977") and two wrong Appendix citations, and corrected — the full trace is `DOSH_REGISTER_FIELD_MAPPING.md`. This session's resubmission was re-verified against the guideline's own Appendix 4/5 sample forms (the same PDF pages the user attached) and the same conclusion held: **no code from the handoff package was applied.**

One new, real finding from this pass: three fields matching the handoff's original (incorrect) claim — `Type#`, `Class`, `Complies with CPL Regulation 1977` — were discovered already sitting on the live Airtable `Chemicals` table, created at some earlier point but never wired into any code (empty on every record). Per your direction, these were renamed `DEPRECATED - ...` with a description pointing at this document; the Airtable MCP tools available in this environment have no field-delete capability, so full removal needs the Airtable web UI directly.

## 1. Gap analysis (Implemented / Better than handoff / Missing→Implemented / Conflicting→Resolved)

| Item | Verdict | Detail |
|---|---|---|
| Section A (Company Information — all 10 fields) | **Already Implemented** | Sourced from Company Settings via `getCompanyProfile()`; current version additionally renders logo/stamp/colour/watermark, which the handoff's Section A has none of. |
| Product Name, Name of Chemical, CAS No., Active Ingredients | **Already Implemented** | Correct per-Substance row model in both versions. |
| Physical Form | **Already Implemented** | Derived from the latest SDS revision. |
| Quantity | **Better than handoff** | v2.1 handoff had this chemical-level; now (v2.2, this pass) usage-context level via `Chemical Process Usage`, with a flat-field fallback — see §2. |
| **Type#** | **Better than handoff** | Handoff hardcodes `"—"` and claims a new field is needed. Current implementation derives the real DOSH Appendix-1 code from the existing `typeOfUse` field — no new field, guideline-accurate, and (this pass) now varies correctly per process for a multi-process chemical. |
| **Class** | **Better than handoff** | Handoff hardcodes `"—"`. Current uses `hazardClassification` verbatim, falling back to `"NA"` per the guideline's own instruction. |
| **"Complies CPL 1977 (Y/N)"** | **Conflicting → Resolved, not a gap** | Confirmed against the guideline's real Appendix 4/5 sample forms: it's the group header spanning CSDS/Class/Label, not a 4th column. Current omission is correct; a cosmetic group-header label was considered but not added since it wasn't explicitly requested (easy to add later, zero schema impact). |
| CSDS (Y/N), Label (Y/N) | **Already Implemented** | Both derived correctly. |
| Workers Exposed, Usage of Chemical, Engineering Control, PPE | **Better than handoff** | v2.1 had these chemical-level; now (v2.2) usage-context level with a flat-field fallback — see §2. Engineering Control/PPE remain free text (known limitation, unchanged — see §6). |
| Supplier (Name/Address/Contact) | **Already Implemented** | One combined field matches the guideline's own sample layout (verified against the attached PDF's Appendix 4 sample table) — not a gap. |
| Section C (Prepared/Reviewed/Approved By) | **Better than handoff** | Current renders 3 signatories with embedded signature images; handoff has 2, text-only. |
| Print/PDF/Excel mechanics, pagination, char-boxes, grouped header | **Already Implemented / Better than handoff** | Company-driven branding, watermark, confidential banner — none of which the handoff has. |
| Company fields (Factory Reg No./DOSH Reg No., Code of Sector, Class of Industry, Company Activity) | **Already Implemented** | All present in Company Settings and consumed by the register already. |
| CSDS Available, Label Available, Type, Class, Quantity Used, Workers Exposed, Engineering Controls, PPE, Active Ingredients (the broader "Chemical fields" list in the prose spec) | **Already Implemented** | See rows above; all derived or usage-context sourced. |
| Manufacturer | **Already Implemented (SDS level)** | Not a required DOSH Section B column (confirmed against the guideline); already captured per-SDS-revision and shown on the Register list. |
| **Multi-process support** (one chemical, several processes/locations with independent quantity/workers/controls/PPE) | **Missing → Implemented** | New `Chemical Process Usage` table — see §2. |
| **SDS import duplicate detection** | **Missing → Implemented** | `GET /chemicals/lookup/find-existing` + wizard "Existing Chemical Found" panel — see §3. |
| **DOSH completion tracking / "Requires Attention" / completion %** | **Missing → Implemented** | `server/lib/chemicalCompletion.js` + Profile badge/Register filter/dashboard KPIs — see §4. |
| **Print by Process / Print Individual Chemical** | **Missing → Implemented** | Query-param-scoped `dosh-register-data` + router query-string support — see §5. |
| Chemical Profile as single source of truth (CHRA, Exposure Monitoring, Storage Inspection, Training, Emergency Response) | **Mostly Already Implemented; one real gap closed** | CHRA/Exposure Monitoring/Storage Inspection/Training/Label Inspection/Waste Management/Substances/SDS Documents already link properly, not duplicate. Emergency Response (SOP) had no relation at all — closed, see §6. The CHRA legacy free-text field flagged in planning turned out to have no live UI surface — see §6. |

## 2. Chemical Process Usage (new table, additive)

New Airtable table `Chemical Process Usage` (`tbl3kESP5Ta7FP7B6`): `Process / Operation` (primary), `Chemical` (link), `Location`, `Quantity Used`, `Workers Exposed`, `Engineering Controls`, `PPE`, `Type of Use`, `Remarks`, `Is Primary Usage`. A chemical can now have any number of these, each independently specified — previously exactly one flat value set per chemical, chemical-wide.

**Backward compatible, not a migration.** The 7 existing flat fields on `Chemicals` are untouched. `server/scripts/backfill-process-usage.js` (one-time, idempotent — re-running it is safe, it skips chemicals that already have a usage record) seeded one `Is Primary Usage` record per existing chemical from those flat values: **26/26 chemicals backfilled** against live production data. Every consumer — the wizard, the Chemical Profile's new "Process Usage" tab, the DOSH register — prefers the child table when records exist there and falls back to the flat fields otherwise, so a chemical created before this table existed, or outside the wizard, keeps working unchanged.

**DOSH register row expansion**: Section B's row unit becomes one row per (Process Usage × Substance). Verified directly against live data: a temporary second process added to a 6-substance chemical correctly produced 12 rows (6 per process, each with its own Type# code), then removed.

## 3. SDS import duplicate detection

`GET /chemicals/lookup/find-existing?casNumber=&productName=&manufacturer=&supplier=` — exact CAS Number match first, then Product Name matched together with Manufacturer (from the chemical's most recent SDS) or Supplier. Runs automatically right after SDS extraction populates the wizard's review step. A match shows View Existing / Update Existing / Create New Anyway; "Update Existing" PATCHes the matched chemical and adds the new SDS as a revision (reusing the existing auto-supersede logic) instead of creating a duplicate. Nothing is overwritten automatically.

Verified end to end against live data, both paths, with real records created and cleaned up afterward:
- **Create New**: unique test chemical → no duplicate found → wizard save → Chemical + Process Usage record created correctly (`isPrimary: true`) → cleaned up.
- **Update Existing**: pre-created "existing" test chemical → wizard detects the match by CAS Number → Update Existing → save → existing chemical PATCHed correctly, exactly one new SDS revision created, **zero** new Process Usage records created (by design — updating an existing chemical doesn't assume a new process) → cleaned up.
- **Bug found and fixed during verification**: "Undo" after "Update Existing" re-rendered the original prompt but didn't clear the pending-update flag — saving after Undo without explicitly clicking "Create New Anyway" would have silently updated the matched chemical. Fixed (commit `2020f53`) and re-verified.

## 4. DOSH completion tracking

`server/lib/chemicalCompletion.js` — one mandatory-field definition (Product Name, CAS Number, an SDS on file, Hazard Classification, Storage Location, Supplier, a fully-specified Process Usage, a Label Inspection on file), reused everywhere rather than reimplemented:
- Chemical Profile page: completion badge (percent + X/8) + missing-fields checklist, computed server-side in the existing `/:id/profile` aggregation.
- Register list: new "DOSH Complete" column + "Requires Attention" quick filter, computed in `/reports/register-data` alongside data already fetched there.
- Chemical Management module dashboard + main dashboard: "DOSH Register Completion X/Y" KPI cards, computed client-side from data each dashboard already fetches (mirrors the server definition, same pattern as the pre-existing `clientSdsExpiryStatus`).

Verified against real (imperfect) production data: a real chemical showed **50% complete (4/8)**, correctly flagging CAS Number, Hazard Classification, Process Usage, and Label Inspection as missing — matching that chemical's actual state, not a synthetic test case.

## 5. Print by Process / Print This Chemical

`GET /chemicals/reports/dosh-register-data` gained optional `?process=`/`?chemicalId=` query params, reusing the exact same report template with a filtered row set — no new ReportEngine code. This needed one small, additive core change: `public/js/router.js` had no query-string support at all before this (routes matched on `location.pathname` only). `Router.navigate`/`render` now split a `"?..."` suffix off the path before matching and pass it to the route as a new, optional 4th `search` argument — every existing `Router.register` callback across every module is unaffected.

Verified: unscoped register shows a "Print by Process" dropdown (populated from the real distinct process list); `?process=storage` and `?chemicalId=<id>` both correctly scope rows and show a scope badge with a "Show Full Register" escape hatch; the Chemical Profile page's new "Print DOSH Entry" link navigates to the correctly-scoped URL and renders the full Section A/B/C layout with real company branding. A **full regression pass across all 11 report/dashboard routes in every module** (Machinery, Chemical, OSH Committee, Company Profile, CAPA) confirmed the router change broke nothing, zero console errors.

## 6. Chemical Profile as source of truth — investigated, one real gap closed

- **SOP / Emergency Response**: had zero relation to chemicals (a pure Document Type tag filter). New optional `Chemical` link field on `SOP`, surfaced as a read-only "Emergency Response" tab on the Chemical Profile page. Purely additive — existing Document-Type filtering is unaffected.
- **CHRA legacy free-text field** (`Chemical / Substance`, flagged in planning as a possible duplicate-entry risk): investigated and found **no fix needed**. The real, reachable Chemical Profile CHRA tab (`chemical.module.js`'s `riskAssessment` config) already reads only the proper linked `chemicalLink` field. The free-text field is referenced solely by an orphaned `MODULES.chra` config with no route registered anywhere in the app — editing it would have had zero user-visible effect, so it was left untouched rather than churned for its own sake.

**Known limitation, unchanged from v2.1**: Engineering Control/PPE remain free text rather than the guideline's official single-letter codes (E/I/LEV/GV/W and C/E/M/R/O) — no UI captures these as discrete coded values yet, and auto-deriving a code from arbitrary free text risks an invented/incorrect result. A future improvement could add select fields for these on `Chemical Process Usage`.

## Files changed

**Backend**: `server/lib/schema.js` (new `chemicalProcessUsage` table, `sop.fields.chemical`, 3 deprecated-field renames applied via Airtable MCP, not code), `server/lib/chemicalCompletion.js` (new), `server/routes/chemicalProcessUsage.js` (new), `server/routes/chemicals.js` (find-existing lookup, dosh-register-data process-usage expansion + query-param scoping, register-data completion scoring, profile aggregation gains `processUsage`/`sop` sub-tables + `doshCompletion`), `server/scripts/backfill-process-usage.js` (new, run once), `server/index.js` (mount new route).

**Frontend**: `public/js/router.js` (query-string support), `public/js/pages/chemical.module.js` (Process Usage sub-table config + wizard integration, duplicate-detection banner, completion badge/checklist, Register list column/filter, dashboard KPI, Print by Process control, Emergency Response tab), `public/js/pages/dashboard.js` (completion KPI card).

**Database**: 1 new table (`Chemical Process Usage`, 10 fields), 1 new field (`SOP.Chemical`), 3 fields renamed to deprecated (no schema change, cosmetic). Zero existing fields removed, renamed away from their working meaning, or repurposed.

**Documentation**: `DATABASE.md` §3.4.5, `ARCHITECTURE.md` §5.2.5, `CHANGELOG.md`, `DOSH_REGISTER_FIELD_MAPPING.md` (Section B sourcing updated + v2.2 addendum), `PROJECT_ROADMAP.md` (milestone 3i), this file.

## Testing performed

No automated test suite exists for this browser-rendering feature (consistent with every prior report-engine pass); verification was direct API testing plus a headless-Chromium (Playwright) pass against live production Airtable data, using the existing throwaway `dev-verify@local.test` Admin account:

- Backfill script: dry-run (26 to backfill) → real run (26/26 created) → re-run dry-run (0 remaining, confirms idempotency).
- `find-existing`: CAS-only match against a Substance-level CAS number correctly returns no match (different field); Product Name + Supplier match correctly finds the real existing chemical; Product Name alone (no corroboration) correctly returns no match.
- Multi-process row expansion: verified via a temporary real Process Usage record (6→12 rows, removed after).
- Both wizard save paths (create-new, update-existing) verified end to end through the real UI with real records created, checked via direct API inspection, and cleaned up.
- Duplicate-detection UI: banner rendering, all 3 buttons, and state transitions (including the Undo bug found and fixed) verified via direct DOM inspection.
- Completion tracking: verified against real (imperfect) data on the Profile page, Register list, and both dashboards.
- Print by Process/Individual: verified unscoped, process-scoped, and chemical-scoped rendering, plus the Profile page's "Print DOSH Entry" link.
- Excel export re-verified after the row-shape change (valid `.xlsx`, non-trivial size, no errors).
- Full regression pass: all 11 report/dashboard routes across every module (Machinery, Chemical, OSH Committee, Company Profile, CAPA) render with zero console errors after the router.js change.
- Emergency Response tab: renders correctly with the correct empty-state message.

## Remaining recommendations

- Delete the 3 `DEPRECATED - ...` fields on `Chemicals` via the Airtable web UI directly (no MCP field-delete capability available in this environment).
- Populate real SOP records with the new `Chemical` link where relevant — the Emergency Response tab currently shows correctly-empty states everywhere since no existing SOP has been linked yet.
- Engineering Control/PPE coded values (E/I/LEV/GV/W, C/E/M/R/O) remain a known, unchanged limitation — worth a future pass if strict guideline letter-coding (rather than free text) becomes a real requirement.
- Consider whether the throwaway `dev-verify@local.test` Admin account should be deleted now that this pass's verification is complete (used across multiple prior sessions too).
