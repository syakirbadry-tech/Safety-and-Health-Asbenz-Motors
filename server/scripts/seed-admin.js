// One-time helper: creates (or resets) your first Admin account so you can
// log into the portal for the first time.
//
// Usage:
//   node server/scripts/seed-admin.js "Muhammad Syakir Badri" syakirbadry@gmail.com YourTempPass123
//
// Run this once after setting AIRTABLE_PAT / AIRTABLE_BASE_ID / JWT_SECRET
// in your .env file (or in your host's environment variables), then log in
// and change your password immediately — you'll be forced to on first login.

require("dotenv").config();
const airtable = require("../lib/airtable");
const schema = require("../lib/schema");
const { hashPassword } = require("../lib/auth");

async function main() {
  const [fullName, loginId, tempPassword] = process.argv.slice(2);
  if (!fullName || !loginId || !tempPassword) {
    console.error('Usage: node server/scripts/seed-admin.js "Full Name" email@example.com TempPassword123');
    process.exit(1);
  }
  if (tempPassword.length < 8) {
    console.error("Temp password must be at least 8 characters.");
    process.exit(1);
  }

  const F = schema.users.fields;
  const existing = await airtable.listRecords(schema.users.tableId, { fieldIds: [F.loginId] });
  const match = existing.find((r) => (r.fields[F.loginId] || "").toLowerCase() === loginId.toLowerCase());
  const passwordHash = await hashPassword(tempPassword);

  if (match) {
    await airtable.updateRecords(schema.users.tableId, [
      {
        id: match.id,
        fields: {
          [F.fullName]: fullName,
          [F.passwordHash]: passwordHash,
          [F.role]: "Admin",
          [F.status]: "Active",
          [F.forcePasswordReset]: true,
        },
      },
    ]);
    console.log(`Updated existing account "${loginId}" to Admin with a new temp password.`);
  } else {
    await airtable.createRecords(
      schema.users.tableId,
      [
        {
          fields: {
            [F.fullName]: fullName,
            [F.loginId]: loginId,
            [F.passwordHash]: passwordHash,
            [F.role]: "Admin",
            [F.status]: "Active",
            [F.forcePasswordReset]: true,
          },
        },
      ],
      true
    );
    console.log(`Created Admin account "${loginId}".`);
  }
  console.log("You'll be asked to set a new password the first time you log in.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
