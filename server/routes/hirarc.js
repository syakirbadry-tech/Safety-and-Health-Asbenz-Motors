const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "HIRARC",
  tableId: schema.hirarc.tableId,
  fields: schema.hirarc.fields,
  primaryFieldKey: "referenceNo",
  attachmentFields: {
    document: schema.hirarc.fields.document,
  },
});
