// Chemical Management module definition — the second module built on the
// generic framework (public/js/framework/moduleFramework.js), proving it
// generalizes beyond Machinery. No new page-rendering code was needed; this
// file is data plus one small bespoke tab (Emergency Spill Procedure, which
// reuses the SOP table rather than a dedicated sub-table — see
// extraDashboardTabs below).

const CHEMICAL_MODULE = defineBusinessModule({
  key: "chemical",
  basePath: "/chemical",
  modulesKey: "chemicals", // MODULES.chemicals — reused for master CRUD via openRecordForm
  title: "Chemical Management",
  dashboardTitle: "Chemical Management Dashboard",
  dashboardDesc: "Chemical register, exposure monitoring, storage/label inspection and waste management across Asbenz Motors.",
  registerLabel: "Chemical Register",
  registerDesc: "Every chemical tracked by Asbenz Motors, with hazard classification and storage location.",
  quickAddLabel: "Add Chemical",
  parentLabel: "Chemical",
  nameField: "Product Name",
  // No statusDateField: unlike Machinery's "Next Inspection Due", the
  // Chemicals master record has no single inherent due-date — due/overdue
  // status lives on the sub-tables (Storage Inspection's Next Due, etc.),
  // surfaced through the Overview/Reports KPIs instead of a per-row badge.
  masterCountLabel: "Registered Chemicals",
  // Master-Detail Cockpit (v2.0) — additional interface, see chemicalCockpit.js.
  cockpitPath: "/chemical/cockpit",

  registerColumns: [
    { key: "name", label: "Product Name", field: "Product Name", strong: true },
    { key: "storage", label: "Storage Location", field: "Storage Location" },
    { key: "hazard", label: "Hazard Classification", field: "Hazard Classification" },
    { key: "supplier", label: "Supplier", field: "Supplier" },
  ],

  generalInfoFields: [
    "Product Name", "Product Code", "CAS Number", "Supplier", "Storage Location", "Department", "Responsible Person",
    "Hazard Classification", "Current Quantity", "Maximum Quantity", "Unit", "Review Frequency", "Status",
    "PPE Requirement", "Exposure Limit", "Process", "No. of Workers Exposed", "Type of Use",
    "Control Measures", "PPE Actually Used", "Notes", "Internal Remarks",
  ],
  // Rendered after the fields grid above (General Information tab) — derived
  // fields computed server-side by chemicals.js's postProcess hook
  // (complianceSummary, generalInfo), not stored redundantly on Chemicals.
  // See renderFwGeneralInfoDerived in moduleFramework.js.
  generalInfoDerived: (profile) => CHEMICAL_MODULE_renderGeneralInfoDerived(profile),
  headerSubtitleFields: ["Storage Location", "CAS Number"],

  dashboardSubTabOrder: ["sdsDocuments", "substances", "processUsage", "exposureMonitoring", "storageInspection", "labelInspection", "wasteManagement", "training"],

  subTables: {
    // v2.2 — a chemical can be used across multiple processes/locations,
    // each with its own quantity/workers-exposed/controls/PPE/type-of-use,
    // instead of the single flat set of those fields on the Chemicals master
    // record. The wizard still writes the flat fields (unchanged, backward
    // compatible) and additionally creates the first record here, marked
    // primary. See DOSH_REGISTER_FIELD_MAPPING.md and ARCHITECTURE.md §5.2.2.
    processUsage: {
      title: "Process Usage",
      api: "/chemical-process-usage",
      primary: "process",
      parentFieldKey: "chemical",
      fields: {
        process: "fldzMffNmxpq27Wsh",
        chemical: "fldruQfRUGHZ0gGDP",
        location: "fldmiVRwaRRHt6HbY",
        quantity: "fld8SdSRPPsNrljhu",
        workersExposed: "fldAOy5kdLeUXAFCr",
        controlMeasures: "fldotGUx3hav5A0x7",
        ppe: "fldSJ5WrHtxyUVs8g",
        typeOfUse: "fldUu94FPCDAtvxM6",
        remarks: "fldROFN119yTbqt6J",
        isPrimaryUsage: "fldwpgPFSFphavBvf",
      },
      formMeta: {
        labels: {
          process: "Process / Operation", location: "Location", quantity: "Quantity Used", workersExposed: "Workers Exposed",
          controlMeasures: "Engineering Controls", ppe: "PPE", typeOfUse: "Type of Use", remarks: "Remarks",
        },
        dateKeys: [],
        selectOptions: { typeOfUse: ["Raw Material", "Product", "By-product", "Intermediate-product", "Stored", "Waste", "Cleaning", "Degreasing", "Other"] },
        textareaKeys: ["controlMeasures", "ppe", "remarks"],
        numberKeys: ["workersExposed"],
      },
      listColumns: ["location", "quantity", "workersExposed"],
      countLabel: "Process Usage Records",
    },
    substances: {
      title: "Substances",
      api: "/substances",
      primary: "chemicalName",
      parentFieldKey: "chemical",
      fields: {
        chemicalName: "fldkqn3fqY9TzbmUG",
        chemical: "fld7NOShCSTJX9NC3",
        casNumber: "fldwMdQhjd0fTwhDz",
        ecNumber: "fldNMjQm1gZGvJWuw",
        reachNumber: "fld0y9wOY6ROj308B",
        concentration: "fldkWme41Ajo3cHCf",
        hazardClassification: "fldDxlPCKzqFmSraV",
        signalWord: "fldYHffBOrgGVJ8KL",
        hStatements: "fld5ToAescr6NayoO",
        pStatements: "fldqRmM90GZcIW4uN",
      },
      // GHS Pictograms (multipleSelects) isn't listed here, same reason as
      // SDS Documents: the generic sub-record form only handles
      // single-value fields. It's set by the wizard's bulk-create from the
      // AI's per-ingredient extraction and viewable/editable directly in
      // Airtable if ever needed.
      formMeta: {
        labels: {
          chemicalName: "Chemical Name", casNumber: "CAS Number", ecNumber: "EC Number", reachNumber: "REACH Number",
          concentration: "Concentration", hazardClassification: "Hazard Classification", signalWord: "Signal Word",
          hStatements: "H Statements", pStatements: "P Statements",
        },
        dateKeys: [],
        selectOptions: { signalWord: ["Danger", "Warning", "None"] },
        textareaKeys: ["hazardClassification", "hStatements", "pStatements"],
      },
      listColumns: ["casNumber", "concentration", "signalWord"],
      countLabel: "Substances Identified",
    },
    sdsDocuments: {
      title: "SDS Documents",
      api: "/sds-documents",
      primary: "sdsReference",
      parentFieldKey: "chemical",
      fields: {
        sdsReference: "fldpZnhslt5PqdlKg",
        chemical: "fldyGInJFgYuE3saX",
        productName: "fldy23Kb0e4djksKw",
        manufacturer: "fldKR0rdUCpCTyXPG",
        supplier: "fldY3vP72k5IrtH11",
        casNumber: "fldCaBwYY8BfUxF6r",
        ecNumber: "fldLD2DGd7rJFeEwf",
        revisionDate: "fldnO87F7rLnYwHQu",
        sdsVersion: "fldjKv9JfyAcEh5cc",
        hazardClassification: "fldmLs0UIluUGBeDp",
        signalWord: "fldVUJBvqw5FohTrK",
        hStatements: "fldrJNZvYJkS135q7",
        pStatements: "fldQY5F29ugmnjSkN",
        physicalForm: "fld5Cn2bs4lQhFENy",
        firstAid: "fldn1RU1E047VYAGr",
        fireFighting: "fldjANWsHBVx2JtMp",
        ppeRecommended: "fldzDwKgx3g6L9y8H",
        storageRequirements: "fldMmGhwFF0gZgMC3",
        disposalRequirements: "fldkeYOXId8lI9QWn",
        exposureLimits: "fldoXO8cTLKrtg2Gu",
        unNumber: "fldu7MPCeSY0C3ncJ",
        transportInformation: "fldGd9JcfTbkS3fGv",
        language: "fldo23mELm8KCBYR8",
        status: "fldE1wYIm1mVc8oEG",
        notes: "fldqoLMtuiHqYNs8x",
        file: "fldwdrQQpzpboQZta",
        // Formula field (Revision Date + 5 years) — read-only, so
        // deliberately not in formMeta.labels below (Airtable rejects
        // writes to formula fields; the generic sub-record form only
        // renders inputs for formMeta.labels keys).
        expiryDate: "fldSYtv0CM9eDYBAz",
      },
      // GHS Pictograms (multipleSelects) isn't listed here — the generic
      // sub-record form only handles single-value fields; pictograms are
      // set by the Add Chemical wizard and viewable/editable directly in
      // Airtable if ever needed. Every other field is fully editable here.
      formMeta: {
        labels: {
          sdsReference: "SDS Reference", productName: "Product Name", manufacturer: "Manufacturer", supplier: "Supplier",
          casNumber: "CAS Number", ecNumber: "EC Number", revisionDate: "Revision Date", sdsVersion: "SDS Version",
          hazardClassification: "Hazard Classification", signalWord: "Signal Word", hStatements: "H Statements",
          pStatements: "P Statements", physicalForm: "Physical Form", firstAid: "First Aid", fireFighting: "Fire Fighting",
          ppeRecommended: "PPE Recommended", storageRequirements: "Storage Requirements", disposalRequirements: "Disposal Requirements",
          exposureLimits: "Exposure Limits", unNumber: "UN Number", transportInformation: "Transport Information",
          language: "Language", status: "Status", notes: "Notes",
        },
        dateKeys: ["revisionDate"],
        selectOptions: { signalWord: ["Danger", "Warning", "None"], language: ["English", "Bahasa Malaysia", "Other"], status: ["Current", "Superseded"] },
        textareaKeys: ["hazardClassification", "hStatements", "pStatements", "firstAid", "fireFighting", "ppeRecommended", "storageRequirements", "disposalRequirements", "exposureLimits", "transportInformation", "notes"],
        attachmentKey: "file",
        attachmentLabel: "SDS File",
      },
      listColumns: ["revisionDate", "language", "status"],
      countLabel: "SDS Revisions on File",
    },
    exposureMonitoring: {
      title: "Exposure Monitoring",
      api: "/exposure-monitoring",
      primary: "monitoringReference",
      parentFieldKey: "chemical",
      fields: {
        monitoringReference: "fldNRJLLXFXCJTrd6",
        chemical: "fldUvWhAFNeMPUYEW",
        monitoringDate: "fldFZAdSPB9rLCmHa",
        samplingMethod: "fldzwY1GSgRGtwnbx",
        resultValue: "fldJgLwskJ4ErpqNR",
        oelLimit: "fldX1pVuU0Bq5bnIf",
        exceedance: "fldZymFCg89EfE2CW",
        assessor: "fld1k8qrzxqpr4As0",
        attachment: "fld7GBvWkJpZosg8I",
      },
      formMeta: {
        labels: { monitoringReference: "Monitoring Reference", monitoringDate: "Monitoring Date", samplingMethod: "Sampling Method", resultValue: "Result Value", oelLimit: "OEL Limit", exceedance: "Exceedance", assessor: "Assessor" },
        dateKeys: ["monitoringDate"],
        selectOptions: { exceedance: ["Yes", "No"] },
        textareaKeys: [],
        attachmentKey: "attachment",
        attachmentLabel: "Attachment",
      },
      listColumns: ["monitoringDate", "resultValue", "exceedance"],
      openStatusField: "exceedance",
      openValues: ["Yes"],
      openLabel: "Exposure Exceedances",
    },
    storageInspection: {
      title: "Storage Inspection",
      api: "/chemical-storage-inspection",
      primary: "inspectionReference",
      parentFieldKey: "chemical",
      fields: {
        inspectionReference: "fld5JCCGVn0JQRLAg",
        chemical: "fldB17FQUduAuIcY3",
        inspectionDate: "fldeyGoM2eUMRiOJF",
        inspector: "fldfH7LQe7uvNDMuQ",
        result: "fld8o1nmxie3SBhZQ",
        findings: "fldm8ZfahbTBnbXE6",
        nextDue: "fldaYJIQ8WVdpTLGz",
        attachment: "fldYX4eQQY6hzvwgo",
        correctiveAction: "fldmUrQ0IqQj1fjMx",
      },
      formMeta: {
        labels: { inspectionReference: "Inspection Reference", inspectionDate: "Inspection Date", inspector: "Inspector", result: "Result", findings: "Findings", nextDue: "Next Due", correctiveAction: "Corrective Action" },
        dateKeys: ["inspectionDate", "nextDue"],
        selectOptions: { result: ["Pass", "Conditional Pass", "Fail"] },
        textareaKeys: ["findings", "correctiveAction"],
        attachmentKey: "attachment",
        attachmentLabel: "Attachment",
      },
      listColumns: ["inspectionDate", "result", "nextDue"],
      dueField: "nextDue",
      dueSoonLabel: "Storage Inspections Due (30d)",
      overdueLabel: "Overdue Storage Inspections",
      // v2.0: the Storage tab merges this inspection history with the
      // chemical's static storage profile (rendered above the list) — see
      // moduleFramework.js's renderFwProfileSubTable.
      profileHeaderFields: ["Storage Location", "Cabinet", "Maximum Quantity", "Current Quantity", "Storage Method", "Temperature", "Ventilation", "Segregation", "Incompatible Chemicals"],
    },
    labelInspection: {
      title: "Label Inspection",
      api: "/chemical-label-inspection",
      primary: "inspectionReference",
      parentFieldKey: "chemical",
      fields: {
        inspectionReference: "fldJkaUs6Ou81kGLK",
        chemical: "fldl571ud4fjSNVTx",
        inspectionDate: "fldlQrxd3T0zyH5Jg",
        inspector: "fld6tJcHhEkIEKmi0",
        compliant: "fldnlw583dIy1fUP4",
        findings: "fldPfX76lW9DvF2C3",
        attachment: "fldXLfTa1RqXsrdIm",
        labelCondition: "fldBrZ7jWytx7DDPT",
        correctiveAction: "fldFAxTebdyIjNHAm",
      },
      formMeta: {
        labels: { inspectionReference: "Inspection Reference", inspectionDate: "Inspection Date", inspector: "Inspector", compliant: "Compliant", findings: "Findings", labelCondition: "Label Condition", correctiveAction: "Corrective Action" },
        dateKeys: ["inspectionDate"],
        selectOptions: { compliant: ["Yes", "No"], labelCondition: ["Good", "Faded", "Damaged", "Missing"] },
        textareaKeys: ["findings", "correctiveAction"],
        attachmentKey: "attachment",
        attachmentLabel: "Photos",
      },
      listColumns: ["inspectionDate", "compliant", "labelCondition"],
      openStatusField: "compliant",
      openValues: ["No"],
      openLabel: "Non-Compliant Labels",
    },
    wasteManagement: {
      title: "Waste Management",
      api: "/waste-management",
      primary: "disposalReference",
      parentFieldKey: "chemical",
      fields: {
        disposalReference: "fldZoHsavHsEBjK1o",
        chemical: "fldwAfS67lDi52uDh",
        wasteType: "fldVhZ33qz5Pa4sbT",
        disposalDate: "fldbyZrZPk8NReZae",
        disposalMethod: "fldzou44acRxktqfU",
        contractor: "fldEi3MaVDPBUMRPr",
        quantity: "fldNr9HjzzSaysYsP",
        manifest: "fld32wouY65NYZP22",
        scheduledWasteCode: "fldhtiszeyC30vu2G",
        disposalCertificate: "fldVPL9B1NCJ2xsnW",
      },
      formMeta: {
        labels: { disposalReference: "Disposal Reference", wasteType: "Waste Category", scheduledWasteCode: "Scheduled Waste Code", disposalDate: "Disposal Date", disposalMethod: "Disposal Method", contractor: "Licensed Contractor", quantity: "Quantity" },
        dateKeys: ["disposalDate"],
        selectOptions: {},
        textareaKeys: [],
        // Two independently-uploadable files (moduleFramework.js's
        // fw_attachmentConfigs) — a Waste Disposal record needs both the
        // Consignment Note and, once the contractor issues it, a separate
        // Disposal Certificate.
        attachments: [
          { key: "manifest", label: "Consignment Note" },
          { key: "disposalCertificate", label: "Disposal Certificate" },
        ],
      },
      listColumns: ["wasteType", "disposalDate"],
      countLabel: "Waste Disposals Logged",
    },
    training: {
      title: "Chemical Safety Training",
      api: "/chemical-safety-training",
      primary: "trainingReference",
      parentFieldKey: "chemical",
      fields: {
        trainingReference: "fld0qAaTzP5WJZeG6",
        chemical: "fld2pvGHCNd5j77Jz",
        trainingDate: "fldHLKOnkgD2xlTcC",
        trainer: "fldGDed2yDtMpexVb",
        topic: "fldcdr0A87rFXznE9",
        attendees: "fld97FzXcvjP63Z5r",
        numberOfAttendees: "fldV8NT9JKf927yZP",
        nextDue: "fldOZ4JLKfKtvMFd4",
        status: "fld5A5OlvcLtzoSsM",
        attachment: "fldPgXr48JmBolBMz",
      },
      formMeta: {
        labels: { trainingReference: "Training Reference", trainingDate: "Training Date", trainer: "Trainer", topic: "Topic", attendees: "Attendees", numberOfAttendees: "Number of Attendees", nextDue: "Next Due", status: "Status" },
        dateKeys: ["trainingDate", "nextDue"],
        selectOptions: { status: ["Completed", "Scheduled", "Overdue"] },
        textareaKeys: ["attendees"],
        numberKeys: ["numberOfAttendees"],
        attachmentKey: "attachment",
        attachmentLabel: "Attachment",
      },
      listColumns: ["trainingDate", "status", "nextDue"],
      openStatusField: "status",
      openValues: ["Scheduled", "Overdue"],
      openLabel: "Upcoming/Overdue Training",
    },
  },

  // v2.0 order: General Information (page header, above) -> SDS ->
  // Substances -> Storage -> Label Inspection -> Waste Management ->
  // Training -> Documents -> CHRA -> conditional modules (Exposure
  // Monitoring/LEV/Biological Monitoring/Health Surveillance, grouped
  // together via extraProfileTabs below CHRA, each gated by its own
  // assessor-set "<X> Required" flag on Chemicals).
  // No historyTab — unlike Machinery's PM+CM, none of these sub-tables share
  // an obvious "merged timeline" (each is its own confirmed event).
  profileSubTabs: [
    { subKey: "sdsDocuments", tabKey: "sds", label: "SDS", emptyNoun: "SDS revisions" },
    { subKey: "substances", tabKey: "substances", label: "Substances", emptyNoun: "substances" },
    { subKey: "processUsage", tabKey: "processUsage", label: "Process Usage", emptyNoun: "process usage records" },
    { subKey: "storageInspection", tabKey: "storage", label: "Storage", emptyNoun: "storage inspections" },
    { subKey: "labelInspection", tabKey: "label", label: "Label Inspection", emptyNoun: "label inspections" },
    { subKey: "wasteManagement", tabKey: "waste", label: "Waste Management", emptyNoun: "waste disposal records" },
    { subKey: "training", tabKey: "training", label: "Training", emptyNoun: "training records" },
  ],

  // CHRA reused as the risk-assessment tab — not duplicated. The new
  // "Chemical" link field on CHRA (added alongside the existing free-text
  // "Chemical / Substance" field) is what makes this filterable per chemical.
  riskAssessment: {
    label: "CHRA (Risk Assessment)",
    api: "/chra",
    parentFieldKey: "chemical",
    profileSourceKey: "chra",
    primary: "referenceNo",
    fields: {
      referenceNo: "fldI3UQraYGfqQHnU",
      chemical: "fld87YdlzELuDZ1is",
      assessor: "fldONfUJk2I17oAZu",
      reviewDueDate: "fldHCGSIwFl4fzQmP",
      complianceStatus: "fld7L3o0pNfCU2dgq",
    },
    labels: { referenceNo: "Reference No", assessor: "Assessor", reviewDueDate: "Review Due", complianceStatus: "Compliance Status" },
    listColumns: ["assessor", "reviewDueDate", "complianceStatus"],
    dateKeys: ["reviewDueDate"],
    selectFields: ["complianceStatus"],
  },

  // v2.0: the Profile page's Photos + Attachments tabs are replaced by one
  // aggregated Documents tab (mode: "aggregated", sourced from postProcess's
  // profile.documents — see chemicals.js). `fields` is kept only for the
  // Module Dashboard's cross-chemical Documents tab (renderFwDocumentsTab in
  // moduleFramework.js), which still uses the legacy per-field shape since
  // aggregating every chemical's full sub-table documents there would be an
  // expensive fetch — open a specific chemical's profile for its full list.
  documents: {
    label: "Documents",
    mode: "aggregated",
    fields: [
      { label: "SDS (legacy field)", key: "SDS" },
      { label: "Photos", key: "Photos" },
    ],
  },

  // Conditional modules (v2.0): grouped together after CHRA on the Profile
  // page, each gated by its own assessor-set "<X> Required" flag on
  // Chemicals (manual, not AI-inferred — see PROJECT_ROADMAP.md /
  // MEMORY.md decision). Exposure Monitoring already has a real sub-table;
  // LEV/Biological Monitoring/Health Surveillance don't exist yet (future
  // milestones per ARCHITECTURE.md) — their tabs render a short placeholder
  // so the module is future-ready without a redesign, per the brief.
  extraProfileTabs: [
    {
      key: "exposure",
      label: "Exposure Monitoring",
      condition: (record) => record.fields[MODULES.chemicals.fields["Exposure Monitoring Required"]] === "Yes",
      render: (record, profile) => renderFwProfileSubTable(CHEMICAL_MODULE, "exposureMonitoring", profile.subTables.exposureMonitoring, "exposure monitoring records", record),
    },
    {
      key: "lev",
      label: "LEV",
      condition: (record) => record.fields[MODULES.chemicals.fields["LEV Required"]] === "Yes",
      render: () => conditionalModulePlaceholder("Local Exhaust Ventilation (LEV)"),
    },
    {
      key: "biological",
      label: "Biological Monitoring",
      condition: (record) => record.fields[MODULES.chemicals.fields["Biological Monitoring Required"]] === "Yes",
      render: () => conditionalModulePlaceholder("Biological Monitoring"),
    },
    {
      key: "healthSurveillance",
      label: "Health Surveillance",
      condition: (record) => record.fields[MODULES.chemicals.fields["Health Surveillance Required"]] === "Yes",
      render: () => conditionalModulePlaceholder("Health Surveillance"),
    },
  ],

  attachmentsNote: 'To upload or replace files, use "Edit / Manage Files" above, or manage SDS revisions from the SDS tab.',

  // Register page Filter/Search/Quick-Filter/Export toolbar (v2.0), powered
  // by GET /chemicals/reports/register-data — see moduleFramework.js's
  // renderFwRegisterFiltersPage for the generic engine this config drives.
  registerFilters: {
    dataEndpoint: "/chemicals/reports/register-data",
    rowsKey: "rows",
    printReportPath: "/chemical/register-report",
    columns: [
      { key: "productName", label: "Product Name", strong: true },
      { key: "casNumber", label: "CAS Number", render: (row) => escapeHtml(naFallback(row.casNumber, "Not Available")) },
      { key: "storageLocation", label: "Storage Location" },
      { key: "hazardClassification", label: "Hazard Classification", render: (row) => escapeHtml(naFallback(row.hazardClassification, "Not Classified")) },
      { key: "supplier", label: "Supplier" },
      { key: "manufacturer", label: "Manufacturer", render: (row) => escapeHtml(naFallback(row.manufacturer, "Not Available")) },
      { key: "physicalForm", label: "Physical Form", render: (row) => escapeHtml(naFallback(row.physicalForm, "Not Classified")) },
      { key: "sdsStatus", label: "SDS Status", pill: true },
      {
        key: "viewSds",
        label: "SDS",
        render: (row) => row.currentSdsId
          ? `<button type="button" class="btn small" data-view-file="/sds-documents:${row.currentSdsId}:fldwdrQQpzpboQZta">📄 View SDS</button>`
          : `<span class="text-dim">—</span>`,
      },
    ],
    searchFields: ["productName", "casNumber", "supplier", "manufacturer"],
    dropdownFilters: [
      { key: "hazardClassification", label: "Hazard Classification" },
      { key: "storageLocation", label: "Storage Location" },
      { key: "supplier", label: "Supplier" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "physicalForm", label: "Physical Form" },
      { key: "sdsStatus", label: "SDS Status" },
    ],
    quickFilters: [
      { key: "all", label: "All", predicate: () => true },
      { key: "hazardous", label: "Hazardous", predicate: (r) => !!r.hazardClassification },
      { key: "nonHazardous", label: "Non-Hazardous", predicate: (r) => !r.hazardClassification },
      { key: "currentSds", label: "Current SDS", predicate: (r) => r.sdsStatus === "Current" },
      { key: "expiringSoon", label: "Expiring Soon", predicate: (r) => r.sdsStatus === "Expiring Soon" },
      { key: "expiredSds", label: "Expired SDS", predicate: (r) => r.sdsStatus === "Expired" || r.sdsStatus === "Missing" },
    ],
  },

  // Bespoke tabs that don't fit the generic sub-table shape — same spirit as
  // Machinery's AI license-extract endpoints sitting outside the framework.
  extraDashboardTabs: [
    {
      key: "spill",
      label: "Emergency Spill Procedure",
      render: async () => {
        try {
          const data = await api("/sop");
          const f = MODULES.sop.fields;
          const spillDocs = data.records.filter((r) => r.fields[f["Document Type"]] === "Spill Response");
          const rows = spillDocs.map((r) => ({
            cells: {
              title: escapeHtml(r.fields[f["SOP Title"]] || "—"),
              version: escapeHtml(r.fields[f["Version"]] || "—"),
              reviewDue: fmtDate(r.fields[f["Review Due Date"]]),
              approvedBy: escapeHtml(r.fields[f["Approved By"]] || "—"),
            },
          }));
          return Components.dataTable({
            columns: [
              { key: "title", label: "Procedure" },
              { key: "version", label: "Version" },
              { key: "reviewDue", label: "Review Due" },
              { key: "approvedBy", label: "Approved By" },
            ],
            rows,
            emptyLabel: 'No spill response procedures tagged yet. In the SOP module, set a record\'s Document Type to "Spill Response" to show it here.',
          });
        } catch (err) {
          console.error(err);
          return Components.emptyState("Could not load spill response procedures.");
        }
      },
    },
    {
      key: "dosh",
      label: "DOSH Register",
      render: () => `
        <p class="text-dim" style="font-size:13px;margin-bottom:14px;max-width:520px;">
          Generates the official Register of Chemicals Hazardous to Health, in the format required by the DOSH
          "Guidelines for the Preparation of a Chemical Register" (USECHH Regulations 2000), directly from the
          data already stored here — nothing is filled in twice.
        </p>
        <button class="btn primary small" data-navigate="/chemical/dosh-register">Generate DOSH Chemical Register →</button>
      `,
    },
  ],

  // The "+ Add Chemical" quick-add / Register-page button opens the SDS-
  // driven wizard (below) instead of the plain master-record overlay form —
  // see the customAddHandler hook in framework/moduleFramework.js.
  customAddHandler: () => openAddChemicalWizard(),

  // "Expired SDS" doesn't fit the generic per-sub-table KPI shape (it's
  // time-based off the Expiry Date formula field, not a stored status) —
  // reuses the sdsDocuments records the Overview/Reports tabs already
  // fetched (dashboardSubTabOrder includes "sdsDocuments"), no extra
  // request. tabKey jumps to the SDS tab, same as every other KPI card.
  extraOverviewKpis: (dataByKey) => {
    const F = CHEMICAL_MODULE.subTables.sdsDocuments.fields;
    const expiredCount = (dataByKey.sdsDocuments || []).filter(
      (r) => r.fields[F.status] === "Current" && clientSdsExpiryStatus(r.fields[F.expiryDate]) === "Expired"
    ).length;
    return [{ label: "Expired SDS", value: expiredCount, tone: expiredCount ? "bad" : "ok", tabKey: "sdsDocuments" }];
  },
});

