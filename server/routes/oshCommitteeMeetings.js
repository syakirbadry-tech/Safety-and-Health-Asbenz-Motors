const schema = require("../lib/schema");
const airtable = require("../lib/airtable");
const { buildModuleRouter } = require("../lib/moduleRouter");
const { buildProfileRoute } = require("../lib/profileAggregation");
const { getCompanyProfile } = require("../lib/companyProfile");

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

// GET /reports/register-data — company branding + flat meeting rows + flat
// member rows in one call, for the OSH Committee Register print/export
// report (public/js/pages/oshCommittee.module.js, ReportEngine). Neither
// table had a /reports/*-data endpoint before this — same aggregation-
// endpoint convention as chemicals.js's own.
//
// Must be a 2+ segment path — buildModuleRouter above already registered
// GET "/:id", which (being a single path segment) would shadow a single-
// segment GET registered after it, since Express matches in registration
// order.
router.get("/reports/register-data", async (req, res) => {
  try {
    const MF = schema.oshCommitteeMeetings.fields;
    const MBF = schema.oshCommitteeMembers.fields;

    const [company, meetings, members] = await Promise.all([
      getCompanyProfile(),
      airtable.listRecords(schema.oshCommitteeMeetings.tableId),
      airtable.listRecords(schema.oshCommitteeMembers.tableId),
    ]);

    const meetingRows = meetings.map((r) => ({
      id: r.id,
      meetingReference: r.fields[MF.meetingReference] || "",
      meetingDate: r.fields[MF.meetingDate] || "",
      meetingType: r.fields[MF.meetingType] || "",
      chairperson: r.fields[MF.chairperson] || "",
      secretary: r.fields[MF.secretary] || "",
      attendees: r.fields[MF.attendees] || "",
      keyDecisions: r.fields[MF.keyDecisions] || "",
      nextMeetingDate: r.fields[MF.nextMeetingDate] || "",
      status: r.fields[MF.status] || "",
    }));

    const memberRows = members.map((r) => ({
      id: r.id,
      memberName: r.fields[MBF.memberName] || "",
      position: r.fields[MBF.position] || "",
      department: r.fields[MBF.department] || "",
      termStart: r.fields[MBF.termStart] || "",
      termEnd: r.fields[MBF.termEnd] || "",
      contact: r.fields[MBF.contact] || "",
      status: r.fields[MBF.status] || "",
    }));

    res.json({ company, meetingRows, memberRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load the OSH Committee Register data." });
  }
});

module.exports = router;
