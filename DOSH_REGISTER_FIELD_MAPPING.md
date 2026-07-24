# DOSH Chemical Register — Field Mapping Document

This is the single source of truth for every placeholder in the DOSH Chemical Register template (`renderDoshReport()`, `public/js/pages/chemical.module.js`, rendered at `/chemical/dosh-register`, data from `GET /api/chemicals/reports/dosh-register-data`). Any further implementation work on the register must read field sourcing from here, not re-derive it ad hoc.

Status legend: **Existing** = field already in `server/lib/schema.js`, no change needed. **New** = created for v2.1 via the Airtable MCP.

**v2.1 correction note**: an external design package proposed for this release claimed 3 new `Chemicals` fields were needed (Type#, Class, "Complies CPL 1977") and cited the wrong Appendix numbers for Section A's Code of Sector/Class of Industry note. Both claims were checked directly against the official guideline (`Docs/Regulations/chemical registered list - Copy.pdf`, "Guidelines for the Preparation of a Chemical Register," DOSH 2000) before implementation: the guideline defines Type as a coded transform of the existing `typeOfUse` field, Class as the existing `hazardClassification` (or "NA"), and there is no "Complies CPL 1977" field at all — "CPL 1997" (not 1977) is the section covering CSDS + Class + Label together. The correct Appendix citations are Appendix 2 (Code of Sector) and Appendix 3 (Class of Industry). This document reflects the corrected, actually-implemented mapping.

**v2.2 addendum**: the same design package was resubmitted verbatim in a later session, framed as a new "implementation contract." The full gap analysis (`DOSH_CHEMICAL_REGISTER_COMPLIANCE_REPORT.md`) reconfirmed the v2.1 correction above against the guideline's actual Appendix 4/5 sample forms — "Comply with Classification, Packaging and Labelling Regulation, 1977" is the group header spanning CSDS/Class/Label, not a 4th column — and its code was again not applied. Separately, 3 orphaned fields matching the package's original (incorrect) claim — `Type#`, `Class`, `Complies with CPL Regulation 1977` — were found already sitting on the live `Chemicals` table in Airtable, created directly at some earlier point but never wired into any code (empty on every record). They've been renamed `DEPRECATED - ...` with a description pointing back to this document; deleting them requires the Airtable web UI, since the available Airtable MCP tools have no field-delete capability.

---

## Section A — Company Information

| Template placeholder | Airtable table | Field (schema.js key → field ID) | Status | Notes |
|---|---|---|---|---|
| Name | `Company Settings` | `companyName` → `fldQKivIll8afyhmz` | Existing | Direct value, no derivation. |
| DOSH Registration No. | `Company Settings` | `doshRegistrationNo` → `fldT6YT1L1rtjtrga` | Existing | Direct value. |
| Address | `Company Settings` | `address` → `fldpzCUQba9jVCqvc` | Existing | Direct value. |
| Code of Sector | `Company Settings` | `codeOfSector` → `fldqvcuuJTFolV0hX` | Existing | Direct value. |
| City / Postcode | `Company Settings` | `city` → `flde6aRzTMLyymGaJ`, `postcode` → `fld1YyFYWz8dhcE7A` | Existing | Two fields concatenated client-side as `"City / Postcode"`, joined with `" / "`. |
| Class of Industry | `Company Settings` | `classOfIndustry` → `fldUHoCQxiw2nznMm` | Existing | Direct value. |
| State | `Company Settings` | `state` → `fld2qlFAFBlctMzMc` | Existing | Direct value. |
| Company Activity | `Company Settings` | `companyActivity` → `fldP0PgrfeU8Tg99s` | Existing | Multi-select. Derived: array joined as `", "`-separated text for display (`activities.join(", ")`). |
| Telephone | `Company Settings` | `telephone` → `fldJOk1DNlBXjhuJQ` | Existing | Direct value. |
| Email | `Company Settings` | `email` → `fldiky0dCIBRyt9Tc` | Existing | Direct value. |

Source: always the **first** (and only expected) record in `Company Settings` (`companyRecords[0]`) — the app always operates on a single-row table, creating one if none exists (see `Company Settings` edit form).

---

## Section B — List of Chemicals Hazardous to Health

**Row unit (v2.2): one row per (`Chemical Process Usage` × `Substances`) pair.** A chemical used in 2 processes with 3 linked Substances emits 6 rows — each carries that specific process's Quantity/Workers Exposed/Engineering Control/PPE/Type of Use (and therefore its own derived Type# code), instead of one chemical-wide value. A chemical with zero linked `Chemical Process Usage` records (shouldn't happen after the one-time backfill script, but stays correct for any chemical created outside the normal flow) falls back to its own flat `Chemicals` fields — the exact v2.1 behavior below. A chemical with zero linked Substances still emits exactly one row per usage context (blank Name of Chemical/CAS No.) so it's never silently missing from the register. See DATABASE.md §3.4.5 / ARCHITECTURE.md §5.2.5 for the `Chemical Process Usage` table itself.

