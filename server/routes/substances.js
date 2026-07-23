const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Substances",
  tableId: schema.substances.tableId,
  fields: schema.substances.fields,
  primaryFieldKey: "chemicalName",
  attachmentFields: {},
  eventPrefix: "Substance",
});
