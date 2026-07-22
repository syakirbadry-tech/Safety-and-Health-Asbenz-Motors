const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Calibration Records",
  tableId: schema.calibrationRecords.tableId,
  fields: schema.calibrationRecords.fields,
  primaryFieldKey: "equipmentName",
  attachmentFields: {
    certificate: schema.calibrationRecords.fields.certificate,
  },
});
