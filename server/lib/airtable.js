// Thin server-side wrapper around the Airtable REST API.
// The Personal Access Token lives only here, read from an environment
// variable — it is never sent to the browser. All frontend calls go
// through our own /api routes instead of hitting Airtable directly.

const fetch = require("node-fetch");

const BASE_ID = process.env.AIRTABLE_BASE_ID;
const PAT = process.env.AIRTABLE_PAT;
const API_ROOT = "https://api.airtable.com/v0";
const CONTENT_ROOT = "https://content.airtable.com/v0";

if (!BASE_ID || !PAT) {
  console.warn(
    "[airtable] AIRTABLE_BASE_ID or AIRTABLE_PAT is not set. Set them in your .env file."
  );
}

async function request(path, options = {}) {
  const res = await fetch(`${API_ROOT}/${BASE_ID}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `Airtable request failed (${res.status})`);
    err.status = res.status;
    err.details = body;
    throw err;
  }
  return body;
}

async function listRecords(tableId, params = {}) {
  const qs = new URLSearchParams();
  // Without this, Airtable returns record.fields keyed by FIELD NAME
  // ("Login ID (Email)"), but every route in this app looks records up by
  // FIELD ID ("fld..."), same as schema.js. This flag makes the response
  // keys match what the rest of the code expects.
  qs.set("returnFieldsByFieldId", "true");
  if (params.pageSize) qs.set("pageSize", params.pageSize);
  if (params.view) qs.set("view", params.view);
  if (params.filterByFormula) qs.set("filterByFormula", params.filterByFormula);
  (params.fieldIds || []).forEach((f) => qs.append("fields[]", f));
  let offset;
  let records = [];
  do {
    if (offset) qs.set("offset", offset);
    const data = await request(`${tableId}?${qs.toString()}`);
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

function getRecord(tableId, recordId) {
  return request(`${tableId}/${recordId}?returnFieldsByFieldId=true`);
}

function createRecords(tableId, records, typecast = true) {
  return request(tableId, {
    method: "POST",
    body: JSON.stringify({ records, typecast, returnFieldsByFieldId: true }),
  });
}

function updateRecords(tableId, records, typecast = true) {
  return request(tableId, {
    method: "PATCH",
    body: JSON.stringify({ records, typecast, returnFieldsByFieldId: true }),
  });
}

function deleteRecords(tableId, recordIds) {
  const qs = recordIds.map((id) => `records[]=${id}`).join("&");
  return request(`${tableId}?${qs}`, { method: "DELETE" });
}

// Uploads a file straight into an attachment field on an existing record,
// using Airtable's direct-upload endpoint (base64 body, no public URL needed).
async function uploadAttachment(tableId, recordId, fieldId, { filename, contentType, base64 }) {
  const res = await fetch(
    `${CONTENT_ROOT}/${BASE_ID}/${recordId}/${fieldId}/uploadAttachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contentType, filename, file: base64 }),
    }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `Airtable upload failed (${res.status})`);
    err.status = res.status;
    err.details = body;
    throw err;
  }
  return body;
}

module.exports = {
  listRecords,
  getRecord,
  createRecords,
  updateRecords,
  deleteRecords,
  uploadAttachment,
};
