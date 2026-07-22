const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Machinery CF",
  tableId: schema.machineryCF.tableId,
  fields: schema.machineryCF.fields,
  primaryFieldKey: "cfNo",
  attachmentFields: {
    certificate: schema.machineryCF.fields.certificate,
  },
});
