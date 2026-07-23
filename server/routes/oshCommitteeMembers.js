const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");

// Flat roster, no profile route — the frontend's dedicated
// /osh-committee/members page is a simple register + the shared
// openRecordForm modal, not a module-framework module (see
// public/js/pages/oshCommitteeMembers.js).
module.exports = buildModuleRouter({
  moduleName: "OSH Committee Members",
  tableId: schema.oshCommitteeMembers.tableId,
  fields: schema.oshCommitteeMembers.fields,
  primaryFieldKey: "memberName",
  attachmentFields: {},
  eventPrefix: "OSHCommitteeMember",
});
