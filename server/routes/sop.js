const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "SOP",
  tableId: schema.sop.tableId,
  fields: schema.sop.fields,
  primaryFieldKey: "title",
  attachmentFields: {
    document: schema.sop.fields.document,
  },
});
