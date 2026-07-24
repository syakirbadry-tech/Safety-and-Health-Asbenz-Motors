const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

// Conceptually a single-row settings table (Section A of the DOSH register).
// Modeled as an ordinary CRUD table via the same generic router — the
// frontend always operates on the first record it finds, creating one if
// none exists yet, rather than the backend enforcing a row-count constraint.
module.exports = buildModuleRouter({
  moduleName: "Company Settings",
  tableId: schema.companySettings.tableId,
  fields: schema.companySettings.fields,
  primaryFieldKey: "companyName",
  attachmentFields: {
    logo: schema.companySettings.fields.logo,
    stamp: schema.companySettings.fields.stamp,
  },
});
