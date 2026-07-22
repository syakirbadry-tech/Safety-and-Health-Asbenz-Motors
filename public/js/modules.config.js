// Field-ID maps mirrored from server/lib/schema.js. Field IDs aren't secret
// (the Airtable PAT is what's protected, and it never reaches this file) —
// this just tells the frontend which Airtable field each form input maps to.

const MODULES = {
  machinery: {
    key: "machinery",
    api: "/machinery",
    title: "Machinery",
    desc: "Asset register & inspection due dates",
    icon: "gear",
    dateField: "Next Inspection Due",
    primary: "Machine Name",
    fields: {
      "Machine Name": "fldr7M5OgxANiytCd",
      "Asset Tag": "fldDiVcMGF8D02QEd",
      "Category": "fldi5rBwREeCvtDLA",
      "Location": "fldLL6szutheYXIIb",
      "Operational Status": "fldtpAFiIQafFCFm4",
      "Responsible Person (PIC)": "fldeSoOytYkZkdbl3",
      "Serial Number": "fldFX6HmTXSLMh39I",
      "Last Inspection Date": "fldjFW1qIjXLObNj2",
      "Next Inspection Due": "fldqK1Rm9dOrvLNPa",
      "License Expiry Date": "fld3TWyvcwYdQd9qI",
      "DOSH Certificate No": "fld07hsfH9j1P2ifm",
      "Country of Origin / Manufacturer": "fldPh62ACGj3qjOoO",
      "Notes": "fldZuxgw2lO4toNhV",
      "Photos": "fldBh8hXm7bQofs35",
    },
    dateKeys: ["Last Inspection Date", "Next Inspection Due", "License Expiry Date"],
    textareaKeys: ["Notes"],
    listColumns: ["Machine Name", "Location", "Responsible Person (PIC)", "Next Inspection Due"],
    complianceFieldId: "fldu3wd6ce7RLWuXn",
    attachments: [
      {
        key: "license",
        fieldId: "fldFMDANTI5Jokp9S",
        label: "License Document",
        aiExtract: true,
        extractEndpoint: "upload-and-extract-license",
        previewExtractEndpoint: "extract-license-preview",
      },
      { key: "serviceHistory", fieldId: "fldOgolpGlpva0ZQI", label: "Service History" },
      { key: "photos", fieldId: "fldBh8hXm7bQofs35", label: "Photos" },
    ],
  },

  chemicals: {
    key: "chemicals",
    api: "/chemicals",
    title: "Chemicals",
    desc: "Chemical register & inventory",
    icon: "flask",
    dateField: null, // no inherent due-date on the master record — dates live on sub-tables (Exposure Monitoring, Storage/Label Inspection)
    primary: "Chemical Name",
    fields: {
      "Chemical Name": "fldbGqmRy2suVjH6G",
      "CAS Number": "fldeQ9F4mDbUbT0Nz",
      "Supplier": "fldAil7tpo8AhdpOF",
      "Storage Location": "fldxUKmNa3TKD5OKl",
      "Hazard Classification": "fldrkm7F45ofeceuj",
      "Quantity": "fldT4nF1jJvpPBUhu",
      "PPE Requirement": "fldqdGhmv5yzDwd7F",
      "Exposure Limit": "fldEwYl2ZjPxg5HRV",
      "Notes": "fldr1YRwTz3nGmpGf",
    },
    dateKeys: [],
    textareaKeys: ["PPE Requirement", "Notes"],
    listColumns: ["Chemical Name", "Storage Location", "Hazard Classification", "Supplier"],
    complianceFieldId: null,
    attachments: [
      { key: "sds", fieldId: "fld8Ea2Jt7YFQeFjo", label: "SDS (Safety Data Sheet)" },
      { key: "photos", fieldId: "fld1HoTmCAx0gm7ng", label: "Photos" },
    ],
  },

  chra: {
    key: "chra",
    api: "/chra",
    title: "CHRA",
    desc: "Chemical Health Risk Assessments",
    icon: "flask",
    dateField: "Review Due Date",
    primary: "Reference No",
    fields: {
      "Reference No": "fldI3UQraYGfqQHnU",
      "Chemical / Substance": "fldslcI2rmy78LlcC",
      "Assessor": "fldONfUJk2I17oAZu",
      "Assessment Date": "fldlSC2EnqIW9wXmP",
      "Review Due Date": "fldHCGSIwFl4fzQmP",
      "Notes": "fldc5wxNK0teJ8xO8",
    },
    dateKeys: ["Assessment Date", "Review Due Date"],
    textareaKeys: ["Notes"],
    listColumns: ["Reference No", "Chemical / Substance", "Assessor", "Review Due Date"],
    complianceFieldId: "fld7L3o0pNfCU2dgq",
    attachments: [
      { key: "document", fieldId: "fldeq8nfKSxk0b7oT", label: "Assessment Document" },
      { key: "sds", fieldId: "fldzEIUiUvTKUteFg", label: "SDS (Safety Data Sheet)" },
    ],
  },

  hra: {
    key: "hra",
    api: "/hra",
    title: "HRA",
    desc: "Health Risk Assessments",
    icon: "heart",
    dateField: "Review Due Date",
    primary: "Reference No",
    fields: {
      "Reference No": "fldgcARbVig1QkXFa",
      "Hazard Type": "fldrouFE1fxHO403i",
      "Assessor": "fldCdTfDgEAWxfHpF",
      "Assessment Date": "fld2e7ZQ7E2xyWfvL",
      "Review Due Date": "fldUY7u8J3KfMQ5Oq",
      "Notes": "fld2PpEpvTnS6gkYp",
    },
    dateKeys: ["Assessment Date", "Review Due Date"],
    textareaKeys: ["Notes"],
    listColumns: ["Reference No", "Hazard Type", "Assessor", "Review Due Date"],
    complianceFieldId: "fld6gMuaOR11W2i8R",
    attachments: [{ key: "document", fieldId: "fldzVENFDif3DygCL", label: "Assessment Document" }],
  },

  hirarc: {
    key: "hirarc",
    api: "/hirarc",
    title: "HIRARC",
    desc: "Hazard Identification & Risk Control",
    icon: "shield",
    dateField: "Review Due Date",
    primary: "Reference No",
    fields: {
      "Reference No": "fldyykI9LmR6xBxgd",
      "Hazard Identified": "fldhNlS7BeaQew7Qf",
      "Risk Rating": "fldmbWo1jwm4P0R9d",
      "Control Measures": "fldovj7KrwTJr1j8K",
      "Assessor": "fldwXseGteTpZ9DgC",
      "Assessment Date": "fldMqkbgJOlydoaiH",
      "Review Due Date": "flduoOr4OC38k4ROr",
      "Notes": "fldEGzLjeV5OSkNfG",
    },
    dateKeys: ["Assessment Date", "Review Due Date"],
    textareaKeys: ["Hazard Identified", "Control Measures", "Notes"],
    listColumns: ["Reference No", "Risk Rating", "Assessor", "Review Due Date"],
    complianceFieldId: "fldgaFARYHnFuPoMm",
    attachments: [{ key: "document", fieldId: "fld1X3MEMqJbH4YdJ", label: "Document" }],
  },

  sop: {
    key: "sop",
    api: "/sop",
    title: "SOP",
    desc: "Standard Operating Procedures",
    icon: "doc",
    dateField: "Review Due Date",
    primary: "SOP Title",
    fields: {
      "SOP Title": "fldKk9CMVOcMotGzJ",
      "Version": "fldh2XkEdzJFFtP0n",
      "Effective Date": "fldicWjkHW77qmgyH",
      "Review Due Date": "fldGjaBX2tGplDROU",
      "Approved By": "fldFwlmRw1NHU829L",
      "Notes": "fldHMZWXrW9H0jbnC",
      "Document Type": "fldPKYLr0CPHS8jq4",
    },
    dateKeys: ["Effective Date", "Review Due Date"],
    textareaKeys: ["Notes"],
    listColumns: ["SOP Title", "Version", "Approved By", "Review Due Date"],
    complianceFieldId: "fld66TA1vtTz1vZ33",
    attachments: [{ key: "document", fieldId: "fldVSqjYdjVGkpzsl", label: "Document" }],
  },
};

