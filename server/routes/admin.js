const express = require("express");
const airtable = require("../lib/airtable");
const schema = require("../lib/schema");
const { hashPassword } = require("../lib/auth");
const { authenticate, requireAdmin } = require("../middleware/auth");
const { logActivity } = require("../lib/activity");

const router = express.Router();
router.use(authenticate, requireAdmin);

const UF = schema.users.fields;
const AF = schema.activityLog.fields;

// Every compliance module, keyed the same way the frontend (modules.config.js)
// keys them. Used by the export/import/health endpoints below so admin has
// one place to back up, bulk-overwrite, and monitor every table — not just Users.
const MODULES = {
  machinery: schema.machinery,
  chra: schema.chra,
  hra: schema.hra,
  hirarc: schema.hirarc,
  sop: schema.sop,
};

function toUser(record) {
  return {
    id: record.id,
    fullName: record.fields[UF.fullName] || "",
    loginId: record.fields[UF.loginId] || "",
    role: record.fields[UF.role] || "Staff",
    status: record.fields[UF.status] || "Active",
    forcePasswordReset: !!record.fields[UF.forcePasswordReset],
    lastLogin: record.fields[UF.lastLogin] || null,
    notes: record.fields[UF.notes] || "",
  };
}

// GET /api/admin/users — list all accounts (never returns password hashes)
router.get("/users", async (req, res) => {
  try {
    const records = await airtable.listRecords(schema.users.tableId, {
      fieldIds: Object.values(UF),
    });
    res.json({ users: records.map(toUser) });
  } catch (err) {
    console.error(err);
    await logActivity({ userRecordId: req.user?.sub, action: "Error", module: "Admin", details: `List users failed: ${err.message}`, req });
    res.status(500).json({ error: "Could not load users." });
  }
});

// POST /api/admin/users — create a new account. Generates a temp password
// and forces the user to change it on first login.
router.post("/users", async (req, res) => {
  const { fullName, loginId, role, tempPassword } = req.body || {};
  if (!fullName || !loginId || !role || !tempPassword) {
    return res.status(400).json({ error: "fullName, loginId, role and tempPassword are required." });
  }
  try {
    const passwordHash = await hashPassword(tempPassword);
    const result = await airtable.createRecords(
      schema.users.tableId,
      [
        {
          fields: {
            [UF.fullName]: fullName,
            [UF.loginId]: loginId,
            [UF.passwordHash]: passwordHash,
            [UF.role]: role,
            [UF.status]: "Active",
            [UF.forcePasswordReset]: true,
          },
        },
      ],
      true
    );
    await logActivity({ userRecordId: req.user.sub, action: "Admin Change", module: "Admin", recordRef: loginId, details: "Created account", req });
    res.status(201).json({ user: toUser(result.records[0]) });
  } catch (err) {
    console.error(err);
    await logActivity({ userRecordId: req.user?.sub, action: "Error", module: "Admin", recordRef: loginId, details: `Create user failed: ${err.message}`, req });
    res.status(400).json({ error: err.message || "Could not create user." });
  }
});

