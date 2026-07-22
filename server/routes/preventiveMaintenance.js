const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Preventive Maintenance",
  tableId: schema.preventiveMaintenance.tableId,
  fields: schema.preventiveMaintenance.fields,
  primaryFieldKey: "pmReference",
  attachmentFields: {
    attachment: schema.preventiveMaintenance.fields.attachment,
  },
});