// ---------------------------------------------------------------------
// Business-function navigation (redesigned Dashboard). MODULES above stays
// as the legacy per-table config, still used to render CHRA/HRA/HIRARC/SOP
// through the existing overlay list until each gets its own module
// dashboard in a later milestone.
// ---------------------------------------------------------------------
const BUSINESS_MODULES = [
  {
    key: "machinery",
    title: "Machinery",
    desc: "Assets, maintenance, certificates & inspections",
    icon: "gear",
    route: "/machinery",
    ready: true,
  },
  {
    key: "chemical",
    title: "Chemical Management",
    desc: "Chemical register, CHRA, SDS & exposure monitoring",
    icon: "flask",
    route: "/chemical",
    ready: true,
  },
  {
    key: "noise",
    title: "Noise Management",
    desc: "Noise monitoring, HRA & audiometric testing",
    icon: "heart",
    route: "/noise",
    ready: false,
    legacyKeys: ["hra"],
  },
  {
    key: "operational",
    title: "Operational Safety",
    desc: "High-risk activities, permits & safe work procedures",
    icon: "shield",
    route: "/operational-safety",
    ready: false,
    legacyKeys: ["hirarc", "sop"],
  },
];

// Field-ID maps for tables that don't have their own top-level module tile
// but are read directly by the new router-driven pages (Activity Log for
// the Dashboard/Profile activity feeds, HIRARC for the Machine Profile's
// Risk Assessment tab — reused rather than duplicated, per DATABASE.md).
const MODULES_SCHEMA = {
  activityLog: {
    api: "/admin/activity", // list endpoint lives under admin; profile aggregation returns activity inline
    fields: {
      timestamp: "fldoxBujGsbywQE9C",
      user: "fld7r1tqTmrxYNvsm",
      action: "fld2xG0Sh7FdXnkAl",
      module: "fldZtHT4TveuZlc2x",
      recordRef: "fldqZxgQYuYDj6sR8",
      details: "fldA2T6f9Cbe3g6Nr",
      ipDevice: "fldhT7zItJ7Z7RZUa",
    },
  },
  hirarc: {
    fields: {
      referenceNo: "fldyykI9LmR6xBxgd",
      hazardIdentified: "fldhNlS7BeaQew7Qf",
      riskRating: "fldmbWo1jwm4P0R9d",
      controlMeasures: "fldovj7KrwTJr1j8K",
      assessor: "fldwXseGteTpZ9DgC",
      assessmentDate: "fldMqkbgJOlydoaiH",
      reviewDueDate: "flduoOr4OC38k4ROr",
      document: "fld1X3MEMqJbH4YdJ",
      notes: "fldEGzLjeV5OSkNfG",
      machinery: "fldbHwT3bHJlzRS5I",
      complianceStatus: "fldgaFARYHnFuPoMm",
    },
  },
};