// PATCH /api/admin/users/:id — edit role/status/name, or set a new temp password
router.patch("/users/:id", async (req, res) => {
  const { fullName, role, status, notes, newTempPassword } = req.body || {};
  const fields = {};
  if (fullName !== undefined) fields[UF.fullName] = fullName;
  if (role !== undefined) fields[UF.role] = role;
  if (status !== undefined) fields[UF.status] = status;
  if (notes !== undefined) fields[UF.notes] = notes;
  if (newTempPassword) {
    fields[UF.passwordHash] = await hashPassword(newTempPassword);
    fields[UF.forcePasswordReset] = true;
  }
  try {
    const result = await airtable.updateRecords(schema.users.tableId, [{ id: req.params.id, fields }], true);
    await logActivity({
      userRecordId: req.user.sub,
      action: "Admin Change",
      module: "Admin",
      recordRef: req.params.id,
      details: newTempPassword ? "Reset password" : `Updated ${Object.keys(req.body || {}).join(", ")}`,
      req,
    });
    res.json({ user: toUser(result.records[0]) });
  } catch (err) {
    console.error(err);
    await logActivity({ userRecordId: req.user?.sub, action: "Error", module: "Admin", recordRef: req.params.id, details: `Update user failed: ${err.message}`, req });
    res.status(400).json({ error: err.message || "Could not update user." });
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  try {
    await airtable.deleteRecords(schema.users.tableId, [req.params.id]);
    await logActivity({ userRecordId: req.user.sub, action: "Admin Change", module: "Admin", recordRef: req.params.id, details: "Deleted account", req });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    await logActivity({ userRecordId: req.user?.sub, action: "Error", module: "Admin", recordRef: req.params.id, details: `Delete user failed: ${err.message}`, req });
    res.status(400).json({ error: err.message || "Could not delete user." });
  }
});

// GET /api/admin/activity — login & activity history, most recent first
router.get("/activity", async (req, res) => {
  try {
    const records = await airtable.listRecords(schema.activityLog.tableId, {
      fieldIds: Object.values(AF),
    });
    const rows = records
      .map((r) => ({
        id: r.id,
        timestamp: r.fields[AF.timestamp] || "",
        user: (r.fields[AF.user] || [])[0] || null,
        action: r.fields[AF.action] || "",
        module: r.fields[AF.module] || "",
        recordRef: r.fields[AF.recordRef] || "",
        details: r.fields[AF.details] || "",
        ipDevice: r.fields[AF.ipDevice] || "",
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ activity: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load activity log." });
  }
});

// GET /api/admin/health — quick system snapshot for the Settings tab:
// record counts per module, total users, and how many errors were logged
// in the last 24h (so problems are visible without digging through the log).
router.get("/health", async (req, res) => {
  try {
    const [userRecords, activityRecords] = await Promise.all([
      airtable.listRecords(schema.users.tableId, { fieldIds: [UF.status] }),
      airtable.listRecords(schema.activityLog.tableId, { fieldIds: [AF.timestamp, AF.action, AF.module] }),
    ]);

    const moduleCounts = {};
    for (const [key, mod] of Object.entries(MODULES)) {
      try {
        const records = await airtable.listRecords(mod.tableId, { fieldIds: [Object.values(mod.fields)[0]] });
        moduleCounts[key] = records.length;
      } catch (err) {
        moduleCounts[key] = null; // couldn't read this table — surfaced as "—" client-side
      }
    }

    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentErrors = activityRecords.filter(
      (r) => r.fields[AF.action] === "Error" && new Date(r.fields[AF.timestamp] || 0).getTime() >= dayAgo
    ).length;
    const recentLoginFailures = activityRecords.filter(
      (r) => r.fields[AF.action] === "Login Failed" && new Date(r.fields[AF.timestamp] || 0).getTime() >= dayAgo
    ).length;

    res.json({
      moduleCounts,
      totalUsers: userRecords.length,
      activeUsers: userRecords.filter((r) => r.fields[UF.status] === "Active").length,
      errorsLast24h: recentErrors,
      loginFailuresLast24h: recentLoginFailures,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load system health." });
  }
});

// GET /api/admin/export/:module — full backup of one module's records, as
// plain field-name → value JSON (not field IDs), so it's readable and safe
// to keep as a manual backup before a bulk overwrite.
router.get("/export/:module", async (req, res) => {
  const mod = MODULES[req.params.module];
  if (!mod) return res.status(404).json({ error: "Unknown module." });
  try {
    const records = await airtable.listRecords(mod.tableId, { fieldIds: Object.values(mod.fields) });
    const idToName = Object.fromEntries(Object.entries(mod.fields).map(([name, id]) => [id, name]));
    const rows = records.map((r) => {
      const row = { id: r.id };
      for (const [fieldId, val] of Object.entries(r.fields)) {
        row[idToName[fieldId] || fieldId] = val;
      }
      return row;
    });
    await logActivity({ userRecordId: req.user.sub, action: "Admin Change", module: "Admin", recordRef: req.params.module, details: `Exported ${rows.length} records`, req });
    res.json({ module: req.params.module, count: rows.length, records: rows });
  } catch (err) {
    console.error(err);
    await logActivity({ userRecordId: req.user?.sub, action: "Error", module: "Admin", recordRef: req.params.module, details: `Export failed: ${err.message}`, req });
    res.status(500).json({ error: err.message || "Export failed." });
  }
});

// POST /api/admin/import/:module — bulk create ("append") or bulk
// replace-everything ("overwrite") for one module from a JSON array of
// field-name → value rows (same shape as /export returns, minus "id").
// "overwrite" deletes every existing record in the table first — irreversible,
// so it's logged loudly and the frontend requires a typed confirmation.
router.post("/import/:module", async (req, res) => {
  const mod = MODULES[req.params.module];
  if (!mod) return res.status(404).json({ error: "Unknown module." });
  const { records, mode } = req.body || {};
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Provide a non-empty records array." });
  }
  if (!["append", "overwrite"].includes(mode)) {
    return res.status(400).json({ error: 'mode must be "append" or "overwrite".' });
  }

  const nameToId = mod.fields;
  try {
    if (mode === "overwrite") {
      const existing = await airtable.listRecords(mod.tableId, { fieldIds: [Object.values(mod.fields)[0]] });
      for (let i = 0; i < existing.length; i += 10) {
        await airtable.deleteRecords(mod.tableId, existing.slice(i, i + 10).map((r) => r.id));
      }
    }

    const toCreate = records.map((row) => {
      const fields = {};
      for (const [key, val] of Object.entries(row)) {
        const fieldId = nameToId[key] || (Object.values(nameToId).includes(key) ? key : null);
        if (fieldId && val !== "" && val !== null && val !== undefined) fields[fieldId] = val;
      }
      return { fields };
    });

    let created = [];
    for (let i = 0; i < toCreate.length; i += 10) {
      const result = await airtable.createRecords(mod.tableId, toCreate.slice(i, i + 10), true);
      created = created.concat(result.records);
    }

    await logActivity({
      userRecordId: req.user.sub,
      action: "Admin Change",
      module: "Admin",
      recordRef: req.params.module,
      details: `Bulk ${mode}: ${created.length} records${mode === "overwrite" ? " (previous records deleted)" : ""}`,
      req,
    });
    res.json({ ok: true, created: created.length });
  } catch (err) {
    console.error(err);
    await logActivity({ userRecordId: req.user?.sub, action: "Error", module: "Admin", recordRef: req.params.module, details: `Bulk ${mode} failed: ${err.message}`, req });
    res.status(400).json({ error: err.message || "Import failed." });
  }
});

module.exports = router;
