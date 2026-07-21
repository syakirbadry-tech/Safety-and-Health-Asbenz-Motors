const express = require("express");
const airtable = require("../lib/airtable");
const schema = require("../lib/schema");
const { hashPassword, verifyPassword, signToken } = require("../lib/auth");
const { authenticate } = require("../middleware/auth");
const { logActivity } = require("../lib/activity");

const router = express.Router();
const F = schema.users.fields;

function toUser(record) {
  return {
    id: record.id,
    fullName: record.fields[F.fullName] || "",
    loginId: record.fields[F.loginId] || "",
    role: record.fields[F.role] || "Staff",
    status: record.fields[F.status] || "Active",
    forcePasswordReset: !!record.fields[F.forcePasswordReset],
    passwordHash: record.fields[F.passwordHash] || "",
  };
}

async function findUserByEmail(email) {
  const records = await airtable.listRecords(schema.users.tableId, {
    fieldIds: Object.values(F),
  });
  const match = records.find(
    (r) => (r.fields[F.loginId] || "").toLowerCase() === String(email).toLowerCase()
  );
  return match ? toUser(match) : null;
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Login ID and password are required." });
  }

  let user;
  try {
    user = await findUserByEmail(email);
  } catch (err) {
    console.error(err);
    await logActivity({ action: "Error", module: "Auth", recordRef: email, details: `Login lookup failed: ${err.message}`, req });
    return res.status(500).json({ error: "Could not reach the database. Try again shortly." });
  }

  if (!user || user.status !== "Active") {
    await logActivity({ action: "Login Failed", module: "Auth", recordRef: email, details: "No active account", req });
    return res.status(401).json({ error: "Invalid login ID or password." });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await logActivity({ userRecordId: user.id, action: "Login Failed", module: "Auth", recordRef: email, req });
    return res.status(401).json({ error: "Invalid login ID or password." });
  }

  const token = signToken(user);

  try {
    await airtable.updateRecords(schema.users.tableId, [
      { id: user.id, fields: { [F.lastLogin]: new Date().toISOString() } },
    ]);
  } catch (err) {
    console.error(err);
    await logActivity({ userRecordId: user.id, action: "Error", module: "Auth", recordRef: email, details: `Could not record last-login: ${err.message}`, req });
    // Non-fatal — still let the user in.
  }
  await logActivity({ userRecordId: user.id, action: "Login Success", module: "Auth", recordRef: email, req });

  res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      loginId: user.loginId,
      role: user.role,
      forcePasswordReset: user.forcePasswordReset,
    },
  });
});

// POST /api/auth/logout — mainly for the activity trail; JWTs are stateless
// so "logout" is really just the client discarding its token.
router.post("/logout", authenticate, async (req, res) => {
  await logActivity({ userRecordId: req.user.sub, action: "Logout", module: "Auth", req });
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/change-password — any signed-in user changes their own password
router.post("/change-password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }
  let user;
  try {
    const record = await airtable.getRecord(schema.users.tableId, req.user.sub);
    user = toUser(record);
  } catch (err) {
    console.error(err);
    await logActivity({ userRecordId: req.user.sub, action: "Error", module: "Auth", details: `Change-password lookup failed: ${err.message}`, req });
    return res.status(500).json({ error: "Could not reach the database. Try again shortly." });
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  // Use 400, not 401 — a 401 here would trip the frontend's global
  // "session expired, redirect to login" handler on a simple typo.
  if (!ok) return res.status(400).json({ error: "Current password is incorrect." });

  try {
    const newHash = await hashPassword(newPassword);
    await airtable.updateRecords(schema.users.tableId, [
      { id: user.id, fields: { [F.passwordHash]: newHash, [F.forcePasswordReset]: false } },
    ]);
    await logActivity({ userRecordId: user.id, action: "Password Reset", module: "Auth", details: "Self-service change", req });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    await logActivity({ userRecordId: user.id, action: "Error", module: "Auth", details: `Change-password save failed: ${err.message}`, req });
    res.status(500).json({ error: "Could not update password. Try again shortly." });
  }
});

module.exports = router;
