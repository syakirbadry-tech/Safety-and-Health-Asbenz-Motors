Auth.requireLogin();
Auth.requireAdmin();
const me = Auth.user();
document.getElementById("profileName").textContent = me?.fullName || me?.email || "Admin";
document.getElementById("avatarInitials").textContent = (me?.fullName || "A").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const overlay = document.getElementById("overlay");
const modalBody = document.getElementById("modalBody");
const modalTitle = document.getElementById("modalTitle");
document.getElementById("modalClose").addEventListener("click", () => overlay.classList.remove("open"));
overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document.getElementById("tabData").classList.toggle("hidden", target !== "data");
    document.getElementById("tabUsers").classList.toggle("hidden", target !== "users");
    document.getElementById("tabCompany").classList.toggle("hidden", target !== "company");
    document.getElementById("tabActivity").classList.toggle("hidden", target !== "activity");
    document.getElementById("tabSettings").classList.toggle("hidden", target !== "settings");
    if (target === "company") loadCompanyProfile();
    if (target === "activity") loadActivity();
    if (target === "settings") loadSettings();
  });
});

// ============================================================
// Data Browser — a raw, phpMyAdmin-style grid over every
// compliance module. Reuses the same /api/<module> CRUD routes
// the record-detail modal uses elsewhere in the app; this is
// just a denser, inline-editable view of the same data.
// ============================================================
let dataActiveKey = "machinery";
let dataRecords = [];

function initDataBrowser() {
  const sidebar = document.getElementById("dataSidebar");
  sidebar.innerHTML = Object.values(MODULES).map((mod) =>
    `<div class="chip${mod.key === dataActiveKey ? " active" : ""}" data-mod="${mod.key}">${mod.title}<span class="count" id="count-${mod.key}"></span></div>`
  ).join("");
  sidebar.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      dataActiveKey = chip.dataset.mod;
      sidebar.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.dataset.mod === dataActiveKey));
      loadDataGrid();
    });
  });
  loadDataGrid();
}

