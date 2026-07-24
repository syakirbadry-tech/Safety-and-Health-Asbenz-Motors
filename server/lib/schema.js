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
      chemicalName: "fldbGqmRy2suVjH6G", // display name "Product Name" — see Substances for the true per-ingredient Chemical Name
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
      department: "fld5bMIMKXeM4bbfI",
      process: "fldv6VK1SxE2tsprX",
      workersExposed: "fldRM4dI54znwR04p",
      controlMeasures: "fldi95R3Fz8Hn7Mjj",
      ppeActuallyUsed: "fldZJybnxiaO1ri4V",
      typeOfUse: "fldadV7JEC8sRDaan",
      internalRemarks: "flduyfC7TMj9iexV9",
      responsiblePerson: "fldx1JJdpsJ2YMiID",
      unit: "fldcfaKvLsKHYqOYk",
      internalCode: "fld6qQuy0SSDmW5Xs", // display name "Product Code"
      reviewFrequency: "fldLDJ6PHCJDgckGq",
      status: "fldpSbpbNDsz7ecTV",
      // Storage profile (v2.0) — merges into the Storage tab alongside
      // Chemical Storage Inspection's history list.
      cabinet: "fldLINsEoVfTYRGlO",
      maximumQuantity: "fldvwU3V2KBE0LU3M",
      storageMethod: "fldy9CpjZcC3aj4qv",
      temperature: "fldtB01TGuQmVIdxf",
      ventilation: "fldhnHmiGDIP7OkD0",
      segregation: "fldOwt4D9dZa1RToh",
      incompatibleChemicals: "fldUXOJcvklmFrZ9k",
      // Conditional-module flags (v2.0) — manual, assessor-set. Drive
      // whether the Exposure Monitoring/LEV/Biological Monitoring/Health
      // Surveillance tabs appear on a chemical's profile.
      exposureMonitoringRequired: "fld7Mas3ys7hROEDm",
      levRequired: "fld0wB7ebUCXrQX9S",
      biologicalMonitoringRequired: "fldN3Or0Gzc5867z5",
      healthSurveillanceRequired: "fldofE2agyQ8ZdT6l",
      // Inverse link auto-created when Chemical Process Usage's own
      // `chemical` field was added — not written to directly by any route,
      // only present so a chemical's linked usage records are visible from
      // its own Airtable record.
      processUsage: "fldQoQIwRFDKY3Ljz",
    },
  },

  // Per-process/location usage of a chemical (v2.2) — additive alongside
  // Chemicals' own flat process/quantity/workersExposed/controlMeasures/
  // ppeActuallyUsed/typeOfUse fields, which remain the source of truth for a
  // chemical with zero linked usage records here (see DOSH_REGISTER_FIELD_MAPPING.md
  // and ARCHITECTURE.md §5.2.2). A chemical used across multiple processes
  // gets one Chemical Process Usage record per process, each with its own
  // quantity/workers-exposed/controls/PPE/type-of-use.
  chemicalProcessUsage: {
    tableId: "tbl3kESP5Ta7FP7B6",
    fields: {
      process: "fldzMffNmxpq27Wsh", // primary field, display name "Process / Operation"
      chemical: "fldruQfRUGHZ0gGDP",
      location: "fldmiVRwaRRHt6HbY",
      quantity: "fld8SdSRPPsNrljhu", // display name "Quantity Used"
      workersExposed: "fldAOy5kdLeUXAFCr",
      controlMeasures: "fldotGUx3hav5A0x7", // display name "Engineering Controls"
      ppe: "fldSJ5WrHtxyUVs8g",
      typeOfUse: "fldUu94FPCDAtvxM6",
      remarks: "fldROFN119yTbqt6J",
      isPrimaryUsage: "fldwpgPFSFphavBvf",
    },
  },

  // Section 3 (Composition/Information on Ingredients) ingredients extracted
  // from a chemical's SDS. One Chemical (Product) has many Substances — see
  // DATABASE.md for the Product Name vs Chemical Name distinction.
  substances: {
    tableId: "tblKbPw4tgcOuLri7",
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
      ghsPictograms: "fldjxcnz8orvmo7gr",
    },
  },

  sdsDocuments: {
    tableId: "tblwhi2gzkp1hzgCN",
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
      ghsPictograms: "fldxiPyErIqlC2r8O",
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
      sdsFile: "fldwdrQQpzpboQZta",
      notes: "fldqoLMtuiHqYNs8x",
      extractedByAi: "fldGo4nMa2PpHMD3W",
      // Formula field: Revision Date + 5 years. Time-based expiry, distinct
      // from `status`'s Current/Superseded revision-history semantics.
      expiryDate: "fldSYtv0CM9eDYBAz",
    },
  },

  chemicalSafetyTraining: {
    tableId: "tblDsD6jf7hpUMUqx",
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
  },

  companySettings: {
    tableId: "tbllJtwpaBgF04ra1",
    fields: {
      companyName: "fldQKivIll8afyhmz",
      address: "fldpzCUQba9jVCqvc", // display name "Address Line 1" — see Company Profile
      city: "flde6aRzTMLyymGaJ",
      postcode: "fld1YyFYWz8dhcE7A",
      state: "fld2qlFAFBlctMzMc",
      telephone: "fldJOk1DNlBXjhuJQ", // display name "Phone" — see Company Profile
      email: "fldiky0dCIBRyt9Tc",
      doshRegistrationNo: "fldT6YT1L1rtjtrga",
      // Code of Sector / Class of Industry: DOSH-specific classification
      // codes (Appendix 2/3 of the Chemical Register guideline), distinct
      // from the general-purpose MSIC Code below — do not conflate them.
      codeOfSector: "fldqvcuuJTFolV0hX",
      classOfIndustry: "fldUHoCQxiw2nznMm",
      companyActivity: "fldP0PgrfeU8Tg99s",
      // Company Profile module (v2.1) — single source of truth for company
      // info, reused by every report (DOSH Register today; Noise/Machinery/
      // CAPA/Committee reports as they add their own generated reports).
      companyRegistrationNo: "fldSZNZQ7AAhh2Ma8",
      msicCode: "fldW1Hg616xPmsErv",
      addressLine2: "fldyAGfSibScKdPg4",
      country: "flduy59e09yi9KTCm",
      website: "fldVoLS91rxcZ14fu",
      logo: "fldxiMprotecnHB97",
      stamp: "fld0S3j5vilwOxygP",
      defaultPreparedByName: "fldnmJ6OBIjNtFbwp",
      defaultPreparedByPosition: "fldgxmx6bqQKcbpau",
      defaultReviewedByName: "fldV7cUn1KCjcdOkQ",
      defaultReviewedByPosition: "fldZrlIjWteoA29Te",

      // Central administration expansion — Company Profile becomes the
      // single source of truth for every setting a generated report reads
      // (see ARCHITECTURE.md §5.6/§5.7). All additive, one table, no new
      // record shape.
      industry: "fldzcHzGg0PkySGKl", // general-purpose, distinct from codeOfSector/classOfIndustry/msicCode above
      taxNumber: "fldODFQovSuvy2pLh",
      description: "fldvKY9ua9URuTcgV",
      watermark: "fldb6kpi7jiCpgnCl",
      primaryColour: "fldkgEuDEEMDFdBl1",
      secondaryColour: "fldX7rChYiaQHF3cD",
      documentPrefix: "fld9yRYty1lGmzBIr",
      defaultVersion: "fldNwrNNmVYFlq4f6",
      documentFooter: "fldO9wu0CdpFlKkiy",
      defaultPaperSize: "fldISfenI0SDPZ3SQ", // select: A4/Letter/Legal
      defaultOrientation: "fldTbuYzyg3KkVcqR", // select: Portrait/Landscape — only honored by reports without a structural column-count requirement
      defaultLanguage: "fldars8zKVaWnCBLP", // select: English/Bahasa Malaysia — stored only, not translated
      companyConfidential: "fldJLGAUAC1yNUm5Y", // select: Off/On
      approvedByName: "fldQ6To11Ajd62gP6",
      approvedByPosition: "fld7L1D3r4blwQhHy",
      preparedBySignature: "fldBSVvq20J31LIHk",
      reviewedBySignature: "fld9XC3IBy11zgxCA",
      approvedBySignature: "fld3NpPIf6bJFBaVl",
      // Export Settings — all select fields (Show/Hide, or Repeat/Don't
      // Repeat), never checkboxes: Airtable's API omits an unchecked
      // checkbox from a record's fields entirely, indistinguishable from
      // "never set" — a select's explicit choice is always returned, so
      // "unset" can cleanly default to today's shipped behavior (show
      // everything) while still letting an admin reliably turn one off.
      showLogo: "fldWLDEvSPBPVdHZA",
      showStamp: "fldqwvnPZOEHATeKL",
      showFooter: "fld3AT5CidG9Spppb",
      showPageNumbers: "fldzen5h8VZLwKCMH",
      showGeneratedDate: "fldSGIlNmHduRqYvD",
      showGeneratedTime: "fld0m4Pp4YV0zdpmq",
      showGeneratedBy: "fldkdt12EcvIRjPyP",
      repeatTableHeaders: "fldH0pQZaxg90HSyx",
      showDocumentVersion: "fldUwXMxGUwuIEtgM",
      showDocumentNumber: "fldBRDSJ5mrXpBjmF",
    },
  },

  doshRegisterGenerations: {
    tableId: "tbltDmaHsIeDJihe6",
    fields: {
      generationReference: "fldFDBFWXCqvMijmI",
      generatedDate: "fld3tXpmD2HMDL4TK",
      generatedBy: "fldWjhcA8lxrZjDQq",
      preparedByName: "fldz4mGogntj9ccuB",
      preparedByTitle: "fld4kskgsr0UwQgzw",
      reviewedByName: "fldwtryC9vrCVbkt9",
      reviewedByTitle: "fldelgPkgOV0dFU7n",
      notes: "fldLHks5wWACe76rH",
      // v2.1: which export path (Print/PDF vs Excel) produced this
      // generation record — set programmatically, never user-entered.
      exportFormat: "fldiwjEjyxuqoShs6",
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
      correctiveAction: "fldmUrQ0IqQj1fjMx",
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
      attachment: "fldXLfTa1RqXsrdIm", // multi-file: used as a Photos gallery
      labelCondition: "fldBrZ7jWytx7DDPT",
      correctiveAction: "fldFAxTebdyIjNHAm",
    },
  },

  wasteManagement: {
    tableId: "tblPVRW0rpx6aY0ot",
    fields: {
      disposalReference: "fldZoHsavHsEBjK1o",
      chemical: "fldwAfS67lDi52uDh",
      wasteType: "fldVhZ33qz5Pa4sbT", // display name "Waste Category"
      disposalDate: "fldbyZrZPk8NReZae",
      disposalMethod: "fldzou44acRxktqfU",
      contractor: "fldEi3MaVDPBUMRPr", // display name "Licensed Contractor"
      quantity: "fldNr9HjzzSaysYsP",
      manifest: "fld32wouY65NYZP22", // display name "Consignment Note"
      scheduledWasteCode: "fldhtiszeyC30vu2G",
      disposalCertificate: "fldVPL9B1NCJ2xsnW",
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

  aiExtractionLogs: {
    tableId: "tblUMGNzooVEfr5gE",
    fields: {
      logReference: "fld6Bu3RhJFk7WIzJ",
      extractionType: "fldk5DLTgjROBHQ6p",
      modelUsed: "fldVgcvwLasc4QXuD",
      promptVersion: "fldTdvKTQiu9tfhWL",
      extractionVersion: "fldn76FccNKSM9gy5",
      timestamp: "fldSVPEvlq7pOGQLc",
      durationMs: "fldNDagTQi2c3Xy4h",
      success: "fldFfX1AoXkzwaDZj",
      warnings: "fldESqkCocVYDAjZz",
      recordRef: "fld4Nas1N5Ip99yIM",
    },
  },

  // Corrective Actions/CAPA engine — presented in the UI as one register
  // (Corrective Actions/CAPA, default view Corrective+Preventive; "All
  // Actions" is the same register unfiltered). Source Module/Source
  // Reference optionally trace back to whatever finding raised it, same
  // free-text-pointer pattern as activityLog's recordRef.
  actions: {
    tableId: "tbl2W7hxGDHxx4qJB",
    fields: {
      actionReference: "fldpu4ohq1FsMS1Vd",
      title: "fldWZnfCR1xzxfVbr",
      description: "fldVejfKl7s3RlYaI",
      dateRaised: "fldjZqQDjK95ZzTg2",
      actionType: "fldXtXWOGhdOVGoTt",
      priority: "fldfJAe76qG4hJ4nF",
      status: "fldX1TFaK0jTfwuHB",
      assignedTo: "fldQsu9UCyFiIxebz",
      assignedDepartment: "fldGLR6ficXsPPZC6",
      representation: "fldmeQvJtQpdnDEi5",
      dueDate: "fldrjBZIov5mhv4OV",
      completedDate: "fldMN94RgfOb4FKJc",
      sourceModule: "fldACGmtr36AB1vjW",
      sourceReference: "fldlmIdxh9dpGayJ8",
      rootCause: "fldSaqoGyYxXGou2t",
      measures: "fldkaoN3xy57vqL9e",
      effectivenessReview: "fldpo8SRr5RZo4mLB",
      verifiedEffective: "fldwHrkDeha8ieJ39",
      evidence: "fldcMemMVPD61YhDp",
      notes: "fldyafDz1nvhe2cP4",
    },
  },

  oshCommitteeMeetings: {
    tableId: "tbls4KSlOeefpCHBZ",
    fields: {
      meetingReference: "fldickz4PRwcv9rO3",
      meetingDate: "fldZGpIXRoqoflszP",
      meetingType: "fldI3X7axiHP8jFmz",
      chairperson: "fld4osE8hthsTZuUs",
      secretary: "fldohhPXTQKe39P5A",
      attendees: "fldKKMGx2LH8Apdca",
      agenda: "fld4PXKsNoVsvyda1",
      keyDecisions: "fld7PMXsFHZa3KlZC",
      minutes: "fld23dCRfWj7hDMkL",
      nextMeetingDate: "fldTujGNnbaF7SVph",
      status: "fld4WT2X077icEU2Q",
    },
  },

  oshCommitteeMembers: {
    tableId: "tblEXCXpB8Iqbf3Vw",
    fields: {
      memberName: "fldg0krOq6zyPsWNY",
      position: "fldEhBz50mhciiTN6",
      department: "fldIh01nYz89HlFDI",
      termStart: "fldEV0IFHEqE7HWkq",
      termEnd: "fldVv5QAq8Rsrb21w",
      contact: "fld1lVjRvAtj24PSF",
      status: "fldnK0oZmW78mfM1z",
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
