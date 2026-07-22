const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Corrective Maintenance",
  tableId: schema.correctiveMaintenance.tableId,
  fields: schema.correctiveMaintenance.fields,
  primaryFieldKey: "cmReference",
  attachmentFields: {
    attachment: schema.correctiveMaintenance.fields.attachment,
  },
});