| Template column | Airtable table | Field (schema.js key → field ID) | Status | Notes |
|---|---|---|---|---|
| Product Name | `Chemicals` | `chemicalName` → `fldbGqmRy2suVjH6G` | Existing | Chemical-level, repeats on every row for that chemical. Display label elsewhere is "Product Name" (v2.0 relabel). |
| Name of Chemical | `Substances` | `chemicalName` → `fldkqn3fqY9TzbmUG` | Existing | **Substance-level** — the specific substance's own name for this row (blank if the chemical has no linked Substances). |
| CAS No. | `Substances` | `casNumber` → `fldwMdQhjd0fTwhDz` | Existing | Substance-level. Falls back to the chemical's own `Chemicals.casNumber` (`fldeQ9F4mDbUbT0Nz`) only for the zero-substance fallback row. |
| Physical Form | `SDS Documents` | `physicalForm` → `fld5Cn2bs4lQhFENy` | Existing | **Derived**: chemical-level, from the most recent SDS revision (any status, by `revisionDate`) — distinct from the CSDS flag below, which only counts `status = "Current"`. |
| Active Ingredients | `Substances` | `chemicalName` + `concentration` → `fldkWme41Ajo3cHCf` | Existing | **Derived**: substance-level, formatted as `"{chemicalName} ({concentration})"` (concentration omitted if blank). |
| Quantity | `Chemical Process Usage` (fallback: `Chemicals`) | `quantity` → `fld8SdSRPPsNrljhu` (fallback `Chemicals.quantity` → `fldT4nF1jJvpPBUhu`) | Existing (v2.2 primary source) | **Usage-context level** (v2.2) — the specific process's own quantity. Falls back to the chemical's flat `Current Quantity` only when it has zero linked `Chemical Process Usage` records. |
| **Type#** | `Chemical Process Usage.typeOfUse` (fallback: `Chemicals.typeOfUse`) | → `fldUu94FPCDAtvxM6` (fallback → `fldadV7JEC8sRDaan`) | Existing | **Derived, not a stored code.** Per the guideline's own Appendix 1 coding: Raw Material→R, Product→P, By-product→B, Intermediate-product→I, Stored→S, Waste→W, Cleaning→C, Degreasing→D, Other→O. Usage-context level (v2.2) — a chemical with 2 processes of different Type of Use gets 2 different Type# codes, one per row. |
| **Class** | `Chemicals` | `hazardClassification` → `fldrkm7F45ofeceuj` | Existing | **Derived, not a new field.** Shows the value verbatim, or `"NA"` if unset — matching the guideline's own instruction ("if classified using other classification system, please enter NA"). Chemical-level (not process-specific), repeats per row. |
| CSDS (Y/N) | `SDS Documents` | `status` → `fldE1wYIm1mVc8oEG`, `chemical` (link) → `fldyGInJFgYuE3saX` | Existing | **Derived, not stored.** `Y` if the chemical has ≥1 linked `SDS Documents` record with `status = "Current"`; `N` otherwise. Chemical-level, repeats per row. |
| Label (Y/N) | `Chemical Label Inspection` | `compliant` → `fldnlw583dIy1fUP4`, `chemical` (link) → `fldl571ud4fjSNVTx`, `inspectionDate` → `fldlQrxd3T0zyH5Jg` | Existing | **Derived, not stored.** Most recent (`inspectionDate`) inspection's `compliant` value → `Yes`→`Y`, `No`→`N`, none→`—`. Chemical-level, repeats per row. |
| Workers Exposed | `Chemical Process Usage` (fallback: `Chemicals`) | `workersExposed` → `fldAOy5kdLeUXAFCr` (fallback `Chemicals.workersExposed` → `fldRM4dI54znwR04p`) | Existing (v2.2 primary source) | Usage-context level (v2.2); `""` renders as `—`. |
| Usage of Chemical | Same field as Type# above | — | Existing | Same underlying value as Type# above, shown here as its full text (e.g. "Raw Material") alongside the coded column — not a duplicate field, just two display representations of one value. Usage-context level (v2.2). |
| Engineering Control | `Chemical Process Usage` (fallback: `Chemicals`) | `controlMeasures` → `fldotGUx3hav5A0x7` (fallback `Chemicals.controlMeasures` → `fldi95R3Fz8Hn7Mjj`) | Existing (v2.2 primary source) | Free text, usage-context level (v2.2). Kept as free text rather than attempting to auto-derive the guideline's E/I/LEV/GV/W letter codes — see Known Limitations. |
| PPE | `Chemical Process Usage` (fallback: `Chemicals`) | `ppe` → `fldSJ5WrHtxyUVs8g` (fallback `Chemicals.ppeActuallyUsed` → `fldZJybnxiaO1ri4V`) | Existing (v2.2 primary source) | Free text, usage-context level (v2.2), same reasoning as Engineering Control (guideline codes: C/E/M/R/O). Distinct from `ppeRequirement`, which this report does not use. |
| Supplier | `Chemicals` | `supplier` → `fldAil7tpo8AhdpOF` | Existing | Chemical-level, repeats per row. |