// Mirrors the server's sdsExpiryStatus (server/routes/chemicals.js) for the
// Overview/Reports "Expired SDS" KPI — cheap to duplicate (one comparison),
// not worth a round trip since the sdsDocuments records are already local.
function clientSdsExpiryStatus(expiryDateStr) {
  if (!expiryDateStr) return null;
  const daysLeft = (new Date(expiryDateStr) - new Date()) / (1000 * 60 * 60 * 24);
  return daysLeft < 0 ? "Expired" : daysLeft <= 90 ? "Expiring Soon" : "Current";
}

// Missing Value Rules (v2.0 brief): a derived/AI-sourced field that has no
// data shows a specific fallback rather than a bare "—", so the register and
// profile read as deliberately assessed rather than incomplete.
function naFallback(value, fallback) {
  return value === null || value === undefined || value === "" ? fallback : value;
}

// Conditional module (LEV/Biological Monitoring/Health Surveillance) — no
// dedicated table exists yet (future milestone, see PROJECT_ROADMAP.md), so
// the tab only announces the module is required rather than showing a
// broken list. Swapping this for a real sub-table later needs no redesign —
// same pattern Chemical Management itself was built on.
function conditionalModulePlaceholder(moduleName) {
  return `<div class="empty-state">${escapeHtml(moduleName)} has been flagged as required for this chemical. This module isn't built yet — it's on the roadmap (see PROJECT_ROADMAP.md) and will slot in here without another redesign once it ships.</div>`;
}

