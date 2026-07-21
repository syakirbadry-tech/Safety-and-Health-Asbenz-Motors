// Reads an uploaded license/certificate document with Google Gemini (free
// tier — see https://aistudio.google.com/apikey) and pulls out structured
// fields. Returns SUGGESTIONS only — nothing here writes to Airtable. The
// route that calls this hands the result back to the frontend, which
// pre-fills the edit form for a human to review before saving (see
// public/js/app.js: applyAiSuggestion).

const fetch = require("node-fetch");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.0-flash";

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

module.exports = { extractLicenseData };
