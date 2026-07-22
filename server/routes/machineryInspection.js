const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Machinery Inspection",
  tableId: schema.machineryInspection.tableId,
  fields: schema.machineryInspection.fields,
  primaryFieldKey: "inspectionReference",
  attachmentFields: {
    attachment: schema.machineryInspection.fields.attachment,
  },
});
