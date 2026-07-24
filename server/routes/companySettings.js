const schema = require("../lib/schema");
const { buildModuleRouter } = require("../lib/moduleRouter");
const { getCompanyProfile } = require("../lib/companyProfile");

// Conceptually a single-row settings table (Section A of the DOSH register).
// Modeled as an ordinary CRUD table via the same generic router — the
// frontend always operates on the first record it finds, creating one if
// none exists yet, rather than the backend enforcing a row-count constraint.
const router = buildModuleRouter({
  moduleName: "Company Settings",
  tableId: schema.companySettings.tableId,
  fields: schema.companySettings.fields,
  primaryFieldKey: "companyName",
  attachmentFields: {
    logo: schema.companySettings.fields.logo,
    stamp: schema.companySettings.fields.stamp,
  },
});

// GET /reports/profile-data — the Company Profile print/export report
// (public/js/pages/companyProfile.module.js, ReportEngine). Just the shared
// getCompanyProfile() shape under `company` — same convention as every other
// report's /reports/*-data, even though there's no separate rows list here
// (Company Settings is always a single record).
//
// Must be a 2+ segment path — buildModuleRouter above already registered
// GET "/:id", which (being a single path segment) would shadow a single-
// segment GET registered after it, since Express matches in registration
// order.
router.get("/reports/profile-data", async (req, res) => {
  try {
    const company = await getCompanyProfile();
    res.json({ company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load the Company Profile data." });
  }
});

module.exports = router;
