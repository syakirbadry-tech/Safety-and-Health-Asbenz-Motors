const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Waste Management",
  tableId: schema.wasteManagement.tableId,
  fields: schema.wasteManagement.fields,
  primaryFieldKey: "disposalReference",
  attachmentFields: {
    attachment: schema.wasteManagement.fields.attachment,
  },
});
