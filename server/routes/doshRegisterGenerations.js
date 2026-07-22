const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

// Audit log — one record per "Generate DOSH Chemical Register" action.
module.exports = buildModuleRouter({
  moduleName: "DOSH Register Generations",
  tableId: schema.doshRegisterGenerations.tableId,
  fields: schema.doshRegisterGenerations.fields,
  primaryFieldKey: "generationReference",
  attachmentFields: {},
});
