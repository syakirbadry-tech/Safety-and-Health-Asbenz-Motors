const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");
const { buildProfileRoute } = require("../lib/profileAggregation");

const router = buildModuleRouter({
  moduleName: "OSH Committee Meetings",
  tableId: schema.oshCommitteeMeetings.tableId,
  fields: schema.oshCommitteeMeetings.fields,
  primaryFieldKey: "meetingReference",
  attachmentFields: {
    minutes: schema.oshCommitteeMeetings.fields.minutes,
  },
  eventPrefix: "OSHCommitteeMeeting",
});

// No sub-tables yet (v1) — same shape as every other profile route so the
// module framework's Profile page works unchanged.
router.get(
  "/:id/profile",
  buildProfileRoute({
    masterTableId: schema.oshCommitteeMeetings.tableId,
    masterNameFieldId: schema.oshCommitteeMeetings.fields.meetingReference,
    moduleName: "OSH Committee Meetings",
    subTables: [],
  })
);

module.exports = router;
