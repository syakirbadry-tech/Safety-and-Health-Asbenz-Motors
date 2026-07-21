const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "HRA",
  tableId: schema.hra.tableId,
  fields: schema.hra.fields,
  primaryFieldKey: "referenceNo",
  attachmentFields: {
    document: schema.hra.fields.document,
  },
});
