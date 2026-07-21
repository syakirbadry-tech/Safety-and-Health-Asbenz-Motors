# OSH-C Portal — Asbenz Motors

A login-protected web app for the OSH-C Compliance Tracker: role-based access
(Admin vs HR/view-only), a Machinery/CHRA/HRA/HIRARC/SOP dashboard with file
uploads (licenses, service history, SDS), an Admin panel for managing users
and passwords, and an automatic login/activity history — all backed by your
existing Airtable base. Works on desktop and on mobile (iPhone Safari,
Android Chrome) since it's just a responsive web page.

Your Airtable Personal Access Token stays on the server only. The browser
never sees it — every screen talks to this app's own `/api/...` routes,
which then talk to Airtable on your behalf.

## 1. What you need

- Node.js 18+ (to run the server)
- Your Airtable Personal Access Token — the same one you created for the
  Obsidian sync works, as long as it has these scopes: `data.records:read`,
  `data.records:write`, `schema.bases:read`. Check/create one at
  https://airtable.com/create/tokens
- A place to host it so HR can reach it from their own phone/laptop (see
  step 4). Render.com's free tier is the easiest option and is what these
  steps assume — swap in Railway, Fly.io, or your own server if you prefer.

## 2. Configure

```bash
cd osh-c-app
cp .env.example .env
```

Edit `.env` and fill in:
- `AIRTABLE_PAT` — your token
- `AIRTABLE_BASE_ID` — already set to `appqSxDrzpfO1ybFw` (your OSH-C base)
- `JWT_SECRET` — generate one with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `GEMINI_API_KEY` — optional and free, powers the "Upload & Auto-fill (AI)"
  button on Machinery license uploads (see section 6). Leave blank to skip it.

## 3. Try it locally first (optional but recommended)

```bash
npm install
npm run seed-admin -- "Your Name" you@example.com TempPass123
npm start
```

Open http://localhost:3000/login.html, sign in with the email + temp
password you used above, and you'll immediately be asked to set a real
password — you're in as Admin. `Ctrl+C` stops the server.

`npm run seed-admin` only touches Airtable directly (creates/promotes a user
record) — it doesn't need the server running, and you can rerun it any time
to reset your own account if you get locked out.

## 4. Deploy so HR can log in from their own devices

**Render.com (free tier):**
1. Push this `osh-c-app` folder to a new GitHub repo (or use Render's
   "Deploy from a zip" option if you don't want to use Git).
2. On [render.com](https://render.com) → New → Web Service → connect the repo.
3. Build command: `npm install`  ·  Start command: `npm start`
4. Under Environment, add: `AIRTABLE_PAT`, `AIRTABLE_BASE_ID`, `JWT_SECRET`,
   `JWT_EXPIRES_IN` (same values as your local `.env`).
5. Deploy. Render gives you a URL like `https://osh-c-portal.onrender.com`.
6. If you haven't already, run the seed-admin command from step 3 (locally,
   pointed at the same Airtable base) to create your Admin login.
7. Share the URL with HR. They open it in any browser — desktop or mobile —
   and log in with the account you create for them in the Admin panel.

On iPhone/Android, tell people to open the link in Safari/Chrome and use
"Add to Home Screen" for an app-like icon — no App Store install needed.

## 5. Day-to-day use

- **Admin (you):** full access — add/edit/delete Machinery, CHRA, HRA,
  HIRARC, SOP records; upload license documents, service history, and SDS
  files; manage user accounts and roles in the Admin panel; view the full
  login/activity history.
- **HR / Staff:** view-only across all modules — they can open any record
  and see details/files, but Add/Edit/Delete/Upload controls are hidden and
  blocked server-side too (not just hidden in the UI).
- **Creating accounts:** Admin panel → "+ New user" → set a temporary
  password. That person is forced to set their own password on first login.
- **Resetting a password:** Admin panel → click the user → "Reset password"
  with a new temp password, or anyone can change their own via the profile
  menu → "Change password".
- **Activity history:** Admin panel → "Login & Activity History" tab shows
  every login (success/failed), create/update/delete, and file upload, with
  timestamp, user, and details — same data also lands in the "Activity Log"
  table in Airtable directly.


- **Settings tab (Admin panel → Settings):** a system-health snapshot (errors in
  the last 24h, failed logins, active users, total records) plus per-module
  **Export** (downloads a JSON backup of every record) and **Bulk import**
  (paste JSON to add records, or wipe-and-replace a whole module — typed
  confirmation required for that one, since it can't be undone).
- **Errors:** any failed request (Airtable unreachable, bad data, etc.) now
  gets logged to the same Activity History as a normal action, tagged
  "Error" and highlighted in red — filter by "Error" in the Activity tab to
  see everything that's gone wrong, no need to check server logs.


- **Data Browser (Admin panel → Data Browser, now the first tab):** a raw,
  spreadsheet-style view of every Machinery/CHRA/HRA/HIRARC/SOP record —
  pick a module on the left, every field is an editable cell, click away to
  save, trash icon to delete a row, "+ Add row" to create one. Same
  underlying data and endpoints as the regular record forms, just a denser
  view for bulk hands-on editing (closer to a database admin tool than a form).

## 6. AI auto-fill from license documents (Machinery only) — free

When you open a Machinery record and click **"Upload & Auto-fill (AI)"** next
to License Document, the file uploads to Airtable as usual, and Google
Gemini reads it and suggests values for Serial Number, Category, Country of
Origin / Manufacturer, License Expiry Date, and DOSH Certificate No. Those
fields get pre-filled in the form with a blue outline so you know they're AI
suggestions — **nothing saves automatically**. Check them against the actual
document, correct anything wrong, then click Save like normal.

To turn this on (free, no credit card needed):
1. Go to https://aistudio.google.com/apikey and sign in with a Google account.
2. Click **Create API key**, copy the value.
3. Paste it into `.env` as `GEMINI_API_KEY=...`, and add the same variable in
   your host's Environment settings if you've already deployed.
4. Restart the server (`Ctrl+C`, `npm start` locally, or redeploy on Render).

Gemini's free tier has a daily request limit, which is far more than a single
workshop uploading licenses occasionally will hit. If the key isn't set, the
plain "Upload" button still works for every module; you'll just see a
message that AI extraction isn't configured.

## 7. Notes on security

- Passwords are hashed with bcrypt before ever touching Airtable — nobody,
  including you looking at the Airtable base directly, can see a plain-text
  password.
- Sessions are stateless JWTs, so any number of people can be logged in at
  once from different devices without conflicting.
- Non-admin write attempts are rejected server-side (`403`), not just hidden
  in the UI — so a technically savvy HR user can't bypass the view-only
  restriction by calling the API directly.