// Field-ID maps for the new Machinery sub-tables (mirrors server/lib/schema.js).
const MACHINERY_TABLES = {
  cf: {
    api: "/machinery-cf",
    title: "Certificates of Fitness",
    primary: "cfNo",
    fields: {
      cfNo: "fldYPRrvQrnsqjXc1",
      machine: "fldW0YUD7P1WNq33i",
      issuedDate: "fldztQ8M3Q2fDjvQW",
      expiryDate: "fldIYNCr9MbesRm9q",
      issuingAuthority: "fldRb0FrnetPoNaaO",
      status: "fldcGv9gfhyIxV4Vu",
      certificate: "fldibflKowaGsZAgH",
      notes: "fldjpwjNNA612WtLg",
    },
  },
  pm: {
    api: "/preventive-maintenance",
    title: "Preventive Maintenance",
    primary: "pmReference",
    fields: {
      pmReference: "fldVicxSFN1Oz8bHe",
      machine: "fldro4Jb6Sd4PUQqB",
      pmType: "fldkfVzyaqYJpL3vL",
      scheduledDate: "fld1kUDkYL7lAq5yi",
      completedDate: "flduTf5nEeOfZMVxb",
      performedBy: "fld8muHHuiWmZUxFd",
      status: "fldjrCBAtGGHKa580",
      checklistNotes: "flddpxK6EHv0YdJcf",
      attachment: "fld1Ct6NScdju81ak",
    },
  },
  cm: {
    api: "/corrective-maintenance",
    title: "Corrective Maintenance",
    primary: "cmReference",
    fields: {
      cmReference: "fldAdlnYWXslINOxA",
      machine: "fldEz0SpymLftKzSo",
      faultDescription: "fldB1I81xTxTdab95",
      dateReported: "fldSYbtyqOPFvZrZB",
      dateResolved: "fldCKIF3kZo490hVf",
      performedBy: "fldZclQEzoCjVKxRk",
      status: "fldZ9pWtU9qzY9ld2",
      cost: "fldAuonAmNsniWyKG",
      attachment: "fldaUDi4iFUaFytea",
    },
  },
  inspection: {
    api: "/machinery-inspection",
    title: "Inspection",
    primary: "inspectionReference",
    fields: {
      inspectionReference: "fldvGHvWcDGWtE5oo",
      machine: "fldtws7fmnbmGSIa4",
      inspectionDate: "fldPCRSl8MNvicYMh",
      inspector: "fldylmRbOirpV5njf",
      result: "fldzZQp1rDHwMzl3J",
      findings: "fldHz2LNranWei0cu",
      nextDue: "fldZPH2pvpRfUUM2V",
      attachment: "fld27CstJbn1xRJ7Q",
    },
  },
  calibration: {
    api: "/calibration-records",
    title: "Calibration",
    primary: "equipmentName",
    fields: {
      equipmentName: "fldba7itmRcbkjko9",
      equipmentType: "fld66q4tmGJYsJFVL",
      machine: "fldq4gystGfrChCAO",
      calibrationDate: "fldnMZVZaq5wrxog3",
      nextDue: "fld4u9dRM9VmSSgbp",
      calibratedBy: "fldsaZ0MEODOtEqnU",
      status: "fld2iJqUgdxOrSnoa",
      certificate: "fldX51br3yaO257Jn",
    },
  },
};

