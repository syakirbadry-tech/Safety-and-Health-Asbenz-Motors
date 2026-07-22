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
  nameField: "Chemical Name",
  // No statusDateField: unlike Machinery's "Next Inspection Due", the
  // Chemicals master record has no single inherent due-date — due/overdue
  // status lives on the sub-tables (Storage Inspection's Next Due, etc.),
  // surfaced through the Overview/Reports KPIs instead of a per-row badge.
  masterCountLabel: "Registered Chemicals",

  registerColumns: [
    { key: "name", label: "Chemical Name", field: "Chemical Name", strong: true },
    { key: "storage", label: "Storage Location", field: "Storage Location" },
    { key: "hazard", label: "Hazard Classification", field: "Hazard Classification" },
    { key: "supplier", label: "Supplier", field: "Supplier" },
  ],

  generalInfoFields: [
    "Chemical Name", "CAS Number", "Supplier", "Storage Location",
    "Hazard Classification", "Quantity", "PPE Requirement", "Exposure Limit", "Notes",
  ],
  headerSubtitleFields: ["Storage Location", "CAS Number"],

  dashboardSubTabOrder: ["exposureMonitoring", "storageInspection", "labelInspection", "wasteManagement"],

  subTables: {
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
      },
      formMeta: {
        labels: { inspectionReference: "Inspection Reference", inspectionDate: "Inspection Date", inspector: "Inspector", result: "Result", findings: "Findings", nextDue: "Next Due" },
        dateKeys: ["inspectionDate", "nextDue"],
        selectOptions: { result: ["Pass", "Conditional Pass", "Fail"] },
        textareaKeys: ["findings"],
        attachmentKey: "attachment",
        attachmentLabel: "Attachment",
      },
      listColumns: ["inspectionDate", "result", "nextDue"],
      dueField: "nextDue",
      dueSoonLabel: "Storage Inspections Due (30d)",
      overdueLabel: "Overdue Storage Inspections",
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
      },
      formMeta: {
        labels: { inspectionReference: "Inspection Reference", inspectionDate: "Inspection Date", inspector: "Inspector", compliant: "Compliant", findings: "Findings" },
        dateKeys: ["inspectionDate"],
        selectOptions: { compliant: ["Yes", "No"] },
        textareaKeys: ["findings"],
        attachmentKey: "attachment",
        attachmentLabel: "Attachment",
      },
      listColumns: ["inspectionDate", "compliant"],
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
      },
      formMeta: {
        labels: { disposalReference: "Disposal Reference", wasteType: "Waste Type", disposalDate: "Disposal Date", disposalMethod: "Disposal Method", contractor: "Contractor", quantity: "Quantity" },
        dateKeys: ["disposalDate"],
        selectOptions: {},
        textareaKeys: [],
        attachmentKey: "manifest",
        attachmentLabel: "Manifest",
      },
      listColumns: ["wasteType", "disposalDate"],
      countLabel: "Waste Disposals Logged",
    },
  },

  // No historyTab — unlike Machinery's PM+CM, none of these four sub-tables
  // share an obvious "merged timeline" (each is confirmed, not scheduled).
  profileSubTabs: [
    { subKey: "exposureMonitoring", tabKey: "exposure", label: "Exposure Monitoring", emptyNoun: "exposure monitoring records" },
    { subKey: "storageInspection", tabKey: "storage", label: "Storage Inspection", emptyNoun: "storage inspections" },
    { subKey: "labelInspection", tabKey: "label", label: "Label Inspection", emptyNoun: "label inspections" },
    { subKey: "wasteManagement", tabKey: "waste", label: "Waste Management", emptyNoun: "waste disposal records" },
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

  photos: { fieldKey: "Photos", uploadKey: "photos" },

  // "SDS Library" is the Documents-tab pattern scoped to just the SDS field —
  // Photos still gets its own Profile tab like Machinery, so it's included
  // here too for a complete Attachments view.
  documents: {
    label: "SDS Library",
    fields: [
      { label: "SDS", key: "SDS" },
      { label: "Photos", key: "Photos" },
    ],
  },

  attachmentsNote: 'To upload or replace files (SDS, photos), use "Edit / Manage Files" above.',

  // Emergency Spill Procedure: shows SOP records tagged Document Type =
  // "Spill Response" rather than a dedicated table (avoids duplicating SOP)
  // — reuses the existing /api/sop endpoint directly, same as Machinery's
  // AI-extract endpoints sit outside the generic sub-table shape.
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
  ],
});
