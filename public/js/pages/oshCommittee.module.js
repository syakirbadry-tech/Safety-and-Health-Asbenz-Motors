// OSH Committee Management — meeting schedule & minutes, built on the
// module framework (master = OSH Committee Meetings). Committee Members is
// a separate roster (not owned by any one meeting — a many-to-many
// relationship the master/sub-table framework doesn't fit), given its own
// small dedicated page (oshCommitteeMembers.js) and linked from here via
// relatedLinks rather than forced into a sub-table shape.

const OSH_COMMITTEE_MODULE = defineBusinessModule({
  key: "oshCommittee",
  basePath: "/osh-committee",
  modulesKey: "oshCommitteeMeetings",
  title: "OSH Committee",
  dashboardTitle: "OSH Committee Dashboard",
  dashboardDesc: "Committee meeting schedule, agenda and minutes for Asbenz Motors.",
  registerLabel: "Meeting Register",
  registerDesc: "Every OSH Committee meeting — scheduled, completed or cancelled.",
  quickAddLabel: "Schedule Meeting",
  parentLabel: "Meeting",
  nameField: "Meeting Reference",
  statusDateField: "Next Meeting Date",
  masterCountLabel: "Total Meetings",

  registerColumns: [
    { key: "ref", label: "Meeting Reference", field: "Meeting Reference", strong: true },
    { key: "date", label: "Meeting Date", field: "Meeting Date", isDate: true },
    { key: "type", label: "Meeting Type", field: "Meeting Type" },
    { key: "status", label: "Status", field: "Status" },
  ],

  generalInfoFields: [
    "Meeting Reference", "Meeting Date", "Meeting Type", "Status", "Chairperson", "Secretary",
    "Attendees", "Next Meeting Date", "Agenda", "Key Decisions / Notes",
  ],
  headerSubtitleFields: ["Meeting Type", "Status"],

  // No sub-tables yet (v1) — a meeting's own fields (agenda, decisions,
  // minutes) are enough; linking specific Actions raised in a meeting back
  // via Actions' own Source Module/Source Reference fields needs no
  // dedicated sub-table wiring.
  subTables: {},
  dashboardSubTabOrder: [],
  profileSubTabs: [],

  documents: {
    label: "Documents",
    fields: [{ label: "Minutes", key: "Minutes" }],
  },
  attachmentsNote: 'To upload signed minutes, use "Edit / Manage Files" above.',

  relatedLinks: [{ label: "Committee Members", path: "/osh-committee/members" }],
});