// Rendered inside the General Information tab (config.generalInfoDerived),
// from the complianceSummary/generalInfo chemicals.js's postProcess hook
// attaches to the profile response — nothing here is fetched again.
function CHEMICAL_MODULE_renderGeneralInfoDerived(profile) {
  const cs = profile.complianceSummary || {};
  const gi = profile.generalInfo || {};
  const sds = gi.currentSds;

  const sdsBlock = `
    <div class="section-head"><h2 style="font-size:13px;">Current SDS</h2></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));">
      <div class="field"><label>Current SDS</label><div style="padding:8px 0;font-size:13.5px;">${sds ? `Version ${escapeHtml(naFallback(sds.version, "—"))}` : "Not Available"}</div></div>
      <div class="field"><label>Current SDS Status</label><div style="padding:8px 0;font-size:13.5px;">${gi.sdsExpiryStatus ? Components.statusPillFor(gi.sdsExpiryStatus) : "Not Available"}</div></div>
      <div class="field"><label>Latest Revision</label><div style="padding:8px 0;font-size:13.5px;">${sds ? fmtDate(sds.revisionDate) : "Not Available"}</div></div>
      <div class="field"><label>Manufacturer</label><div style="padding:8px 0;font-size:13.5px;">${escapeHtml(naFallback(sds?.manufacturer, "Not Available"))}</div></div>
      <div class="field"><label>Physical Form</label><div style="padding:8px 0;font-size:13.5px;">${escapeHtml(naFallback(sds?.physicalForm, "Not Classified"))}</div></div>
    </div>`;

  const flag = (v) => Components.statusPillFor(v === "Yes" ? "Valid" : v === "No" ? "—" : v);
  const complianceBlock = `
    <div class="section-head"><h2 style="font-size:13px;">Compliance Summary</h2></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));">
      <div class="field"><label>SDS Available</label><div style="padding:8px 0;">${cs.sdsAvailable ? Components.statusPillFor("Valid") : Components.statusPillFor("Expired")}</div></div>
      <div class="field"><label>CHRA Completed</label><div style="padding:8px 0;">${cs.chraCompleted ? Components.statusPillFor("Valid") : Components.statusPillFor("Open")}</div></div>
      <div class="field"><label>Exposure Monitoring Required</label><div style="padding:8px 0;">${flag(cs.exposureMonitoringRequired)}</div></div>
      <div class="field"><label>LEV Required</label><div style="padding:8px 0;">${flag(cs.levRequired)}</div></div>
      <div class="field"><label>Biological Monitoring Required</label><div style="padding:8px 0;">${flag(cs.biologicalMonitoringRequired)}</div></div>
      <div class="field"><label>Health Surveillance Required</label><div style="padding:8px 0;">${flag(cs.healthSurveillanceRequired)}</div></div>
      <div class="field"><label>Next Review</label><div style="padding:8px 0;font-size:13.5px;">${cs.nextReview ? fmtDate(cs.nextReview) : "Not Available"}</div></div>
    </div>`;

  return sdsBlock + complianceBlock;
}

