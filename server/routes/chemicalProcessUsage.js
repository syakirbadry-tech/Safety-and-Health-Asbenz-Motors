const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Chemical Process Usage",
  tableId: schema.chemicalProcessUsage.tableId,
  fields: schema.chemicalProcessUsage.fields,
  primaryFieldKey: "process",
  attachmentFields: {},
  eventPrefix: "ChemicalProcessUsage",
});
