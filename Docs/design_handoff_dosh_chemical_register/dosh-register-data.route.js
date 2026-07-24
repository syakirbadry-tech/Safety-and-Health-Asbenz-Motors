// Replace the existing `router.get("/reports/dosh-register-data", ...)` handler
// in server/routes/chemicals.js with this version. Adds Physical Form (from the
// chemical's current/most-recent SDS) and Active Ingredients (joined from
// Substances) to each row, so Section B can show every guideline column.
router.get("/reports/dosh-register-data", async (req, res) => {
  try {
    const CF = schema.chemicals.fields;
    const SF = schema.sdsDocuments.fields;
    const LF = schema.chemicalLabelInspection.fields;
    const CSF = schema.companySettings.fields;
    const SUB = schema.substances.fields;

    const [companyRecords, chemicals, sdsDocs, labelInspections, substances] = await Promise.all([
      airtable.listRecords(schema.companySettings.tableId),
      airtable.listRecords(schema.chemicals.tableId),
      airtable.listRecords(schema.sdsDocuments.tableId),
      airtable.listRecords(schema.chemicalLabelInspection.tableId),
      airtable.listRecords(schema.substances.tableId),
    ]);

    const company = companyRecords[0] || null;

    // Most-recent SDS per chemical (any status) — used for Physical Form.
    // Separate from "current SDS" (status === "Current") used for the CSDS flag.
    const sdsByChemical = {};
    sdsDocs.forEach((r) => {
      (r.fields[SF.chemical] || []).forEach((id) => {
        if (!sdsByChemical[id]) sdsByChemical[id] = [];
        sdsByChemical[id].push(r);
      });
    });
    const currentSdsChemicalIds = new Set();
    sdsDocs.forEach((r) => {
      if (r.fields[SF.status] === "Current") {
        (r.fields[SF.chemical] || []).forEach((id) => currentSdsChemicalIds.add(id));
      }
    });
    function latestSdsFor(chemicalId) {
      const list = sdsByChemical[chemicalId] || [];
      if (!list.length) return null;
      return list.slice().sort((a, b) => new Date(b.fields[SF.revisionDate] || 0) - new Date(a.fields[SF.revisionDate] || 0))[0];
    }

    // Substances joined per chemical — Name of Chemical + Active Ingredients.
    const substancesByChemical = {};
    substances.forEach((r) => {
      (r.fields[SUB.chemical] || []).forEach((id) => {
        if (!substancesByChemical[id]) substancesByChemical[id] = [];
        substancesByChemical[id].push(r);
      });
    });

    const latestLabelByChemical = {};
    labelInspections
      .slice()
      .sort((a, b) => new Date(b.fields[LF.inspectionDate] || 0) - new Date(a.fields[LF.inspectionDate] || 0))
      .forEach((r) => {
        (r.fields[LF.chemical] || []).forEach((id) => {
          if (!(id in latestLabelByChemical)) latestLabelByChemical[id] = r.fields[LF.compliant];
        });
      });

    const rows = chemicals.map((r) => {
      const subs = substancesByChemical[r.id] || [];
      const latestSds = latestSdsFor(r.id);
      return {
        id: r.id,
        productName: r.fields[CF.chemicalName] || "", // schema comment: chemicalName field IS "Product Name"
        chemicalName: subs.map((s) => s.fields[SUB.chemicalName]).filter(Boolean).join(", ") || "",
        casNumber: r.fields[CF.casNumber] || "",
        physicalForm: latestSds?.fields[SF.physicalForm] || "",
        activeIngredients: subs.map((s) => s.fields[SUB.chemicalName]).filter(Boolean).join(", ") || "",
        storageLocation: r.fields[CF.storageLocation] || "",
        department: r.fields[CF.department] || "",
        process: r.fields[CF.process] || "",
        hazardClassification: r.fields[CF.hazardClassification] || "",
        quantity: r.fields[CF.quantity] || "",
        workersExposed: r.fields[CF.workersExposed] ?? "",
        controlMeasures: r.fields[CF.controlMeasures] || "",
        ppeActuallyUsed: r.fields[CF.ppeActuallyUsed] || "",
        typeOfUse: r.fields[CF.typeOfUse] || "",
        supplier: r.fields[CF.supplier] || "",
        csds: currentSdsChemicalIds.has(r.id) ? "Y" : "N",
        label: latestLabelByChemical[r.id] === "Yes" ? "Y" : latestLabelByChemical[r.id] === "No" ? "N" : "—",
        // No schema field yet for coded Type#/Class or CPL-1977 compliance —
        // see patches/README.md. Rendered as "—" until those fields exist.
        typeCode: "—",
        hazardClass: "—",
        compliesCpl: "—",
      };
    });

    res.json({
      company: company
        ? {
            id: company.id,
            companyName: company.fields[CSF.companyName] || "",
            address: company.fields[CSF.address] || "",
            city: company.fields[CSF.city] || "",
            postcode: company.fields[CSF.postcode] || "",
            state: company.fields[CSF.state] || "",
            telephone: company.fields[CSF.telephone] || "",
            email: company.fields[CSF.email] || "",
            doshRegistrationNo: company.fields[CSF.doshRegistrationNo] || "",
            codeOfSector: company.fields[CSF.codeOfSector] || "",
            classOfIndustry: company.fields[CSF.classOfIndustry] || "",
            companyActivity: company.fields[CSF.companyActivity] || [],
          }
        : null,
      rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load DOSH register data." });
  }
});
