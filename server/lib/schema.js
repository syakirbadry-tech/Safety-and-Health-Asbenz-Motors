// Table and field IDs for the "OSH-C Compliance Tracker" Airtable base.
// Centralized here so routes never hardcode magic strings.

module.exports = {
  baseId: "appqSxDrzpfO1ybFw",

  users: {
    tableId: "tblGqdKMTwRquk2Ci",
    fields: {
      fullName: "fldRlSLBeD4RApFeY",
      loginId: "fld1oik9a6D0FBPzu",
      passwordHash: "fld1ygCs9uQVQYocV",
      role: "fldCEswGlfUQiTHwH",
      status: "fldF9UxAa7XiPPJIF",
      forcePasswordReset: "fldevNeDz3VinW7Ss",
      lastLogin: "fld26IazJXrChaHY7",
      notes: "fldrxvT0oyrp5eWfT",
    },
  },

  activityLog: {
    tableId: "tbl52wp8DOeD34wFv",
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

  machinery: {
    tableId: "tblup1z4K5DuyeP1S",
    fields: {
      machineName: "fldr7M5OgxANiytCd",
      assetTag: "fldDiVcMGF8D02QEd",
      category: "fldi5rBwREeCvtDLA",
      location: "fldLL6szutheYXIIb",
      operationalStatus: "fldtpAFiIQafFCFm4",
      responsiblePerson: "fldeSoOytYkZkdbl3",
      lastInspectionDate: "fldjFW1qIjXLObNj2",
      nextInspectionDue: "fldqK1Rm9dOrvLNPa",
      doshCertNo: "fld07hsfH9j1P2ifm",
      notes: "fldZuxgw2lO4toNhV",
      chra: "fldsNa80pYCZTR3wK",
      hra: "fldo8uPxzRqo95Uwe",
      hirarc: "fld23oI2SAsakfyqJ",
      sop: "fldnaQbntjeJDfGjj",
      complianceStatus: "fldu3wd6ce7RLWuXn",
      serialNumber: "fldFX6HmTXSLMh39I",
      licenseExpiryDate: "fld3TWyvcwYdQd9qI",
      licenseDocument: "fldFMDANTI5Jokp9S",
      serviceHistory: "fldOgolpGlpva0ZQI",
      originManufacturer: "fldPh62ACGj3qjOoO",
    },
  },

  chra: {
    tableId: "tblmTvbHIzilEgizB",
    fields: {
      referenceNo: "fldI3UQraYGfqQHnU",
      chemical: "fldslcI2rmy78LlcC",
      assessor: "fldONfUJk2I17oAZu",
      assessmentDate: "fldlSC2EnqIW9wXmP",
      reviewDueDate: "fldHCGSIwFl4fzQmP",
      document: "fldeq8nfKSxk0b7oT",
      notes: "fldc5wxNK0teJ8xO8",
      machinery: "fldEVH5N7GRii4WeO",
      complianceStatus: "fld7L3o0pNfCU2dgq",
      sds: "fldzEIUiUvTKUteFg",
    },
  },

  hra: {
    tableId: "tblvq4nWGIGbv9zxP",
    fields: {
      referenceNo: "fldgcARbVig1QkXFa",
      hazardType: "fldrouFE1fxHO403i",
      assessor: "fldCdTfDgEAWxfHpF",
      assessmentDate: "fld2e7ZQ7E2xyWfvL",
      reviewDueDate: "fldUY7u8J3KfMQ5Oq",
      document: "fldzVENFDif3DygCL",
      notes: "fld2PpEpvTnS6gkYp",
      machinery: "fldQvr7EinqdBNpdP",
      complianceStatus: "fld6gMuaOR11W2i8R",
    },
  },

  hirarc: {
    tableId: "tblkDSI6EqZOkQdHb",
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

  sop: {
    tableId: "tblweaJhQNRCOI9lc",
    fields: {
      title: "fldKk9CMVOcMotGzJ",
      version: "fldh2XkEdzJFFtP0n",
      effectiveDate: "fldicWjkHW77qmgyH",
      reviewDueDate: "fldGjaBX2tGplDROU",
      approvedBy: "fldFwlmRw1NHU829L",
      document: "fldVSqjYdjVGkpzsl",
      notes: "fldHMZWXrW9H0jbnC",
      machinery: "fld2JyufVV3pRR479",
      complianceStatus: "fld66TA1vtTz1vZ33",
    },
  },
};
