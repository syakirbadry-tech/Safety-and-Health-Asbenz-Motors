const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

module.exports = buildModuleRouter({
  moduleName: "Exposure Monitoring",
  tableId: schema.exposureMonitoring.tableId,
  fields: schema.exposureMonitoring.fields,
  primaryFieldKey: "monitoringReference",
  attachmentFields: {
    attachment: schema.exposureMonitoring.fields.attachment,
  },
  eventPrefix: "ExposureMonitoring",
});
