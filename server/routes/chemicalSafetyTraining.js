const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Chemical Safety Training",
  tableId: schema.chemicalSafetyTraining.tableId,
  fields: schema.chemicalSafetyTraining.fields,
  primaryFieldKey: "trainingReference",
  attachmentFields: {
    attachment: schema.chemicalSafetyTraining.fields.attachment,
  },
  eventPrefix: "Training",
});
