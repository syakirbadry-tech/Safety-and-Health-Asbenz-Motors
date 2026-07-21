const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "CHRA",
  tableId: schema.chra.tableId,
  fields: schema.chra.fields,
  primaryFieldKey: "referenceNo",
  attachmentFields: {
    document: schema.chra.fields.document,
    sds: schema.chra.fields.sds,
  },
});