There is **no "Complies CPL 1977 (Y/N)" column** — it isn't part of the real guideline (see correction note above).

**Location / Process Operation (Section B meta strip)** are now also usage-context level (v2.2, sourced from the row's own `Chemical Process Usage.location`/`.process` fields, fallback to `Chemicals.storageLocation`/`.process`) — the per-page meta strip shows the *first row on that page's* Location/Process as a representative label, same simplification as before v2.2 (a page spanning multiple chemicals/departments already only showed one representative value).

Source: `GET /api/chemicals/reports/dosh-register-data` (`server/routes/chemicals.js`), which fetches `Chemicals`, `SDS Documents`, `Chemical Label Inspection`, `Substances`, and (v2.2) `Chemical Process Usage` in parallel and joins in application code (not Airtable `filterByFormula` — see DATABASE.md §3.3.1 for why linked-record filtering is done in JS, not formulas). Accepts optional `?process=`/`?chemicalId=` query params (v2.2) to scope the returned rows for "Print by Process"/"Print This Chemical" — see DATABASE.md §3.4.5.

**Known limitation**: Engineering Control/PPE remain free text rather than the guideline's official single-letter codes (E/I/LEV/GV/W and C/E/M/R/O respectively) — safely auto-deriving a specific code from arbitrary free text isn't reliable without risking an invented/incorrect code, and no UI currently captures these as discrete coded values. A future improvement could add select fields for these, populated at data-entry time.

---

## Section C — Name of Person Who Prepared or Reviewed

| Template placeholder | Airtable table | Field (schema.js key → field ID) | Status | Notes |
|---|---|---|---|---|
| Prepared By — Name | `DOSH Register Generations` | `preparedByName` → `fldz4mGogntj9ccuB` | Existing | **Not pre-filled from Airtable.** The input renders blank on every page load; the value is typed fresh by the user at generation time, then written to a new `DOSH Register Generations` record only when an export button is clicked. |
| Prepared By — Title | `DOSH Register Generations` | `preparedByTitle` → `fld4kskgsr0UwQgzw` | Existing | Same as above — user input, not read back from any prior record. |
| Reviewed By — Name | `DOSH Register Generations` | `reviewedByName` → `fldwtryC9vrCVbkt9` | Existing | Same pattern. |
| Reviewed By — Title | `DOSH Register Generations` | `reviewedByTitle` → `fldelgPkgOV0dFU7n` | Existing | Same pattern. |

**Implementation note**: because these four fields are always blank on render and only committed on export, any future improvement to pre-fill them from the last generation is a scope change, not covered by this mapping — flag separately if wanted.

---

## Footer line ("Generated `{datetime}` from live Asbenz Motors EHSMS data.")

Not Airtable-sourced. Computed client-side at render time from `new Date().toISOString()`, formatted via `fmtDateTime()`. Purely a display timestamp of when the report was *viewed*, distinct from `DOSH Register Generations.generatedDate` (which records when it was actually *exported/logged* — see below).

---

## Generation audit log (written on export, not rendered in the template itself)

Every export writes one record to `DOSH Register Generations` (`tbltDmaHsIeDJihe6`):

| Field | schema.js key → field ID | Status | Derivation |
|---|---|---|---|
| Generation Reference | `generationReference` → `fldFDBFWXCqvMijmI` | Existing | **Derived**: generated client-side as `` `DOSH-REG-${Date.now()}` `` — not user-entered, not read from any other table. |
| Generated Date | `generatedDate` → `fld3tXpmD2HMDL4TK` | Existing | **Derived**: `new Date().toISOString()` at the moment of export — a system timestamp, not user input. |
| Generated By | `generatedBy` → `fldWjhcA8lxrZjDQq` | Existing | **Derived**: the logged-in user's `fullName` (fallback `email`) from the JWT session (`Auth.user()`) — not a form field. |
| Prepared By Name/Title, Reviewed By Name/Title | see Section C above | Existing | User-typed at export time (see Section C). |
| Notes | `notes` → `fldLHks5wWACe76rH` | Existing | Not currently populated by the export flow (no UI field feeds it today) — available for future use, out of scope for this mapping. |
| **Export Format** | `exportFormat` → `fldiwjEjyxuqoShs6` | **New** | Created via the Airtable MCP for v2.1 (single select, `PDF` / `Excel`). **Derived**: set programmatically to `"PDF"` when the Print button triggers the log write, `"Excel"` when the Excel export button does — never user-entered. |

---

## Summary of schema changes actually made

**One net-new field**, additive, no existing field ID touched:

- `DOSH Register Generations.Export Format` (`fldiwjEjyxuqoShs6`) — single select, options `PDF` / `Excel`.

Everything else the template and the generation log need already existed in `server/lib/schema.js` — including Type# and Class, which are derived from `typeOfUse` and `hazardClassification` rather than new fields (see Section B above).