async function loadDataGrid() {
  const mod = MODULES[dataActiveKey];
  document.getElementById("dataModuleTitle").textContent = mod.title;
  document.getElementById("dataTableHead").innerHTML =
    Object.keys(mod.fields).map((label) => `<th>${label}</th>`).join("") +
    (mod.complianceFieldId ? `<th>Compliance (auto)</th>` : "") +
    `<th></th>`;
  document.getElementById("dataTableBody").innerHTML = `<tr><td colspan="20" class="text-dim">Loading…</td></tr>`;
  try {
    const data = await api(mod.api);
    dataRecords = data.records || [];
    const countEl = document.getElementById(`count-${dataActiveKey}`);
    if (countEl) countEl.textContent = dataRecords.length;
    renderDataGrid();
  } catch (err) {
    document.getElementById("dataTableBody").innerHTML = `<tr><td colspan="20" class="text-dim">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderDataGrid() {
  const mod = MODULES[dataActiveKey];
  const body = document.getElementById("dataTableBody");
  if (dataRecords.length === 0) {
    body.innerHTML = `<tr><td colspan="20" class="text-dim">No ${mod.title} records yet. Click "+ Add row" to create one.</td></tr>`;
    return;
  }
  body.innerHTML = dataRecords.map((r) => {
    const cells = Object.entries(mod.fields).map(([label, fieldId]) => {
      const raw = r.fields[fieldId];
      const isDate = mod.dateKeys.includes(label);
      const val = isDate && raw ? String(raw).slice(0, 10) : (raw ?? "");
      const inputType = isDate ? "date" : "text";
      return `<td><input class="cell-input" type="${inputType}" data-rec="${r.id}" data-field="${fieldId}" data-label="${escapeHtml(label)}" data-date="${isDate}" value="${escapeHtml(val)}" /></td>`;
    }).join("");
    const complianceCell = mod.complianceFieldId
      ? `<td><span class="cell-readonly">${escapeHtml(r.fields[mod.complianceFieldId] || "—")}</span></td>`
      : "";
    return `<tr>${cells}${complianceCell}<td><button class="row-del-btn" data-del="${r.id}" title="Delete row">🗑</button></td></tr>`;
  }).join("");

  body.querySelectorAll(".cell-input").forEach((input) => {
    input.addEventListener("focus", () => { input.dataset.original = input.value; });
    input.addEventListener("input", () => {
      input.classList.toggle("dirty", input.value !== input.dataset.original);
    });
    input.addEventListener("blur", () => saveCell(input));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
  });
  body.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => deleteDataRow(btn.dataset.del));
  });
}

async function saveCell(input) {
  const original = input.dataset.original ?? input.value;
  if (input.value === original) return; // nothing changed, skip the round-trip
  const mod = MODULES[dataActiveKey];
  const recordId = input.dataset.rec;
  const fieldId = input.dataset.field;
  const isDate = input.dataset.date === "true";
  // Airtable date fields reject an empty string — clearing one needs an
  // explicit null instead. Text fields are fine with "".
  const value = isDate && input.value === "" ? null : input.value;
  input.disabled = true;
  try {
    const res = await api(`${mod.api}/${recordId}`, { method: "PATCH", body: { fields: { [fieldId]: value } } });
    const idx = dataRecords.findIndex((r) => r.id === recordId);
    if (idx > -1) dataRecords[idx] = res.record;
    input.dataset.original = input.value;
    input.classList.remove("dirty");
    toast(`Saved ${input.dataset.label}.`);
  } catch (err) {
    input.value = original;
    input.classList.remove("dirty");
    toast(err.message, true);
  } finally {
    input.disabled = false;
  }
}

async function deleteDataRow(recordId) {
  const mod = MODULES[dataActiveKey];
  if (!confirm(`Delete this ${mod.title} row? This cannot be undone.`)) return;
  try {
    await api(`${mod.api}/${recordId}`, { method: "DELETE" });
    toast("Row deleted.");
    await loadDataGrid();
  } catch (err) {
    toast(err.message, true);
  }
}

document.getElementById("addRowBtn").addEventListener("click", async () => {
  const mod = MODULES[dataActiveKey];
  try {
    await api(mod.api, { method: "POST", body: { fields: {} } });
    toast(`New ${mod.title} row added — fill it in below.`);
    await loadDataGrid();
  } catch (err) {
    toast(err.message, true);
  }
});

initDataBrowser();

// ---------- Users ----------
let usersCache = [];

async function loadUsers() {
  try {
    const data = await api("/admin/users");
    usersCache = data.users;
    document.getElementById("usersBody").innerHTML = usersCache.map(rowHtml).join("") ||
      `<tr><td colspan="7" class="text-dim">No users yet.</td></tr>`;
    document.querySelectorAll("tr[data-uid]").forEach((tr) => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        openEditUser(usersCache.find((u) => u.id === tr.dataset.uid));
      });
    });
  } catch (err) {
    toast(err.message, true);
  }
}

function rowHtml(u) {
  const statusBadgeHtml = u.status === "Active" ? '<span class="badge ok">ACTIVE</span>' : '<span class="badge bad">DISABLED</span>';
  return `<tr class="row-click" data-uid="${u.id}">
    <td>${u.fullName}</td>
    <td>${u.loginId}</td>
    <td>${u.role}</td>
    <td>${statusBadgeHtml}</td>
    <td>${u.lastLogin ? fmtDateTime(u.lastLogin) : "Never"}</td>
    <td>${u.forcePasswordReset ? "Yes" : "—"}</td>
    <td></td>
  </tr>`;
}

document.getElementById("newUserBtn").addEventListener("click", () => openNewUser());

function openNewUser() {
  modalTitle.textContent = "New user";
  modalBody.innerHTML = `
    <form id="userForm">
      <div class="field"><label>Full name</label><input id="uFullName" required /></div>
      <div class="field"><label>Login ID (email)</label><input id="uLoginId" type="email" required /></div>
      <div class="field"><label>Role</label>
        <select id="uRole">
          <option>Admin</option>
          <option selected>HR (View Only)</option>
          <option>Staff</option>
        </select>
      </div>
      <div class="field"><label>Temporary password (min 8 chars — they'll be forced to change it)</label><input id="uTempPw" type="text" minlength="8" required /></div>
      <button class="btn primary block" type="submit">Create user</button>
    </form>`;
  document.getElementById("userForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/admin/users", {
        method: "POST",
        body: {
          fullName: document.getElementById("uFullName").value,
          loginId: document.getElementById("uLoginId").value,
          role: document.getElementById("uRole").value,
          tempPassword: document.getElementById("uTempPw").value,
        },
      });
      toast("User created.");
      overlay.classList.remove("open");
      loadUsers();
    } catch (err) {
      toast(err.message, true);
    }
  });
  overlay.classList.add("open");
}

function openEditUser(u) {
  modalTitle.textContent = u.fullName;
  modalBody.innerHTML = `
    <form id="editForm">
      <div class="field"><label>Full name</label><input id="eFullName" value="${u.fullName}" /></div>
      <div class="field"><label>Login ID</label><input value="${u.loginId}" disabled /></div>
      <div class="field"><label>Role</label>
        <select id="eRole">
          ${["Admin", "HR (View Only)", "Staff"].map((r) => `<option ${r === u.role ? "selected" : ""}>${r}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Status</label>
        <select id="eStatus">
          <option ${u.status === "Active" ? "selected" : ""}>Active</option>
          <option ${u.status === "Disabled" ? "selected" : ""}>Disabled</option>
        </select>
      </div>
      <div class="field"><label>Notes</label><textarea id="eNotes" rows="2">${u.notes || ""}</textarea></div>
      <button class="btn primary block" type="submit">Save changes</button>
    </form>
    <div style="margin-top:18px;border-top:1px solid var(--line);padding-top:16px;">
      <div class="field"><label>Set new temporary password (leave blank to skip)</label><input id="eNewPw" type="text" minlength="8" placeholder="Min 8 characters" /></div>
      <button class="btn block" id="resetPwBtn">Reset password</button>
    </div>
    <button class="btn danger block mt-8" id="deleteUserBtn">Delete user</button>
  `;

  document.getElementById("editForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api(`/admin/users/${u.id}`, {
        method: "PATCH",
        body: {
          fullName: document.getElementById("eFullName").value,
          role: document.getElementById("eRole").value,
          status: document.getElementById("eStatus").value,
          notes: document.getElementById("eNotes").value,
        },
      });
      toast("Saved.");
      overlay.classList.remove("open");
      loadUsers();
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.getElementById("resetPwBtn").addEventListener("click", async () => {
    const pw = document.getElementById("eNewPw").value;
    if (!pw || pw.length < 8) return toast("Enter a temp password of at least 8 characters.", true);
    try {
      await api(`/admin/users/${u.id}`, { method: "PATCH", body: { newTempPassword: pw } });
      toast("Password reset. User must change it on next login.");
      overlay.classList.remove("open");
      loadUsers();
    } catch (err) {
      toast(err.message, true);
    }
  });

  document.getElementById("deleteUserBtn").addEventListener("click", async () => {
    if (!confirm(`Delete ${u.fullName}? This cannot be undone.`)) return;
    try {
      await api(`/admin/users/${u.id}`, { method: "DELETE" });
      toast("User deleted.");
      overlay.classList.remove("open");
      loadUsers();
    } catch (err) {
      toast(err.message, true);
    }
  });

  overlay.classList.add("open");
}

// ============================================================
// Company Profile — the single source of truth for company info, reused by
// every generated report (DOSH Chemical Register today; Noise/Machinery/
// CAPA/Committee reports read the same table as they add their own). Backed
// by the existing Company Settings table/route — conceptually a single-row
// table, same convention as before this module existed: the app always
// operates on the first record, creating one on first Save if none exists.
// ============================================================
const CP = MODULES.companySettings.fields;
const CP_ACTIVITY_OPTIONS = ["Manufacturer", "Distributor", "Formulator", "Importer", "End-User"];
let companyProfileRecord = null; // the live Airtable record, or null if none exists yet

async function loadCompanyProfile() {
  try {
    const data = await api("/company-settings");
    companyProfileRecord = (data.records || [])[0] || null;
    renderCompanyProfileForm();
  } catch (err) {
    toast(err.message, true);
  }
}

function renderCompanyProfileForm() {
  const f = companyProfileRecord?.fields || {};
  const val = (key) => f[CP[key]] ?? "";

  document.getElementById("cpCompanyName").value = val("Company Name");
  document.getElementById("cpCompanyRegNo").value = val("Company Registration Number");
  document.getElementById("cpDoshRegNo").value = val("DOSH Registration Number");
  document.getElementById("cpMsicCode").value = val("MSIC Code");
  document.getElementById("cpCodeOfSector").value = val("Code of Sector");
  document.getElementById("cpClassOfIndustry").value = val("Class of Industry");
  document.getElementById("cpAddressLine1").value = val("Address Line 1");
  document.getElementById("cpAddressLine2").value = val("Address Line 2");
  document.getElementById("cpPostcode").value = val("Postcode");
  document.getElementById("cpCity").value = val("City");
  document.getElementById("cpState").value = val("State");
  document.getElementById("cpCountry").value = val("Country");
  document.getElementById("cpPhone").value = val("Phone");
  document.getElementById("cpEmail").value = val("Email");
  document.getElementById("cpWebsite").value = val("Website");
  document.getElementById("cpPreparedName").value = val("Default Prepared By");
  document.getElementById("cpPreparedPosition").value = val("Default Prepared By Position");
  document.getElementById("cpReviewedName").value = val("Default Reviewed By");
  document.getElementById("cpReviewedPosition").value = val("Default Reviewed By Position");

  const activities = f[CP["Company Activity"]] || [];
  document.getElementById("cpActivityBox").innerHTML = CP_ACTIVITY_OPTIONS.map((a) =>
    `<label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:400;text-transform:none;">
      <input type="checkbox" data-cp-activity="${a}" ${activities.includes(a) ? "checked" : ""} /> ${a}
    </label>`
  ).join("");

  renderCpAttachmentPreview("logo", "cpLogoPreview");
  renderCpAttachmentPreview("stamp", "cpStampPreview");
  clearCpFieldErrors();
}

function renderCpAttachmentPreview(key, elId) {
  const mod = MODULES.companySettings;
  const attachment = mod.attachments.find((a) => a.key === key);
  const files = companyProfileRecord?.fields[attachment.fieldId] || [];
  const el = document.getElementById(elId);
  el.innerHTML = files.length
    ? files.map((file) => `<a class="file-chip" href="${file.url}" target="_blank" rel="noopener">📎 ${escapeHtml(file.filename)}</a>`).join("")
    : `<span class="text-dim">No file uploaded.</span>`;
}

function clearCpFieldErrors() {
  document.getElementById("cpPhoneError").textContent = "";
  document.getElementById("cpEmailError").textContent = "";
  document.getElementById("cpPhone").classList.remove("invalid");
  document.getElementById("cpEmail").classList.remove("invalid");
}

// Loose but real validation — accepts spaces/dashes/parens/an optional
// leading +, digits only otherwise, 7-15 digits (E.164-ish, not
// Malaysia-specific, since a report vendor/branch could be based anywhere).
const CP_PHONE_RE = /^\+?[\d\s()-]{7,20}$/;
const CP_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCompanyProfileForm() {
  clearCpFieldErrors();
  let ok = true;

  const name = document.getElementById("cpCompanyName").value.trim();
  if (!name) {
    toast("Company Name is required.", true);
    document.getElementById("cpCompanyName").focus();
    ok = false;
  }

  const phone = document.getElementById("cpPhone").value.trim();
  if (phone && !CP_PHONE_RE.test(phone)) {
    document.getElementById("cpPhoneError").textContent = "Doesn't look like a valid phone number.";
    document.getElementById("cpPhone").classList.add("invalid");
    ok = false;
  }

  const email = document.getElementById("cpEmail").value.trim();
  if (email && !CP_EMAIL_RE.test(email)) {
    document.getElementById("cpEmailError").textContent = "Doesn't look like a valid email address.";
    document.getElementById("cpEmail").classList.add("invalid");
    ok = false;
  }

  return ok;
}

document.getElementById("companyProfileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateCompanyProfileForm()) return;

  const fields = {
    [CP["Company Name"]]: document.getElementById("cpCompanyName").value.trim(),
    [CP["Company Registration Number"]]: document.getElementById("cpCompanyRegNo").value.trim(),
    [CP["DOSH Registration Number"]]: document.getElementById("cpDoshRegNo").value.trim(),
    [CP["MSIC Code"]]: document.getElementById("cpMsicCode").value.trim(),
    [CP["Code of Sector"]]: document.getElementById("cpCodeOfSector").value.trim(),
    [CP["Class of Industry"]]: document.getElementById("cpClassOfIndustry").value.trim(),
    [CP["Address Line 1"]]: document.getElementById("cpAddressLine1").value.trim(),
    [CP["Address Line 2"]]: document.getElementById("cpAddressLine2").value.trim(),
    [CP["Postcode"]]: document.getElementById("cpPostcode").value.trim(),
    [CP["City"]]: document.getElementById("cpCity").value.trim(),
    [CP["State"]]: document.getElementById("cpState").value.trim(),
    [CP["Country"]]: document.getElementById("cpCountry").value.trim(),
    [CP["Phone"]]: document.getElementById("cpPhone").value.trim(),
    [CP["Email"]]: document.getElementById("cpEmail").value.trim(),
    [CP["Website"]]: document.getElementById("cpWebsite").value.trim(),
    [CP["Default Prepared By"]]: document.getElementById("cpPreparedName").value.trim(),
    [CP["Default Prepared By Position"]]: document.getElementById("cpPreparedPosition").value.trim(),
    [CP["Default Reviewed By"]]: document.getElementById("cpReviewedName").value.trim(),
    [CP["Default Reviewed By Position"]]: document.getElementById("cpReviewedPosition").value.trim(),
  };
  const activities = Array.from(document.querySelectorAll("[data-cp-activity]:checked")).map((el) => el.dataset.cpActivity);
  fields[CP["Company Activity"]] = activities;

  const saveBtn = document.getElementById("cpSaveBtn");
  saveBtn.disabled = true;
  try {
    if (companyProfileRecord) {
      const res = await api(`/company-settings/${companyProfileRecord.id}`, { method: "PATCH", body: { fields } });
      companyProfileRecord = res.record;
    } else {
      const res = await api("/company-settings", { method: "POST", body: { fields } });
      companyProfileRecord = res.record;
    }
    toast("Company Profile saved.");
    renderCompanyProfileForm();
  } catch (err) {
    toast(err.message, true);
  } finally {
    saveBtn.disabled = false;
  }
});

document.getElementById("cpResetBtn").addEventListener("click", () => {
  renderCompanyProfileForm(); // discard unsaved edits, reload last-saved values
  toast("Reset to last saved values.");
});

async function uploadCpAttachment(key, file) {
  if (!companyProfileRecord) {
    // No record yet — create a blank one first so there's somewhere to
    // attach the file (mirrors the rest of the app's "save creates the row"
    // convention; the wizard-style presave-attachment flow isn't warranted
    // here since Company Profile has no multi-step create wizard).
    try {
      const res = await api("/company-settings", { method: "POST", body: { fields: {} } });
      companyProfileRecord = res.record;
    } catch (err) {
      return toast(err.message, true);
    }
  }
  const fd = new FormData();
  fd.append("file", file);
  try {
    toast("Uploading…");
    const res = await api(`/company-settings/${companyProfileRecord.id}/upload/${key}`, { method: "POST", body: fd, isForm: true });
    companyProfileRecord = res.record;
    toast("Uploaded.");
    renderCompanyProfileForm();
  } catch (err) {
    toast(err.message, true);
  }
}

document.getElementById("cpLogoInput").addEventListener("change", (e) => {
  if (e.target.files[0]) uploadCpAttachment("logo", e.target.files[0]);
});
document.getElementById("cpStampInput").addEventListener("change", (e) => {
  if (e.target.files[0]) uploadCpAttachment("stamp", e.target.files[0]);
});

// ---------- Activity ----------
let activityCache = [];
async function loadActivity() {
  try {
    const data = await api("/admin/activity");
    activityCache = data.activity;
    renderActivity();
  } catch (err) {
    toast(err.message, true);
  }
}
document.getElementById("activityFilter").addEventListener("change", renderActivity);

function renderActivity() {
  const filter = document.getElementById("activityFilter").value;
  const rows = activityCache.filter((a) => !filter || a.action === filter);
  document.getElementById("activityBody").innerHTML = rows.map((a) => `
    <tr${a.action === "Error" ? ' style="background:rgba(239,68,68,0.06);"' : ""}>
      <td>${fmtDateTime(a.timestamp)}</td>
      <td>${userLabel(a.user)}</td>
      <td>${a.action === "Error" ? '<span class="badge bad">ERROR</span>' : a.action}</td>
      <td>${a.module}</td>
      <td>${a.recordRef || "—"}</td>
      <td style="white-space:normal;max-width:280px;">${a.details || "—"}</td>
    </tr>`).join("") || `<tr><td colspan="6" class="text-dim">No activity recorded yet.</td></tr>`;
}

function userLabel(userId) {
  if (!userId) return "—";
  const u = usersCache.find((x) => x.id === userId);
  return u ? u.fullName : userId;
}

// ---------- Settings (system health + data export/import) ----------
const MODULE_LABELS = { machinery: "Machinery", chra: "CHRA", hra: "HRA", hirarc: "HIRARC", sop: "SOP" };
let healthCache = null;

async function loadSettings() {
  await Promise.all([loadHealth(), renderDataTools()]);
}

async function loadHealth() {
  const grid = document.getElementById("healthGrid");
  grid.innerHTML = `<div class="stat-card"><div class="n">…</div><div class="l">Loading</div></div>`;
  try {
    const data = await api("/admin/health");
    healthCache = data;
    document.getElementById("healthCheckedAt").textContent = "Checked " + fmtDateTime(data.checkedAt);
    const errCardStyle = data.errorsLast24h > 0 ? 'style="border-color:var(--red)"' : 'style="border-color:var(--green)"';
    grid.innerHTML = `
      <div class="stat-card" ${errCardStyle}><div class="n">${data.errorsLast24h}</div><div class="l">Errors (24h)</div></div>
      <div class="stat-card" style="border-color:var(--amber)"><div class="n">${data.loginFailuresLast24h}</div><div class="l">Failed logins (24h)</div></div>
      <div class="stat-card" style="border-color:var(--accent)"><div class="n">${data.activeUsers}/${data.totalUsers}</div><div class="l">Active users</div></div>
      <div class="stat-card" style="border-color:var(--gray)"><div class="n">${Object.values(data.moduleCounts).reduce((a, b) => a + (b || 0), 0)}</div><div class="l">Total records</div></div>
    `;
  } catch (err) {
    grid.innerHTML = `<div class="stat-card" style="border-color:var(--red)"><div class="n">—</div><div class="l">Health check failed</div></div>`;
    toast(err.message, true);
  }
}

async function renderDataTools() {
  const body = document.getElementById("dataToolsBody");
  body.innerHTML = Object.entries(MODULE_LABELS).map(([key, label]) => {
    const count = healthCache?.moduleCounts?.[key];
    return `<tr>
      <td>${label}</td>
      <td>${count === null || count === undefined ? "…" : count}</td>
      <td>
        <div class="flex gap-8 flex-wrap">
          <button class="btn small" data-export="${key}">Export</button>
          <button class="btn small" data-import="${key}">Bulk import…</button>
        </div>
      </td>
    </tr>`;
  }).join("");

  body.querySelectorAll("[data-export]").forEach((btn) => {
    btn.addEventListener("click", () => exportModule(btn.dataset.export));
  });
  body.querySelectorAll("[data-import]").forEach((btn) => {
    btn.addEventListener("click", () => openImportModal(btn.dataset.import));
  });
}

async function exportModule(key) {
  try {
    const data = await api(`/admin/export/${key}`);
    const blob = new Blob([JSON.stringify(data.records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osh-c-${key}-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(`Exported ${data.count} ${MODULE_LABELS[key]} record(s).`);
  } catch (err) {
    toast(err.message, true);
  }
}

function openImportModal(key) {
  modalTitle.textContent = `Bulk import — ${MODULE_LABELS[key]}`;
  modalBody.innerHTML = `
    <p class="text-dim" style="font-size:12.5px;">
      Paste a JSON array of records (same shape as "Export" produces — field names as keys).
      "Append" adds them as new records. "Overwrite" deletes every existing ${MODULE_LABELS[key]}
      record first, then creates these — this cannot be undone.
    </p>
    <div class="field"><label>Records (JSON array)</label><textarea id="importJson" rows="8" placeholder='[{"Machine Name": "Lathe 01", ...}]'></textarea></div>
    <div class="field">
      <label>Mode</label>
      <select id="importMode">
        <option value="append">Append (add as new records)</option>
        <option value="overwrite">Overwrite (delete existing, then add these)</option>
      </select>
    </div>
    <div class="field" id="confirmWrap" style="display:none;">
      <label>Type OVERWRITE to confirm you want to delete all existing ${MODULE_LABELS[key]} records</label>
      <input id="importConfirm" placeholder="OVERWRITE" />
    </div>
    <button class="btn primary block" id="runImportBtn">Run import</button>
  `;
  document.getElementById("importMode").addEventListener("change", (e) => {
    document.getElementById("confirmWrap").style.display = e.target.value === "overwrite" ? "block" : "none";
  });
  document.getElementById("runImportBtn").addEventListener("click", async () => {
    const mode = document.getElementById("importMode").value;
    if (mode === "overwrite" && document.getElementById("importConfirm").value.trim() !== "OVERWRITE") {
      return toast('Type OVERWRITE (exactly) to confirm.', true);
    }
    let records;
    try {
      records = JSON.parse(document.getElementById("importJson").value);
      if (!Array.isArray(records) || records.length === 0) throw new Error("empty");
    } catch {
      return toast("That doesn't look like a valid, non-empty JSON array.", true);
    }
    try {
      const res = await api(`/admin/import/${key}`, { method: "POST", body: { records, mode } });
      toast(`Done — ${res.created} record(s) created.`);
      overlay.classList.remove("open");
      await loadHealth();
      await renderDataTools();
    } catch (err) {
      toast(err.message, true);
    }
  });
  overlay.classList.add("open");
}

loadUsers();
