// Reads an uploaded license/certificate document with Google Gemini (free
// tier — see https://aistudio.google.com/apikey) and pulls out structured
// fields. Returns SUGGESTIONS only — nothing here writes to Airtable. The
// route that calls this hands the result back to the frontend, which
// pre-fills the edit form for a human to review before saving (see
// public/js/app.js: applyAiSuggestion).

const fetch = require("node-fetch");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
console.log(`Using Gemini model: ${MODEL}`);

console.log({
  model: MODEL,
  keyPrefix: GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 8) : "NO_KEY",
});

const EXTRACTION_PROMPT = `You are reading a scanned machinery license/certificate document for a workshop safety compliance system (Asbenz Motors).

Extract the following fields if they're visible on the document:
- serialNumber: the machine's serial/identification number
- category: type/category of machine, e.g. "Hydraulic Lift", "Air Compressor", "Welding Machine"
- originManufacturer: country of origin and/or manufacturer name, e.g. "Germany - Bosch"
- licenseExpiryDate: ISO format YYYY-MM-DD if a date is present
- doshCertificateNo: DOSH / regulatory certificate or license number if present

If a field isn't visible or you're not confident about it, use null for that field rather than guessing — never invent a value.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    serialNumber: { type: "STRING", nullable: true },
    category: { type: "STRING", nullable: true },
    originManufacturer: { type: "STRING", nullable: true },
    licenseExpiryDate: { type: "STRING", nullable: true },
    doshCertificateNo: { type: "STRING", nullable: true },
  },
};

async function extractLicenseData({ base64, mimeType }) {
  if (!GEMINI_API_KEY) {
    const err = new Error(
      "AI extraction isn't set up yet — add GEMINI_API_KEY to your .env file to enable it."
    );
    err.status = 500;
    throw err;
  }

  const isPdf = mimeType === "application/pdf";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: isPdf ? "application/pdf" : mimeType || "image/jpeg",
                data: base64,
              },
            },
            { text: EXTRACTION_PROMPT },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `AI extraction request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const err = new Error("The AI didn't return any extracted data — the document may be unreadable.");
    err.status = 502;
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error("Could not parse the AI's response as JSON.");
    err.status = 502;
    err.raw = text;
    throw err;
  }
}

// Reads an uploaded Safety Data Sheet (SDS) with Google Gemini and pulls out
// the fields the Chemical Management "+ Add Chemical" wizard needs. Same
// contract as extractLicenseData: SUGGESTIONS only, null for anything not
// confidently visible — never invented. The route hands the result back to
// the frontend, which pre-fills the review step of the wizard for a human
// to check before saving (see public/js/pages/chemical.module.js).
const SDS_EXTRACTION_PROMPT = `You are reading a Safety Data Sheet (SDS) for an industrial chemical, for a workshop safety compliance system in Malaysia (Asbenz Motors). Extract the following fields if they're visible on the document:

- productName: the product/trade name as stated on the SDS
- chemicalName: the chemical name per internationally recognised nomenclature
- manufacturer: the manufacturer's name
- supplier: the supplier's name (may differ from manufacturer)
- casNumber: the CAS Registry Number
- ecNumber: the EC (EINECS) number, if present
- revisionDate: ISO format YYYY-MM-DD, the SDS revision/issue date
- sdsVersion: the SDS version or revision number
- hazardClassification: the GHS hazard classification(s), e.g. "Flammable Liquid Category 2; Skin Irritation Category 2"
- signalWord: exactly "Danger", "Warning", or "None"
- ghsPictograms: an array of GHS pictogram categories present, using only these exact values: "Explosive", "Flammable", "Oxidizing", "Compressed Gas", "Corrosive", "Toxic", "Harmful/Irritant", "Health Hazard", "Environmental Hazard"
- hStatements: the Hazard (H) statements, one per line
- pStatements: the Precautionary (P) statements, one per line
- physicalForm: e.g. "Liquid", "Solid", "Gas", "Powder"
- firstAid: a summary of first-aid measures
- fireFighting: a summary of fire-fighting measures
- ppeRecommended: recommended personal protective equipment
- storageRequirements: storage requirements/precautions
- disposalRequirements: disposal considerations
- exposureLimits: occupational exposure limits (e.g. PEL/TLV values), if stated
- unNumber: the UN transport number, if present
- transportInformation: a summary of transport classification/requirements

If a field isn't visible or you're not confident about it, use null for that field (or an empty array for ghsPictograms) rather than guessing — never invent a value.`;

const SDS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    productName: { type: "STRING", nullable: true },
    chemicalName: { type: "STRING", nullable: true },
    manufacturer: { type: "STRING", nullable: true },
    supplier: { type: "STRING", nullable: true },
    casNumber: { type: "STRING", nullable: true },
    ecNumber: { type: "STRING", nullable: true },
    revisionDate: { type: "STRING", nullable: true },
    sdsVersion: { type: "STRING", nullable: true },
    hazardClassification: { type: "STRING", nullable: true },
    signalWord: { type: "STRING", nullable: true },
    ghsPictograms: { type: "ARRAY", items: { type: "STRING" } },
    hStatements: { type: "STRING", nullable: true },
    pStatements: { type: "STRING", nullable: true },
    physicalForm: { type: "STRING", nullable: true },
    firstAid: { type: "STRING", nullable: true },
    fireFighting: { type: "STRING", nullable: true },
    ppeRecommended: { type: "STRING", nullable: true },
    storageRequirements: { type: "STRING", nullable: true },
    disposalRequirements: { type: "STRING", nullable: true },
    exposureLimits: { type: "STRING", nullable: true },
    unNumber: { type: "STRING", nullable: true },
    transportInformation: { type: "STRING", nullable: true },
  },
};

async function extractSDSData({ base64, mimeType }) {
  if (!GEMINI_API_KEY) {
    const err = new Error(
      "AI extraction isn't set up yet — add GEMINI_API_KEY to your .env file to enable it."
    );
    err.status = 500;
    throw err;
  }

  const isPdf = mimeType === "application/pdf";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: isPdf ? "application/pdf" : mimeType || "image/jpeg",
                data: base64,
              },
            },
            { text: SDS_EXTRACTION_PROMPT },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SDS_RESPONSE_SCHEMA,
      },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `AI extraction request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const err = new Error("The AI didn't return any extracted data — the document may be unreadable.");
    err.status = 502;
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error("Could not parse the AI's response as JSON.");
    err.status = 502;
    err.raw = text;
    throw err;
  }
}

module.exports = { extractLicenseData, extractSDSData };