// ---------------------------------------------------------------------
// "+ Add Chemical" wizard — SDS-driven intake, upload-first by design:
// (1) upload-only screen (drag & drop or browse, PDF only, mandatory),
// (2) an explicit extraction-progress state while extractSDSData runs
//     server-side, with Retry / Continue Manually on failure,
// (3) one combined review screen — every AI-extracted field editable and
//     pre-filled (visibly highlighted + "AI" badge), every workplace field
//     blank for the user to complete.
// Reuses the shared #overlay/#modalBody exactly like every other form in
// the app (openRecordForm, openSubRecordForm) and the existing Gemini
// extraction pipeline (server/lib/extract.js's extractSDSData) — no
// extraction logic is duplicated here, only the file upload + UI around it.
// ---------------------------------------------------------------------

const GHS_PICTOGRAM_OPTIONS = ["Explosive", "Flammable", "Oxidizing", "Compressed Gas", "Corrosive", "Toxic", "Harmful/Irritant", "Health Hazard", "Environmental Hazard"];
const HAZARD_CATEGORY_OPTIONS = ["Flammable", "Corrosive", "Toxic", "Irritant", "Oxidizing", "Environmental Hazard", "Other"];
const TYPE_OF_USE_OPTIONS = ["Raw Material", "Product", "By-product", "Intermediate-product", "Stored", "Waste", "Cleaning", "Degreasing", "Other"];
const REVIEW_FREQUENCY_OPTIONS = ["Monthly", "Quarterly", "Semi-Annually", "Annually", "Biennially", "Other"];
const CHEMICAL_STATUS_OPTIONS = ["Active", "Under Review", "Inactive", "Discontinued"];
// Not exposed via subTables.sdsDocuments.fields (the generic sub-record form
// only handles single-value inputs) — only the wizard writes these two.
const SDS_GHS_PICTOGRAMS_FIELD_ID = "fldxiPyErIqlC2r8O";
const SDS_EXTRACTED_BY_AI_FIELD_ID = "fldGo4nMa2PpHMD3W";
// Not exposed via subTables.substances.fields for the same reason as above
// (multipleSelects, generic sub-record form only handles single-value
// inputs) — only the wizard's per-substance bulk-create writes this.
const SDS_GHS_PICTOGRAMS_FIELD_ID_SUBSTANCE = "fldjxcnz8orvmo7gr";

function openAddChemicalWizard() {
  modalTouchesModulePath = CHEMICAL_MODULE.basePath;
  renderWizardStep1();
  overlay.classList.add("open");
}

// ---- Step 1: upload only (drag & drop or browse), PDF only, mandatory ----
function renderWizardStep1() {
  modalTitle.textContent = "Add Chemical";
  modalBody.innerHTML = `
    <p class="text-dim" style="font-size:13px;margin-bottom:14px;">Step 1 of 2 — Upload the chemical's Safety Data Sheet (SDS) as a PDF. A PDF is required before you can continue; it's read automatically and used to pre-fill the review step for you to check.</p>
    <div class="field">
      <label>SDS Document (PDF only)</label>
      <div id="wizardDropzone" class="dosh-dropzone">
        <p>Drag &amp; drop the SDS PDF here</p>
        <p class="text-dim" style="font-size:11.5px;">or</p>
        <label class="btn small" style="display:inline-flex;cursor:pointer;">
          Browse File
          <input type="file" id="wizardSdsFile" accept="application/pdf" style="display:none" />
        </label>
      </div>
    </div>
    <div class="flex gap-8" style="margin-top:18px;">
      <button type="button" class="btn ghost" id="wizardCancelBtn">Cancel</button>
    </div>
  `;
  document.getElementById("wizardCancelBtn").addEventListener("click", closeModal);

  const dropzone = document.getElementById("wizardDropzone");
  const fileInput = document.getElementById("wizardSdsFile");

  const handleFile = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast("Please upload a PDF file — other formats aren't accepted for SDS intake.", true);
      return;
    }
    renderWizardExtracting(file);
  };

  fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    handleFile(e.dataTransfer.files[0]);
  });
}

// ---- Step 1.5: extraction progress, with Retry / Continue Manually on failure ----
function renderWizardExtracting(file) {
  modalBody.innerHTML = `
    <div style="text-align:center;padding:36px 20px;">
      <div class="spinner"></div>
      <p style="margin-top:16px;font-size:13.5px;">Reading <strong>${escapeHtml(file.name)}</strong> with AI…</p>
      <p class="text-dim" style="font-size:12px;margin-top:6px;">This usually takes a few seconds.</p>
    </div>
  `;
  extractSDSForWizard(file);
}

async function extractSDSForWizard(file) {
  try {
    const fd = new FormData();
    fd.append("file", file);
    // Reuses the existing extraction pipeline exactly — same endpoint the
    // server builds from server/lib/extract.js's extractSDSData, no
    // duplicated extraction logic on the client.
    const res = await api("/chemicals/extract-sds-preview", { method: "POST", body: fd, isForm: true });
    renderWizardStep2(file, res.suggestion || {});
  } catch (err) {
    renderWizardExtractionFailed(file, err.message);
  }
}

function renderWizardExtractionFailed(file, message) {
  modalBody.innerHTML = `
    <div style="text-align:center;padding:26px 20px;">
      <p style="font-size:13.5px;color:var(--danger);">Could not read the SDS automatically.</p>
      <p class="text-dim" style="font-size:12px;margin-top:6px;max-width:380px;margin-left:auto;margin-right:auto;">${escapeHtml(message)}</p>
      <div class="flex gap-8" style="justify-content:center;margin-top:22px;flex-wrap:wrap;">
        <button type="button" class="btn primary small" id="wizardRetryBtn">Retry Extraction</button>
        <button type="button" class="btn small" id="wizardManualBtn">Continue Manually</button>
        <button type="button" class="btn ghost small" id="wizardCancelBtn3">Cancel</button>
      </div>
    </div>
  `;
  document.getElementById("wizardRetryBtn").addEventListener("click", () => renderWizardExtracting(file));
  document.getElementById("wizardManualBtn").addEventListener("click", () => renderWizardStep2(file, {}));
  document.getElementById("wizardCancelBtn3").addEventListener("click", closeModal);
}

// ---- Step 2: one combined review screen ----
// aiPopulated highlights the field (accent border + "AI" badge) when the
// extraction actually returned a value for it, so the user can see at a
// glance what to double-check vs. what needs their own input.
function wizField(id, label, { type = "text", value = "", rows, aiPopulated = false } = {}) {
  const val = escapeHtml(value ?? "");
  const style = aiPopulated ? ' style="border-color:var(--accent);box-shadow:0 0 0 1px var(--accent);"' : "";
  const badge = aiPopulated ? ' <span class="badge ok" style="font-size:9px;padding:2px 5px;">AI</span>' : "";
  if (rows) return `<div class="field"><label>${label}${badge}</label><textarea id="${id}" rows="${rows}"${style}>${val}</textarea></div>`;
  return `<div class="field"><label>${label}${badge}</label><input type="${type}" id="${id}" value="${val}"${style} /></div>`;
}

function wizSelect(id, label, options, value, { aiPopulated = false } = {}) {
  const style = aiPopulated ? ' style="border-color:var(--accent);box-shadow:0 0 0 1px var(--accent);"' : "";
  const badge = aiPopulated ? ' <span class="badge ok" style="font-size:9px;padding:2px 5px;">AI</span>' : "";
  return `<div class="field"><label>${label}${badge}</label><select id="${id}"${style}>
    <option value="">—</option>
    ${options.map((o) => `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`).join("")}
  </select></div>`;
}

function guessHazardCategory(text) {
  if (!text) return "";
  const t = String(text).toLowerCase();
  return HAZARD_CATEGORY_OPTIONS.find((cat) => cat !== "Other" && t.includes(cat.toLowerCase())) || "";
}

