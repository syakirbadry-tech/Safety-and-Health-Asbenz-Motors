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
      photos: "fldBh8hXm7bQofs35",
    },
  },

  machineryCF: {
    tableId: "tblYBltyeTMjoe8w8",
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

  preventiveMaintenance: {
    tableId: "tbl0hB4JQstFeqZdT",
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

  correctiveMaintenance: {
    tableId: "tbl26FlOwYtjhK4z3",
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

  machineryInspection: {
    tableId: "tbl2YSGrUlrQ34Kk3",
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

  calibrationRecords: {
    tableId: "tblddwNw1IGk3xcDj",
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
      chemicalLink: "fld87YdlzELuDZ1is",
    },
  },

  chemicals: {
    tableId: "tblCirtjLUiBij9Rz",
    fields: {
      chemicalName: "fldbGqmRy2suVjH6G",
      casNumber: "fldeQ9F4mDbUbT0Nz",
      supplier: "fldAil7tpo8AhdpOF",
      storageLocation: "fldxUKmNa3TKD5OKl",
      hazardClassification: "fldrkm7F45ofeceuj",
      quantity: "fldT4nF1jJvpPBUhu",
      ppeRequirement: "fldqdGhmv5yzDwd7F",
      exposureLimit: "fldEwYl2ZjPxg5HRV",
      sds: "fld8Ea2Jt7YFQeFjo",
      photos: "fld1HoTmCAx0gm7ng",
      notes: "fldr1YRwTz3nGmpGf",
    },
  },

  exposureMonitoring: {
    tableId: "tblJ8zOIiD5HXw425",
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
  },

  chemicalStorageInspection: {
    tableId: "tbl2g1YTo7jg53XLQ",
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
  },

  chemicalLabelInspection: {
    tableId: "tbl8np7LZwuntwTyW",
    fields: {
      inspectionReference: "fldJkaUs6Ou81kGLK",
      chemical: "fldl571ud4fjSNVTx",
      inspectionDate: "fldlQrxd3T0zyH5Jg",
      inspector: "fld6tJcHhEkIEKmi0",
      compliant: "fldnlw583dIy1fUP4",
      findings: "fldPfX76lW9DvF2C3",
      attachment: "fldXLfTa1RqXsrdIm",
    },
  },

  wasteManagement: {
    tableId: "tblPVRW0rpx6aY0ot",
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
      documentType: "fldPKYLr0CPHS8jq4",
    },
  },
};
