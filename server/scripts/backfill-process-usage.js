// One-time, non-destructive backfill: creates one "Chemical Process Usage"
// record per existing Chemical, seeded from that chemical's own flat
// process/storageLocation/quantity/workersExposed/controlMeasures/
// ppeActuallyUsed/typeOfUse fields, marked Is Primary Usage. The flat fields
// on Chemicals are never touched — they stay the fallback for any chemical
// that (for whatever reason) still has zero linked usage records.
//
// Idempotent: skips any chemical that already has at least one linked
// Chemical Process Usage record, so running this more than once is safe.
//
// Usage:
//   node server/scripts/backfill-process-usage.js
//   node server/scripts/backfill-process-usage.js --dry-run

require("dotenv").config();
const airtable = require("../lib/airtable");
const schema = require("../lib/schema");

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const CF = schema.chemicals.fields;
  const PF = schema.chemicalProcessUsage.fields;

  const [chemicals, existingUsage] = await Promise.all([
    airtable.listRecords(schema.chemicals.tableId),
    airtable.listRecords(schema.chemicalProcessUsage.tableId, { fieldIds: [PF.chemical] }),
  ]);

  const chemicalsWithUsage = new Set();
  existingUsage.forEach((r) => {
    (r.fields[PF.chemical] || []).forEach((id) => chemicalsWithUsage.add(id));
  });

  const toCreate = chemicals
    .filter((r) => !chemicalsWithUsage.has(r.id))
    .map((r) => ({
      fields: {
        [PF.chemical]: [r.id],
        [PF.process]: r.fields[CF.process] || "",
        [PF.location]: r.fields[CF.storageLocation] || "",
        [PF.quantity]: r.fields[CF.quantity] || "",
        ...(r.fields[CF.workersExposed] != null ? { [PF.workersExposed]: r.fields[CF.workersExposed] } : {}),
        [PF.controlMeasures]: r.fields[CF.controlMeasures] || "",
        [PF.ppe]: r.fields[CF.ppeActuallyUsed] || "",
        ...(r.fields[CF.typeOfUse] ? { [PF.typeOfUse]: r.fields[CF.typeOfUse] } : {}),
        [PF.isPrimaryUsage]: true,
      },
    }));

  console.log(`${chemicals.length} chemicals total, ${chemicalsWithUsage.size} already have a usage record, ${toCreate.length} to backfill.`);
  if (dryRun) {
    console.log("--dry-run: no records created.");
    return;
  }
  if (!toCreate.length) {
    console.log("Nothing to do.");
    return;
  }

  const BATCH = 25; // Airtable's per-request create limit
  let created = 0;
  for (let i = 0; i < toCreate.length; i += BATCH) {
    const batch = toCreate.slice(i, i + BATCH);
    await airtable.createRecords(schema.chemicalProcessUsage.tableId, batch, true);
    created += batch.length;
    console.log(`Created ${created}/${toCreate.length}...`);
  }
  console.log(`Done. Created ${created} Chemical Process Usage record(s), all marked Is Primary Usage.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