function substancesPreviewHtml(substances) {
  const list = Array.isArray(substances) ? substances.filter((sub) => sub && sub.name) : [];
  if (!list.length) {
    return `<p class="text-dim" style="font-size:12.5px;margin-top:6px;">No Section 3 ingredients were read from this SDS. You can add substances manually afterward from the Substances tab.</p>`;
  }
  return `
    <div class="table-wrap" style="margin-top:8px;">
      <table class="report-table">
        <thead><tr><th>Chemical Name</th><th>CAS No.</th><th>Concentration</th><th>Signal Word</th></tr></thead>
        <tbody>
          ${list.map((sub) => `
            <tr>
              <td>${escapeHtml(sub.name || "—")}</td>
              <td>${escapeHtml(sub.casNumber || "—")}</td>
              <td>${escapeHtml(sub.concentration || "—")}</td>
              <td>${escapeHtml(sub.signalWord || "—")}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <p class="text-dim" style="font-size:11.5px;margin-top:6px;">Read from SDS Section 3 — will be saved as Substances records linked to this chemical. Review/edit them afterward from the Substances tab.</p>
  `;
}

function renderWizardStep2(file, s) {
  modalTitle.textContent = "Add Chemical — Review";
  const guessedCategory = guessHazardCategory(s.hazardClassification);
  const pictograms = new Set(Array.isArray(s.ghsPictograms) ? s.ghsPictograms : []);

  modalBody.innerHTML = `
    <p class="text-dim" style="font-size:13px;margin-bottom:14px;">Step 2 of 2 — Fields marked <span class="badge ok" style="font-size:9px;padding:2px 5px;">AI</span> were read from the SDS; check them before saving. Anything the AI couldn't read is left blank below. Then complete the workplace information.</p>
    <div class="section-head" style="margin-top:0;"><h2 style="font-size:14px;">From the SDS</h2></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));">
      ${wizField("wz_productName", "Product Name", { value: s.productName || s.chemicalName, aiPopulated: !!(s.productName || s.chemicalName) })}
      ${wizField("wz_chemicalNameInfo", "Chemical Name (informational — see Substances below)", { value: s.chemicalName, aiPopulated: !!s.chemicalName })}
      ${wizField("wz_manufacturer", "Manufacturer", { value: s.manufacturer, aiPopulated: !!s.manufacturer })}
      ${wizField("wz_supplier", "Supplier", { value: s.supplier, aiPopulated: !!s.supplier })}
      ${wizField("wz_casNumber", "CAS Number", { value: s.casNumber, aiPopulated: !!s.casNumber })}
      ${wizField("wz_ecNumber", "EC Number", { value: s.ecNumber, aiPopulated: !!s.ecNumber })}
      ${wizField("wz_revisionDate", "Revision Date", { type: "date", value: s.revisionDate, aiPopulated: !!s.revisionDate })}
      ${wizField("wz_sdsVersion", "SDS Version (Revision 1 if blank)", { value: s.sdsVersion, aiPopulated: !!s.sdsVersion })}
      ${wizField("wz_physicalForm", "Physical Form", { value: s.physicalForm, aiPopulated: !!s.physicalForm })}
      ${wizField("wz_unNumber", "UN Number", { value: s.unNumber, aiPopulated: !!s.unNumber })}
      ${wizSelect("wz_signalWord", "Signal Word", ["Danger", "Warning", "None"], s.signalWord, { aiPopulated: !!s.signalWord })}
      ${wizSelect("wz_language", "SDS Language", ["English", "Bahasa Malaysia", "Other"], "English")}
      ${wizSelect("wz_hazardCategory", "Hazard Classification (category)", HAZARD_CATEGORY_OPTIONS, guessedCategory, { aiPopulated: !!guessedCategory })}
    </div>
    <div class="field">
      <label>GHS Pictograms${pictograms.size ? ' <span class="badge ok" style="font-size:9px;padding:2px 5px;">AI</span>' : ""}</label>
      <div class="flex gap-8 flex-wrap" style="margin-top:6px;">
        ${GHS_PICTOGRAM_OPTIONS.map((p) => `
          <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:400;">
            <input type="checkbox" data-ghs="${p}" ${pictograms.has(p) ? "checked" : ""} /> ${p}
          </label>`).join("")}
      </div>
    </div>
    ${wizField("wz_hazardClassification", "Hazard Classification (full text, from SDS)", { value: s.hazardClassification, rows: 2, aiPopulated: !!s.hazardClassification })}
    ${wizField("wz_hStatements", "H Statements", { value: s.hStatements, rows: 2, aiPopulated: !!s.hStatements })}
    ${wizField("wz_pStatements", "P Statements", { value: s.pStatements, rows: 2, aiPopulated: !!s.pStatements })}
    ${wizField("wz_firstAid", "First Aid", { value: s.firstAid, rows: 2, aiPopulated: !!s.firstAid })}
    ${wizField("wz_fireFighting", "Fire Fighting", { value: s.fireFighting, rows: 2, aiPopulated: !!s.fireFighting })}
    ${wizField("wz_ppeRecommended", "PPE Recommended (per SDS)", { value: s.ppeRecommended, rows: 2, aiPopulated: !!s.ppeRecommended })}
    ${wizField("wz_storageRequirements", "Storage Requirements", { value: s.storageRequirements, rows: 2, aiPopulated: !!s.storageRequirements })}
    ${wizField("wz_disposalRequirements", "Disposal Requirements", { value: s.disposalRequirements, rows: 2, aiPopulated: !!s.disposalRequirements })}
    ${wizField("wz_exposureLimits", "Exposure Limits", { value: s.exposureLimits, rows: 2, aiPopulated: !!s.exposureLimits })}
    ${wizField("wz_transportInformation", "Transport Information", { value: s.transportInformation, rows: 2, aiPopulated: !!s.transportInformation })}

    <div class="section-head"><h2 style="font-size:14px;">Substances (SDS Section 3)</h2></div>
    ${substancesPreviewHtml(s.substances)}

    <div class="section-head"><h2 style="font-size:14px;">Workplace Information</h2></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));">
      ${wizField("wz_storageLocation", "Storage Location")}
      ${wizField("wz_department", "Department")}
      ${wizField("wz_responsiblePerson", "Responsible Person")}
      ${wizField("wz_quantity", "Current Quantity")}
      ${wizField("wz_maximumQuantity", "Maximum Quantity")}
      ${wizField("wz_unit", "Unit (e.g. kg, L, m³)")}
      ${wizField("wz_internalCode", "Product Code")}
      ${wizSelect("wz_reviewFrequency", "Review Frequency", REVIEW_FREQUENCY_OPTIONS, "")}
      ${wizSelect("wz_status", "Status", CHEMICAL_STATUS_OPTIONS, "Active")}
    </div>

    <div class="section-head"><h2 style="font-size:14px;">Storage Profile</h2></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));">
      ${wizField("wz_cabinet", "Cabinet")}
      ${wizField("wz_storageMethod", "Storage Method", { value: s.storageRequirements, aiPopulated: !!s.storageRequirements })}
      ${wizField("wz_temperature", "Temperature")}
      ${wizField("wz_ventilation", "Ventilation")}
    </div>
    ${wizField("wz_segregation", "Segregation", { rows: 2 })}
    ${wizField("wz_incompatibleChemicals", "Incompatible Chemicals", { rows: 2 })}

    <div class="section-head"><h2 style="font-size:14px;">Additional Details <span class="text-dim" style="font-weight:400;font-size:11.5px;">(used in the DOSH Chemical Register)</span></h2></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));">
      ${wizField("wz_process", "Process")}
      ${wizField("wz_workersExposed", "No. of Workers Exposed", { type: "number" })}
      ${wizSelect("wz_typeOfUse", "Type of Use", TYPE_OF_USE_OPTIONS, "")}
    </div>
    ${wizField("wz_controlMeasures", "Control Measures", { rows: 2 })}
    ${wizField("wz_ppeActuallyUsed", "PPE Actually Used", { rows: 2 })}
    ${wizField("wz_internalRemarks", "Internal Remarks", { rows: 2 })}

    <div class="flex gap-8" style="margin:18px 0;flex-wrap:wrap;">
      <button type="button" class="btn primary" id="wizardSaveBtn">Save Chemical</button>
      <button type="button" class="btn ghost" id="wizardBackBtn">← Back</button>
      <button type="button" class="btn ghost" id="wizardCancelBtn2">Cancel</button>
    </div>
  `;

  document.getElementById("wizardCancelBtn2").addEventListener("click", closeModal);
  document.getElementById("wizardBackBtn").addEventListener("click", () => renderWizardStep1());
  document.getElementById("wizardSaveBtn").addEventListener("click", () => saveWizard(file, s));
}

function wv(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

async function saveWizard(file, suggestion) {
  const btn = document.getElementById("wizardSaveBtn");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    const CF = MODULES.chemicals.fields;
    const chemFields = {};
    const put = (fieldId, val) => { if (val !== "" && val != null) chemFields[fieldId] = val; };
    put(CF["Product Name"], wv("wz_productName"));
    put(CF["CAS Number"], wv("wz_casNumber"));
    put(CF["Supplier"], wv("wz_supplier"));
    put(CF["Storage Location"], wv("wz_storageLocation"));
    put(CF["Hazard Classification"], wv("wz_hazardCategory"));
    put(CF["Current Quantity"], wv("wz_quantity"));
    put(CF["Maximum Quantity"], wv("wz_maximumQuantity"));
    put(CF["Unit"], wv("wz_unit"));
    put(CF["Exposure Limit"], wv("wz_exposureLimits"));
    put(CF["Department"], wv("wz_department"));
    put(CF["Responsible Person"], wv("wz_responsiblePerson"));
    put(CF["Product Code"], wv("wz_internalCode"));
    put(CF["Review Frequency"], wv("wz_reviewFrequency"));
    put(CF["Status"], wv("wz_status") || "Active");
    put(CF["Process"], wv("wz_process"));
    const workers = wv("wz_workersExposed");
    if (workers !== "") chemFields[CF["No. of Workers Exposed"]] = Number(workers);
    put(CF["Control Measures"], wv("wz_controlMeasures"));
    put(CF["PPE Actually Used"], wv("wz_ppeActuallyUsed"));
    put(CF["Type of Use"], wv("wz_typeOfUse"));
    put(CF["Internal Remarks"], wv("wz_internalRemarks"));
    put(CF["Cabinet"], wv("wz_cabinet"));
    put(CF["Storage Method"], wv("wz_storageMethod"));
    put(CF["Temperature"], wv("wz_temperature"));
    put(CF["Ventilation"], wv("wz_ventilation"));
    put(CF["Segregation"], wv("wz_segregation"));
    put(CF["Incompatible Chemicals"], wv("wz_incompatibleChemicals"));

    if (!chemFields[CF["Product Name"]]) {
      toast("Product Name is required.", true);
      btn.disabled = false;
      btn.textContent = "Save Chemical";
      return;
    }

    const chemical = await CHEMICAL_MODULE._services.master.create(chemFields);

    // Also create the first Chemical Process Usage record from the same
    // "Additional Details" inputs, marked primary — a chemical can later be
    // linked to further processes from its Profile's Process Usage tab. The
    // flat Chemicals fields above are still written too (unchanged, backward
    // compatible); this is additive. Best-effort like Substances below: a
    // failure here shouldn't undo the chemical/SDS that already saved.
    try {
      const PF = CHEMICAL_MODULE.subTables.processUsage.fields;
      const usageFields = { [PF.chemical]: [chemical.id], [PF.isPrimaryUsage]: true };
      const putU = (fieldId, val) => { if (val !== "" && val != null) usageFields[fieldId] = val; };
      putU(PF.process, wv("wz_process"));
      putU(PF.location, wv("wz_storageLocation"));
      putU(PF.quantity, wv("wz_quantity"));
      if (workers !== "") usageFields[PF.workersExposed] = Number(workers);
      putU(PF.controlMeasures, wv("wz_controlMeasures"));
      putU(PF.ppe, wv("wz_ppeActuallyUsed"));
      putU(PF.typeOfUse, wv("wz_typeOfUse"));
      await CHEMICAL_MODULE._services.sub.processUsage.create(usageFields);
    } catch (err) {
      console.error("Could not save the initial process usage record:", err);
    }

    const SF = CHEMICAL_MODULE.subTables.sdsDocuments.fields;
    const ghsPictograms = Array.from(document.querySelectorAll("[data-ghs]:checked")).map((el) => el.dataset.ghs);
    const sdsFields = {};
    const putS = (fieldId, val) => { if (val !== "" && val != null) sdsFields[fieldId] = val; };
    // "Record the SDS as Revision 1 (Current)" — default the version when
    // the AI couldn't read one, so the very first SDS for a new chemical is
    // always explicitly versioned rather than left blank.
    const sdsVersion = wv("wz_sdsVersion") || "1";
    putS(SF.sdsReference, `${wv("wz_productName") || "SDS"} v${sdsVersion}`);
    sdsFields[SF.chemical] = [chemical.id];
    putS(SF.productName, wv("wz_productName"));
    putS(SF.manufacturer, wv("wz_manufacturer"));
    putS(SF.supplier, wv("wz_supplier"));
    putS(SF.casNumber, wv("wz_casNumber"));
    putS(SF.ecNumber, wv("wz_ecNumber"));
    putS(SF.revisionDate, wv("wz_revisionDate"));
    putS(SF.sdsVersion, sdsVersion);
    putS(SF.hazardClassification, wv("wz_hazardClassification"));
    putS(SF.signalWord, wv("wz_signalWord"));
    if (ghsPictograms.length) sdsFields[SDS_GHS_PICTOGRAMS_FIELD_ID] = ghsPictograms;
    putS(SF.hStatements, wv("wz_hStatements"));
    putS(SF.pStatements, wv("wz_pStatements"));
    putS(SF.physicalForm, wv("wz_physicalForm"));
    putS(SF.firstAid, wv("wz_firstAid"));
    putS(SF.fireFighting, wv("wz_fireFighting"));
    putS(SF.ppeRecommended, wv("wz_ppeRecommended"));
    putS(SF.storageRequirements, wv("wz_storageRequirements"));
    putS(SF.disposalRequirements, wv("wz_disposalRequirements"));
    putS(SF.exposureLimits, wv("wz_exposureLimits"));
    putS(SF.unNumber, wv("wz_unNumber"));
    putS(SF.transportInformation, wv("wz_transportInformation"));
    putS(SF.language, wv("wz_language") || "English");
    sdsFields[SF.status] = "Current";
    sdsFields[SDS_EXTRACTED_BY_AI_FIELD_ID] = Object.keys(suggestion || {}).length > 0;

    const sdsRecord = await CHEMICAL_MODULE._services.sub.sdsDocuments.create(sdsFields);
    await CHEMICAL_MODULE._services.sub.sdsDocuments.upload(sdsRecord.id, "file", file);

    // Bulk-create Substances records from the SDS's Section 3 extraction,
    // linked to the new chemical. Best-effort: a substance create failing
    // shouldn't undo the chemical/SDS that already saved successfully — the
    // user can add substances manually from the Substances tab afterward.
    const SubF = CHEMICAL_MODULE.subTables.substances.fields;
    const substances = Array.isArray(suggestion?.substances) ? suggestion.substances.filter((sub) => sub && sub.name) : [];
    for (const sub of substances) {
      try {
        const subFields = { [SubF.chemical]: [chemical.id] };
        const putSub = (fieldId, val) => { if (val !== "" && val != null) subFields[fieldId] = val; };
        putSub(SubF.chemicalName, sub.name);
        putSub(SubF.casNumber, sub.casNumber);
        putSub(SubF.ecNumber, sub.ecNumber);
        putSub(SubF.reachNumber, sub.reachNumber);
        putSub(SubF.concentration, sub.concentration);
        putSub(SubF.hazardClassification, sub.hazardClassification);
        putSub(SubF.signalWord, sub.signalWord);
        putSub(SubF.hStatements, sub.hStatements);
        putSub(SubF.pStatements, sub.pStatements);
        if (Array.isArray(sub.ghsPictograms) && sub.ghsPictograms.length) subFields[SDS_GHS_PICTOGRAMS_FIELD_ID_SUBSTANCE] = sub.ghsPictograms;
        await CHEMICAL_MODULE._services.sub.substances.create(subFields);
      } catch (err) {
        console.error("Could not save a substance from SDS Section 3:", err);
      }
    }

    toast(substances.length ? `Chemical added, SDS saved, and ${substances.length} substance(s) recorded.` : "Chemical added and SDS saved.");
    closeModal();
  } catch (err) {
    toast(err.message, true);
    btn.disabled = false;
    btn.textContent = "Save Chemical";
  }
}

// ---------------------------------------------------------------------
// DOSH Chemical Register — generated report (Layer 2). Read-only view over
// data already captured in the operational system (Layer 1); nothing here
// is a second place to type things in, except Section A (Company Info,
// set once and reused) and Section C (who's generating this specific copy).
// ---------------------------------------------------------------------

const DOSH_GEN_FIELDS = {
  generationReference: "fldFDBFWXCqvMijmI",
  generatedDate: "fld3tXpmD2HMDL4TK",
  generatedBy: "fldWjhcA8lxrZjDQq",
  preparedByName: "fldz4mGogntj9ccuB",
  preparedByTitle: "fld4kskgsr0UwQgzw",
  reviewedByName: "fldwtryC9vrCVbkt9",
  reviewedByTitle: "fldelgPkgOV0dFU7n",
  exportFormat: "fldiwjEjyxuqoShs6", // v2.1: "PDF" or "Excel" — see DOSH_REGISTER_FIELD_MAPPING.md
};

// Row unit for Section B is one Substance per Chemical (a Chemical with no
// linked Substances still gets one row — see server/routes/chemicals.js).
// 8 rows/page; the final page caps at 5 so Section C fits below it on the
// same sheet, matching the guideline's own Appendix 5 pagination.
const DOSH_ROWS_PER_PAGE = 8;
const DOSH_ROWS_LAST_PAGE_WITH_C = 5;
const DOSH_REPORT_VERSION = "v2.1";

Router.register("/chemical/dosh-register", async (params, path, isCurrent) => {
  const view = document.getElementById("view");
  const isAdmin = Auth.user()?.role === "Admin";
  view.innerHTML = `<div class="page-loading">Loading…</div>`;

  let data;
  try {
    data = await api("/chemicals/reports/dosh-register-data");
  } catch (err) {
    if (!isCurrent()) return;
    console.error(err);
    view.innerHTML = Components.emptyState("Could not load the DOSH register data.");
    return;
  }
  if (!isCurrent()) return;

  view.innerHTML = `
    <div class="no-print">${Components.breadcrumb([
      { label: "Dashboard", href: "/" },
      { label: "Chemical Management", href: "/chemical" },
      { label: "DOSH Chemical Register" },
    ])}</div>
    <div id="doshReport"></div>
  `;
  renderDoshReport(data, isAdmin);
});

function renderDoshReport(data, isAdmin) {
  const c = data.company || {};
  const activities = c.companyActivity || [];
  const activityMark = (name) => (activities.includes(name) ? "✓" : "");
  const pages = ReportEngine.paginate(data.rows, { perPage: DOSH_ROWS_PER_PAGE, lastPageReserve: DOSH_ROWS_LAST_PAGE_WITH_C });
  const pageCount = pages.length + 1; // +1 for Section A's own page
  const documentNumber = ReportEngine.documentNumber(c, "DOSH-REG");
  // Landscape is structural (Section B's 15 columns), not a preference, and
  // colours never apply — the official guideline form stays black-and-white
  // regardless of Company Profile's Primary/Secondary Colour, matching its
  // existing logo/stamp exclusion.
  const pageAttrs = ReportEngine.pageAttrs(c, "landscape", { colours: false });
  const pageAttrsStr = `class="report-page ${pageAttrs.class}" style="${pageAttrs.style}"`;

  const sectionAHtml = `
    <section ${pageAttrsStr}>
      ${ReportEngine.renderWatermark(c)}
      ${ReportEngine.renderConfidentialBanner(c)}
      <div class="report-title">REGISTER OF CHEMICALS HAZARDOUS TO HEALTH</div>
      <p style="text-align:center;font-size:10.5px;" class="text-dim">Prepared under the Occupational Safety and Health (Use and Standard of Exposure of Chemicals Hazardous to Health) Regulations 2000</p>
      ${ReportEngine.renderDocInfo(c, { documentNumber, reportVersion: DOSH_REPORT_VERSION, generatedAt: new Date().toISOString() })}

      <div class="report-section-head">SECTION A : COMPANY INFORMATION</div>
      <div class="report-form-box">
        <div class="report-form-row"><label>Name</label>${ReportEngine.charBoxes(c.companyName)}</div>
        <p class="report-form-note">(Refer to Appendix 2 for Code of Sector and Appendix 3 for Class of Industry)</p>
        <div class="report-form-row"><label>Address</label>${ReportEngine.charBoxes(c.address)}</div>
        <div class="report-form-row report-form-row-split">
          <div class="report-form-row"><label>City</label>${ReportEngine.charBoxes(c.city)}</div>
          <div class="report-form-row"><label>Postcode</label>${ReportEngine.charBoxes(c.postcode)}</div>
        </div>
        <div class="report-form-row"><label>State</label>${ReportEngine.charBoxes(c.state)}</div>
        <div class="report-form-row"><label>Telephone No.</label>${ReportEngine.charBoxes(c.telephone)}</div>
        <div class="report-form-row"><label>Email</label>${ReportEngine.charBoxes(c.email)}</div>
        <div class="report-form-row"><label>DOSH Registration No.</label>${ReportEngine.charBoxes(c.doshRegistrationNo)}</div>
        <div class="report-form-row report-form-row-split">
          <div class="report-form-row"><label>Code of Sector</label>${ReportEngine.charBoxes(c.codeOfSector)}</div>
          <div class="report-form-row"><label>Class of Industry</label>${ReportEngine.charBoxes(c.classOfIndustry)}</div>
        </div>
        <div style="margin-top:8px;">
          <div style="font-weight:600;margin-bottom:4px;">Company Activity (Please enter ( / ) in the appropriate box):</div>
          <div class="report-check-grid">
            ${["Manufacturer", "Importer", "Distributor", "Formulator", "End-User"]
              .map((name) => `<div>${name}</div><div class="report-check-box">${activityMark(name)}</div>`)
              .join("")}
          </div>
        </div>
      </div>
      ${ReportEngine.renderFooter(c, { pageNum: 1, pageCount })}
    </section>
  `;

  const sectionBHtml = pages
    .map((rows, idx) => {
      const showC = idx === pages.length - 1;
      return `
    <section ${pageAttrsStr}>
      ${ReportEngine.renderWatermark(c)}
      ${ReportEngine.renderConfidentialBanner(c)}
      <div class="report-section-head">SECTION B : LIST OF CHEMICALS HAZARDOUS TO HEALTH</div>
      <div class="report-meta-strip">
        <div>Location: <strong>${escapeHtml(rows[0]?.storageLocation || "—")}</strong></div>
        <div>Process Operation: <strong>${escapeHtml(rows[0]?.process || "—")}</strong></div>
        <div>No. of Hazardous Chemicals: <strong>${data.chemicalCount ?? data.rows.length}</strong></div>
      </div>
      <table class="report-table report-table--compact">
        <colgroup>
          ${[10, 12, 6, 6, 14, 5, 4, 5, 5, 5, 5, 7, 6, 5, 5].map((pct) => `<col style="width:${pct}%">`).join("")}
        </colgroup>
        <thead>
          <tr>
            <th rowspan="2">Product Name</th>
            <th rowspan="2">Name of Chemical</th>
            <th rowspan="2">CAS No.</th>
            <th rowspan="2">Physical Form</th>
            <th rowspan="2">Active Ingredients</th>
            <th rowspan="2">Quantity</th>
            <th rowspan="2">Type#</th>
            <th rowspan="2">Class</th>
            <th rowspan="2">CSDS<br>(Y/N)</th>
            <th rowspan="2">Label<br>(Y/N)</th>
            <th rowspan="2">Workers<br>Exposed</th>
            <th rowspan="2">Usage of Chemical</th>
            <th colspan="2">Type of Control Measures</th>
            <th rowspan="2">Supplier</th>
          </tr>
          <tr>
            <th>Engineering Control</th>
            <th>PPE</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td>${escapeHtml(r.productName || "—")}</td>
              <td>${escapeHtml(r.chemicalName || "—")}</td>
              <td>${escapeHtml(r.casNumber || "—")}</td>
              <td>${escapeHtml(r.physicalForm || "—")}</td>
              <td>${escapeHtml(r.activeIngredients || "—")}</td>
              <td>${escapeHtml(String(r.quantity || "—"))}</td>
              <td style="text-align:center;">${escapeHtml(r.typeCode || "—")}</td>
              <td style="text-align:center;">${escapeHtml(r.hazardClass || "NA")}</td>
              <td style="text-align:center;">${r.csds}</td>
              <td style="text-align:center;">${r.label}</td>
              <td style="text-align:center;">${escapeHtml(String(r.workersExposed === "" ? "—" : r.workersExposed))}</td>
              <td>${escapeHtml(r.typeOfUse || "—")}</td>
              <td>${escapeHtml(r.controlMeasures || "—")}</td>
              <td>${escapeHtml(r.ppeActuallyUsed || "—")}</td>
              <td>${escapeHtml(r.supplier || "—")}</td>
            </tr>`
            )
            .join("") || `<tr><td colspan="15" class="text-dim">No chemicals registered yet.</td></tr>`}
        </tbody>
      </table>
      ${
        showC
          ? `
      <div class="report-section-head" style="margin-top:14px;">SECTION C : NAME OF PERSON WHO PREPARED OR REVIEWED</div>
      ${ReportEngine.renderSignatureBlock(
        {
          preparedByName: c.defaultPreparedByName,
          preparedByTitle: c.defaultPreparedByPosition,
          reviewedByName: c.defaultReviewedByName,
          reviewedByTitle: c.defaultReviewedByPosition,
          approvedByName: c.approvedByName,
          approvedByTitle: c.approvedByPosition,
        },
        "dosh",
        c
      )}
      <p class="text-dim no-print" style="font-size:11px;margin-top:6px;">Pre-filled from Company Profile (Admin → Company Profile) — still editable for this generation.</p>`
          : ""
      }
      ${ReportEngine.renderFooter(c, { pageNum: idx + 2, pageCount })}
    </section>`;
    })
    .join("");

  const me = Auth.user();
  document.getElementById("doshReport").innerHTML = `
    <div id="doshToolbar"></div>
    ${sectionAHtml}
    ${sectionBHtml}
    ${ReportEngine.renderGeneratedNote(c, { generatedBy: me?.fullName || me?.email })}
  `;

  async function logDoshGeneration(exportFormat) {
    const me = Auth.user();
    await ReportEngine.logGeneration("/dosh-register-generations", {
      fields: {
        [DOSH_GEN_FIELDS.generationReference]: `DOSH-REG-${Date.now()}`,
        [DOSH_GEN_FIELDS.generatedDate]: new Date().toISOString(),
        [DOSH_GEN_FIELDS.generatedBy]: me?.fullName || me?.email || "Unknown",
        [DOSH_GEN_FIELDS.preparedByName]: document.getElementById("doshPreparedName")?.value || "",
        [DOSH_GEN_FIELDS.preparedByTitle]: document.getElementById("doshPreparedTitle")?.value || "",
        [DOSH_GEN_FIELDS.reviewedByName]: document.getElementById("doshReviewedName")?.value || "",
        [DOSH_GEN_FIELDS.reviewedByTitle]: document.getElementById("doshReviewedTitle")?.value || "",
        [DOSH_GEN_FIELDS.exportFormat]: exportFormat,
      },
    });
  }

  ReportEngine.mountToolbar(document.getElementById("doshToolbar"), {
    editHref: isAdmin ? "/admin.html" : null,
    onPrint: async () => {
      await logDoshGeneration("PDF");
      window.print();
    },
    onExportExcel: async () => {
      await logDoshGeneration("Excel");
      doshExportExcel(data);
    },
  });
}

