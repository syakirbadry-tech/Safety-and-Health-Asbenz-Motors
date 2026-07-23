const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Chemical Storage Inspection",
  tableId: schema.chemicalStorageInspection.tableId,
  fields: schema.chemicalStorageInspection.fields,
  primaryFieldKey: "inspectionReference",
  attachmentFields: {
    attachment: schema.chemicalStorageInspection.fields.attachment,
  },
  eventPrefix: "StorageInspection",
});