const ICONS = {
  gear: '<path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="1.6"/><path d="M19.4 13a7.6 7.6 0 000-2l1.9-1.5-2-3.4-2.2.9a7.7 7.7 0 00-1.7-1L15 3.5h-4l-.4 2.4a7.7 7.7 0 00-1.7 1l-2.2-.9-2 3.4L6.6 11a7.6 7.6 0 000 2l-1.9 1.5 2 3.4 2.2-.9c.5.4 1.1.8 1.7 1L11 20.5h4l.4-2.4c.6-.2 1.2-.6 1.7-1l2.2.9 2-3.4L19.4 13z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  flask: '<path d="M9 3h6M10 3v6.5L4.8 18a2 2 0 001.7 3h11a2 2 0 001.7-3L14 9.5V3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.5 14.5h9" stroke="currentColor" stroke-width="1.4"/>',
  heart: '<path d="M12 20s-7-4.4-9.3-9A5 5 0 0112 6a5 5 0 019.3 5c-2.3 4.6-9.3 9-9.3 9z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  doc: '<path d="M7 3h7l4 4v14H7V3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3v4h4M9.5 12h5M9.5 15.5h5" stroke="currentColor" stroke-width="1.4"/>',
  overview: '<path d="M4 19V5M4 19h16M8 19v-6m4 6v-9m4 9V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  admin: '<circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.6"/><path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
};
