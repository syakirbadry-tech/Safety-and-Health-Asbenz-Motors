const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");
const { buildProfileRoute } = require("../lib/profileAggregation");
const { logActivity } = require("../lib/activity");

const router = buildModuleRouter({
  moduleName: "Chemicals",
  tableId: schema.chemicals.tableId,
  fields: schema.chemicals.fields,
  primaryFieldKey: "chemicalName",
  attachmentFields: {
    sds: schema.chemicals.fields.sds,
    photos: schema.chemicals.fields.photos,
  },
});

// GET /:id/profile — mirrors Machinery's aggregation endpoint (built from the
// same generic framework), keyed by the sub-table names the frontend's
// chemical.module.js config expects: exposureMonitoring, storageInspection,
// labelInspection, wasteManagement, chra (CHRA reused as the risk-assessment
// tab, same pattern as HIRARC for Machinery).
router.get(
  "/:id/profile",
  buildProfileRoute({
    masterTableId: schema.chemicals.tableId,
    masterNameFieldId: schema.chemicals.fields.chemicalName,
    moduleName: "Chemicals",
    logActivity,
    subTables: [
      { key: "exposureMonitoring", tableId: schema.exposureMonitoring.tableId, linkFieldId: schema.exposureMonitoring.fields.chemical },
      { key: "storageInspection", tableId: schema.chemicalStorageInspection.tableId, linkFieldId: schema.chemicalStorageInspection.fields.chemical },
      { key: "labelInspection", tableId: schema.chemicalLabelInspection.tableId, linkFieldId: schema.chemicalLabelInspection.fields.chemical },
      { key: "wasteManagement", tableId: schema.wasteManagement.tableId, linkFieldId: schema.wasteManagement.fields.chemical },
      { key: "chra", tableId: schema.chra.tableId, linkFieldId: schema.chra.fields.chemicalLink },
    ],
  })
);

module.exports = router;