// ---------------------------------------------------------------------
// Excel export — a real formatted .xlsx (merged cells, borders, frozen/
// repeating header row, landscape page setup), not the CSV the main
// Chemical Register's own "Export Excel" button uses (moduleFramework.js's
// exportFwRowsAsCsv, unchanged and unrelated to this). ExcelJS is lazy-
// loaded from a CDN on first click rather than bundled — this app has no
// build step, and this is the one report where a plain CSV can't reproduce
// the guideline's actual merged/bordered Section A/B/C layout.
// ---------------------------------------------------------------------
async function doshExportExcel(data) {
  await ReportEngine.loadExcelJs().catch((err) => {
    toast(err.message, true);
    throw err;
  });

  const c = data.company || {};
  const rows = data.rows || [];
  const wb = new window.ExcelJS.Workbook();
  const ws = ReportEngine.newWorksheet(wb, "Chemical Register", { orientation: "landscape" });
  const border = ReportEngine.EXCEL_BORDER;

  const cols = [
    "Product Name", "Name of Chemical", "CAS No.", "Physical Form", "Active Ingredients",
    "Quantity", "Type#", "Class", "CSDS (Y/N)", "Label (Y/N)", "Workers Exposed",
    "Usage of Chemical", "Engineering Control", "PPE", "Supplier",
  ];
  ws.columns = cols.map(() => ({ width: 16 }));
  const CTRL_START = cols.indexOf("Engineering Control") + 1;

  ws.mergeCells(1, 1, 1, cols.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = "REGISTER OF CHEMICALS HAZARDOUS TO HEALTH";
  titleCell.font = { bold: true, size: 14, name: "Arial" };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.border = border;
  ws.getRow(1).height = 22;

  ReportEngine.excelSectionHead(ws, 2, "SECTION A : COMPANY INFORMATION", cols.length);
  ReportEngine.excelInfoRow(ws, 3, [["Name", c.companyName || ""], ["DOSH Reg. No.", c.doshRegistrationNo || ""]], cols.length);
  ReportEngine.excelInfoRow(ws, 4, [["Address", c.address || ""], ["Code of Sector", c.codeOfSector || ""]], cols.length);
  ReportEngine.excelInfoRow(ws, 5, [["City / Postcode", [c.city, c.postcode].filter(Boolean).join(" / ")], ["Class of Industry", c.classOfIndustry || ""]], cols.length);
  ReportEngine.excelInfoRow(ws, 6, [["State", c.state || ""], ["Telephone", c.telephone || ""]], cols.length);
  ReportEngine.excelInfoRow(ws, 7, [["Email", c.email || ""], ["Company Activity", (c.companyActivity || []).join(", ")]], cols.length);

  ReportEngine.excelSectionHead(ws, 8, "SECTION B : LIST OF CHEMICALS HAZARDOUS TO HEALTH", cols.length);
  // Two-row grouped header (Type of Control Measures spans Engineering
  // Control/PPE) doesn't fit ReportEngine.excelHeaderRow's simple single-row
  // shape, so it stays bespoke here — every other section reuses the shared
  // helpers above.
  const groupRow = 9;
  const headerRow = 10;
  ws.mergeCells(groupRow, CTRL_START, groupRow, CTRL_START + 1);
  const groupCell = ws.getCell(groupRow, CTRL_START);
  groupCell.value = "Type of Control Measures";
  groupCell.font = { bold: true, size: 9, name: "Arial" };
  groupCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } };
  groupCell.alignment = { horizontal: "center", vertical: "middle" };
  groupCell.border = border;

  const hRow = ws.getRow(headerRow);
  cols.forEach((label, i) => {
    const colNum = i + 1;
    const inGroup = colNum === CTRL_START || colNum === CTRL_START + 1;
    if (!inGroup) ws.mergeCells(groupRow, colNum, headerRow, colNum);
    const top = ws.getCell(groupRow, colNum);
    if (!inGroup) top.value = label;
    top.font = { bold: true, size: 9, name: "Arial" };
    top.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } };
    top.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    top.border = border;
    const bottom = hRow.getCell(colNum);
    bottom.value = inGroup ? label : undefined;
    bottom.font = { bold: true, size: 9, name: "Arial" };
    bottom.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } };
    bottom.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    bottom.border = border;
  });
  ws.views = [{ state: "frozen", ySplit: headerRow, showGridLines: false }];
  ws.pageSetup.printTitlesRow = `${groupRow}:${headerRow}`;

  rows.forEach((r, idx) => {
    ReportEngine.excelDataRow(ws, headerRow + 1 + idx, [
      r.productName, r.chemicalName, r.casNumber, r.physicalForm, r.activeIngredients,
      r.quantity, r.typeCode, r.hazardClass, r.csds, r.label, r.workersExposed,
      r.typeOfUse, r.controlMeasures, r.ppeActuallyUsed, r.supplier,
    ]).height = 26;
  });

  const sigRow = headerRow + rows.length + 2;
  ReportEngine.excelSectionHead(ws, sigRow, "SECTION C : NAME OF PERSON WHO PREPARED OR REVIEWED", cols.length);
  const half = Math.floor(cols.length / 2);
  function sigLine(r, label) {
    ws.mergeCells(r, 1, r, half);
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { size: 9, name: "Arial" };
    ws.getCell(r, 1).border = border;
    ws.mergeCells(r, half + 1, r, cols.length);
    ws.getCell(r, half + 1).border = border;
  }
  sigLine(sigRow + 1, `Prepared By — Name: ${document.getElementById("doshPreparedName")?.value || ""}   Title: ${document.getElementById("doshPreparedTitle")?.value || ""}`);
  sigLine(sigRow + 2, `Reviewed By — Name: ${document.getElementById("doshReviewedName")?.value || ""}   Title: ${document.getElementById("doshReviewedTitle")?.value || ""}`);
  ws.pageSetup.printArea = `A1:${String.fromCharCode(64 + cols.length)}${sigRow + 2}`;

  await ReportEngine.downloadWorkbook(wb, `dosh-chemical-register-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ---------------------------------------------------------------------
// Chemical Register — general print/export report (distinct from the DOSH
// Chemical Register above, which reproduces an official government form).
// Portrait, full corporate branding (logo/stamp — unlike DOSH, this report
// has no "match the government form exactly" constraint), built entirely on
// ReportEngine — the first non-DOSH report to use the shared engine. Reuses
// the same /chemicals/reports/register-data endpoint the Register page's
// on-screen filter/search table already fetches, now also returning
// `company` (see server/routes/chemicals.js).
// ---------------------------------------------------------------------
const CHEMICAL_REGISTER_REPORT_VERSION = "v1.0";
const CHEMICAL_REGISTER_ROWS_PER_PAGE = 20;
const CHEMICAL_REGISTER_ROWS_LAST_PAGE_WITH_SIGNOFF = 14;

Router.register("/chemical/register-report", async (params, path, isCurrent) => {
  const view = document.getElementById("view");
  const isAdmin = Auth.user()?.role === "Admin";
  view.innerHTML = `<div class="page-loading">Loading…</div>`;

  let data;
  try {
    data = await api("/chemicals/reports/register-data");
  } catch (err) {
    if (!isCurrent()) return;
    console.error(err);
    view.innerHTML = Components.emptyState("Could not load the Chemical Register data.");
    return;
  }
  if (!isCurrent()) return;

  view.innerHTML = `
    <div class="no-print">${Components.breadcrumb([
      { label: "Dashboard", href: "/" },
      { label: "Chemical Management", href: "/chemical" },
      { label: "Chemical Register Report" },
    ])}</div>
    <div id="chemRegisterReport"></div>
  `;
  renderChemicalRegisterReport(data, isAdmin);
});

function renderChemicalRegisterReport(data, isAdmin) {
  const rows = data.rows || [];
  const c = data.company || {};
  const pages = ReportEngine.paginate(rows, {
    perPage: CHEMICAL_REGISTER_ROWS_PER_PAGE,
    lastPageReserve: CHEMICAL_REGISTER_ROWS_LAST_PAGE_WITH_SIGNOFF,
  });
  const documentNumber = ReportEngine.documentNumber(c, "CHEM-REG");
  // No structural orientation requirement (only 8 columns) — respects the
  // admin's Default Orientation.
  const pageAttrs = ReportEngine.pageAttrs(c);
  const pageAttrsStr = `class="report-page ${pageAttrs.class}" style="${pageAttrs.style}"`;

  const pagesHtml = pages
    .map((pageRows, idx) => {
      const showSignoff = idx === pages.length - 1;
      return `
    <section ${pageAttrsStr}>
      ${ReportEngine.renderWatermark(c)}
      ${ReportEngine.renderConfidentialBanner(c)}
      ${idx === 0 ? `
      <div class="report-title">CHEMICAL REGISTER</div>
      ${ReportEngine.renderBranding(c)}
      ${ReportEngine.renderDocInfo(c, { documentNumber, reportVersion: CHEMICAL_REGISTER_REPORT_VERSION, generatedAt: new Date().toISOString() })}
      ` : ""}
      <table class="report-table report-table--compact">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>CAS No.</th>
            <th>Storage Location</th>
            <th>Hazard Classification</th>
            <th>Supplier</th>
            <th>Manufacturer</th>
            <th>Physical Form</th>
            <th>SDS Status</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows
            .map(
              (r) => `
            <tr>
              <td>${escapeHtml(r.productName || "—")}</td>
              <td>${escapeHtml(r.casNumber || "—")}</td>
              <td>${escapeHtml(r.storageLocation || "—")}</td>
              <td>${escapeHtml(r.hazardClassification || "Not Classified")}</td>
              <td>${escapeHtml(r.supplier || "—")}</td>
              <td>${escapeHtml(r.manufacturer || "—")}</td>
              <td>${escapeHtml(r.physicalForm || "—")}</td>
              <td>${escapeHtml(r.sdsStatus || "—")}</td>
            </tr>`
            )
            .join("") || `<tr><td colspan="8" class="text-dim">No chemicals registered yet.</td></tr>`}
        </tbody>
      </table>
      ${
        showSignoff
          ? `
      <div class="report-section-head" style="margin-top:14px;">PREPARED / REVIEWED</div>
      ${ReportEngine.renderSignatureBlock(
        {
          preparedByName: c.defaultPreparedByName,
          preparedByTitle: c.defaultPreparedByPosition,
          reviewedByName: c.defaultReviewedByName,
          reviewedByTitle: c.defaultReviewedByPosition,
          approvedByName: c.approvedByName,
          approvedByTitle: c.approvedByPosition,
        },
        "chemReg",
        c
      )}`
          : ""
      }
      ${ReportEngine.renderFooter(c, { pageNum: idx + 1, pageCount: pages.length })}
    </section>`;
    })
    .join("");

  const me = Auth.user();
  document.getElementById("chemRegisterReport").innerHTML = `
    <div id="chemRegisterToolbar"></div>
    ${pagesHtml}
    ${ReportEngine.renderGeneratedNote(c, { generatedBy: me?.fullName || me?.email })}
  `;

  ReportEngine.mountToolbar(document.getElementById("chemRegisterToolbar"), {
    editHref: isAdmin ? "/admin.html" : null,
    onPrint: () => window.print(),
    onExportExcel: () => chemicalRegisterExportExcel(data),
  });
}

async function chemicalRegisterExportExcel(data) {
  await ReportEngine.loadExcelJs().catch((err) => {
    toast(err.message, true);
    throw err;
  });

  const rows = data.rows || [];
  const wb = new window.ExcelJS.Workbook();
  const ws = ReportEngine.newWorksheet(wb, "Chemical Register", { orientation: "portrait" });

  const cols = ["Product Name", "CAS No.", "Storage Location", "Hazard Classification", "Supplier", "Manufacturer", "Physical Form", "SDS Status"];
  ws.columns = cols.map(() => ({ width: 20 }));
  ReportEngine.excelHeaderRow(ws, 1, cols, { freeze: true, repeat: true });
  rows.forEach((r, idx) => {
    ReportEngine.excelDataRow(ws, idx + 2, [
      r.productName, r.casNumber, r.storageLocation, r.hazardClassification, r.supplier, r.manufacturer, r.physicalForm, r.sdsStatus,
    ]);
  });

  await ReportEngine.downloadWorkbook(wb, `chemical-register-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
