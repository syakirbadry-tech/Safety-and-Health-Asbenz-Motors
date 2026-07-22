const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Chemical Label Inspection",
  tableId: schema.chemicalLabelInspection.tableId,
  fields: schema.chemicalLabelInspection.fields,
  primaryFieldKey: "inspectionReference",
  attachmentFields: {
    attachment: schema.chemicalLabelInspection.fields.attachment,
  },
});
