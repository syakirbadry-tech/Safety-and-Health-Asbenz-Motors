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

// Guard against navigating away from an unsaved Company Profile edit via
// the tab bar. Registered on `document` in the capture phase — a listener
// added directly on a `.tab` element (even with useCapture:true) would
// still fire in registration order relative to the tab-switching listener
// below, since same-element listeners don't reorder by capture/bubble; only
// an ancestor's capture-phase listener is guaranteed to run first. `cpDirty`
// is declared later in this file but only read here once a click actually
// happens, by which point the whole script (including that declaration)
// has already run.
document.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  const leavingCompanyDirty = !document.getElementById("tabCompany").classList.contains("hidden") && tab.dataset.tab !== "company" && typeof cpDirty !== "undefined" && cpDirty;
  if (leavingCompanyDirty && !confirm("You have unsaved Company Profile changes. Leave without saving?")) {
    e.stopImmediatePropagation();
    e.preventDefault();
  } else if (leavingCompanyDirty) {
    clearCpDirty();
  }
}, true);

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
// Company Profile — the central administration page for the whole system.
// Single source of truth for company info, branding, document defaults,
// signatories and export settings, reused by every generated report
// (Chemical Register, DOSH Chemical Register, Machinery Register, CAPA
// Register, OSH Committee Register, Company Profile — see ARCHITECTURE.md
// §5.7). Backed by the existing Company Settings table/route — conceptually
// a single-row table, same convention as before this module existed: the
// app always operates on the first record, creating one on first Save if
// none exists.
// ============================================================
const CP = MODULES.companySettings.fields;
const CP_ACTIVITY_OPTIONS = ["Manufacturer", "Distributor", "Formulator", "Importer", "End-User"];
let companyProfileRecord = null; // the live Airtable record, or null if none exists yet
let cpDirty = false;

// One reusable upload slot definition per image field — drives one shared
// drag-and-drop component instead of six hand-written copies. `fieldId`
// resolved from MODULES.companySettings.attachments (single source for the
// key→field-ID mapping, same as before this expansion).
const CP_UPLOAD_SLOTS = [
  { key: "logo", label: "Company Logo", grid: "cpUploadGrid" },
  { key: "stamp", label: "Company Stamp (optional)", grid: "cpUploadGrid" },
  { key: "watermark", label: "Watermark (optional)", grid: "cpUploadGrid" },
  { key: "preparedBySignature", label: "Prepared By — Signature", grid: "cpSignatureUploadGrid" },
  { key: "reviewedBySignature", label: "Reviewed By — Signature", grid: "cpSignatureUploadGrid" },
  { key: "approvedBySignature", label: "Approved By — Signature", grid: "cpSignatureUploadGrid" },
];
const CP_UPLOAD_ACCEPT = "image/png,image/svg+xml,image/jpeg";
const CP_UPLOAD_MAX_MB = 5;

// Export Settings — rendered as friendly checkboxes, stored as Show/Hide (or
// Repeat/Don't Repeat) selects, not checkboxes: Airtable's API omits an
// unchecked checkbox from a record's fields entirely, indistinguishable
// from "never touched," so a select is the only way to reliably persist
// "explicitly turned off" — see server/lib/schema.js's companySettings
// comment. All default checked (= unset = "Show"/"Repeat" server-side).
const CP_EXPORT_SETTINGS = [
  { key: "Show Logo", label: "Show Logo", off: "Hide" },
  { key: "Show Company Stamp", label: "Show Company Stamp", off: "Hide" },
  { key: "Show Footer", label: "Show Footer", off: "Hide" },
  { key: "Show Page Numbers", label: "Show Page Numbers", off: "Hide" },
  { key: "Show Generated Date", label: "Show Generated Date", off: "Hide" },
  { key: "Show Generated Time", label: "Show Generated Time", off: "Hide" },
  { key: "Show Generated By", label: "Show Generated By", off: "Hide" },
  { key: "Repeat Table Headers", label: "Repeat Table Headers", off: "Don't Repeat" },
  { key: "Show Document Version", label: "Show Document Version", off: "Hide" },
  { key: "Show Document Number", label: "Show Document Number", off: "Hide" },
];

function markCpDirty() {
  cpDirty = true;
  document.getElementById("cpUnsavedBanner").classList.remove("hidden");
}
function clearCpDirty() {
  cpDirty = false;
  document.getElementById("cpUnsavedBanner").classList.add("hidden");
}
window.addEventListener("beforeunload", (e) => {
  if (!cpDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

async function loadCompanyProfile() {
  try {
    const data = await api("/company-settings");
    companyProfileRecord = (data.records || [])[0] || null;
    renderCompanyProfileForm();
    clearCpDirty();
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
  document.getElementById("cpIndustry").value = val("Industry");
  document.getElementById("cpTaxNumber").value = val("Tax Number");
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
  document.getElementById("cpDescription").value = val("Description");
  document.getElementById("cpPrimaryColour").value = val("Primary Colour");
  document.getElementById("cpSecondaryColour").value = val("Secondary Colour");
  document.getElementById("cpPrimaryColourPicker").value = /^#[0-9a-f]{6}$/i.test(val("Primary Colour")) ? val("Primary Colour") : "#000000";
  document.getElementById("cpSecondaryColourPicker").value = /^#[0-9a-f]{6}$/i.test(val("Secondary Colour")) ? val("Secondary Colour") : "#000000";
  document.getElementById("cpDocumentPrefix").value = val("Document Prefix");
  document.getElementById("cpDefaultVersion").value = val("Default Version");
  document.getElementById("cpDocumentFooter").value = val("Document Footer");
  document.getElementById("cpDefaultPaperSize").value = val("Default Paper Size") || "A4";
  document.getElementById("cpDefaultOrientation").value = val("Default Orientation") || "Portrait";
  document.getElementById("cpDefaultLanguage").value = val("Default Language") || "English";
  document.getElementById("cpCompanyConfidential").checked = val("Company Confidential") === "On";
  document.getElementById("cpPreparedName").value = val("Default Prepared By");
  document.getElementById("cpPreparedPosition").value = val("Default Prepared By Position");
  document.getElementById("cpReviewedName").value = val("Default Reviewed By");
  document.getElementById("cpReviewedPosition").value = val("Default Reviewed By Position");
  document.getElementById("cpApprovedName").value = val("Approved By");
  document.getElementById("cpApprovedPosition").value = val("Approved By Position");

  const activities = f[CP["Company Activity"]] || [];
  document.getElementById("cpActivityBox").innerHTML = CP_ACTIVITY_OPTIONS.map((a) =>
    `<label style="display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:400;text-transform:none;">
      <input type="checkbox" data-cp-activity="${a}" ${activities.includes(a) ? "checked" : ""} /> ${a}
    </label>`
  ).join("");

  document.getElementById("cpExportSettingsGrid").innerHTML = CP_EXPORT_SETTINGS.map(
    (s) => `
    <label style="display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:400;text-transform:none;color:var(--text);">
      <input type="checkbox" data-cp-export-setting="${s.key}" style="width:auto;" ${val(s.key) === s.off ? "" : "checked"} /> ${s.label}
    </label>`
  ).join("");

  CP_UPLOAD_SLOTS.forEach((slot) => mountCpImageUpload(slot));

  clearCpFieldErrors();

  // Wire dirty-tracking once per render (elements are freshly recreated for
  // the two dynamic grids above, so re-bind every time).
  document.querySelectorAll("#companyProfileForm input, #companyProfileForm select, #companyProfileForm textarea").forEach((el) => {
    el.removeEventListener("input", markCpDirty);
    el.removeEventListener("change", markCpDirty);
    el.addEventListener("input", markCpDirty);
    el.addEventListener("change", markCpDirty);
  });
}

// Colour picker <-> hex text field sync.
function cpSyncColour(pickerId, textId) {
  document.getElementById(pickerId).addEventListener("input", (e) => {
    document.getElementById(textId).value = e.target.value;
    markCpDirty();
  });
  document.getElementById(textId).addEventListener("input", (e) => {
    if (/^#[0-9a-f]{6}$/i.test(e.target.value)) document.getElementById(pickerId).value = e.target.value;
  });
}
cpSyncColour("cpPrimaryColourPicker", "cpPrimaryColour");
cpSyncColour("cpSecondaryColourPicker", "cpSecondaryColour");

// ---- Reusable image upload component (drag-and-drop, preview, remove) ----
function mountCpImageUpload(slot) {
  const grid = document.getElementById(slot.grid);
  const attachment = MODULES.companySettings.attachments.find((a) => a.key === slot.key);
  const files = companyProfileRecord?.fields[attachment.fieldId] || [];
  const file = files[0] || null;
  const zoneId = `cpDrop_${slot.key}`;
  const inputId = `cpFile_${slot.key}`;

  let el = document.getElementById(`cpSlot_${slot.key}`);
  if (!el) {
    el = document.createElement("div");
    el.className = "field";
    el.id = `cpSlot_${slot.key}`;
    grid.appendChild(el);
  }

  el.innerHTML = `
    <label>${escapeHtml(slot.label)}</label>
    <div id="${zoneId}" class="dosh-dropzone" style="padding:14px;text-align:center;cursor:pointer;">
      ${
        file
          ? `<img src="${file.thumbnails?.large?.url || file.url}" alt="${escapeHtml(file.filename)}" style="max-height:70px;max-width:100%;object-fit:contain;margin-bottom:6px;" />
             <div style="font-size:11px;" class="text-dim">${escapeHtml(file.filename)}</div>`
          : `<div style="font-size:12px;" class="text-dim">Drag &amp; drop or click to upload<br/>PNG, SVG or JPEG, up to ${CP_UPLOAD_MAX_MB}MB</div>`
      }
      <div id="${zoneId}_progress" class="hidden text-dim" style="font-size:11px;margin-top:4px;">Uploading…</div>
    </div>
    <input type="file" accept="${CP_UPLOAD_ACCEPT}" style="display:none" id="${inputId}" />
    ${file ? `<button type="button" class="btn small ghost" style="margin-top:6px;" data-cp-remove="${slot.key}">Remove</button>` : ""}
  `;

  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  zone.addEventListener("click", () => input.click());
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragover"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    if (e.dataTransfer.files[0]) uploadCpAttachment(slot, e.dataTransfer.files[0]);
  });
  input.addEventListener("change", (e) => {
    if (e.target.files[0]) uploadCpAttachment(slot, e.target.files[0]);
  });

  const removeBtn = el.querySelector("[data-cp-remove]");
  if (removeBtn) removeBtn.addEventListener("click", () => removeCpAttachment(slot));
}

const CP_ACCEPTED_TYPES = ["image/png", "image/svg+xml", "image/jpeg"];

function validateCpImageFile(file) {
  if (!CP_ACCEPTED_TYPES.includes(file.type)) {
    return "Only PNG, SVG or JPEG images are accepted.";
  }
  if (file.size > CP_UPLOAD_MAX_MB * 1024 * 1024) {
    return `File is larger than ${CP_UPLOAD_MAX_MB}MB.`;
  }
  return null;
}

// Warn (not block) on unusually large pixel dimensions — resizing/preview is
// handled by Airtable's own attachment thumbnails, not a new image-
// processing dependency; this just catches an obvious wrong-file mistake.
function checkCpImageDimensions(file) {
  return new Promise((resolve) => {
    if (file.type === "image/svg+xml") return resolve(); // vector, no raster dimensions to check
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth > 6000 || img.naturalHeight > 6000) {
        toast(`${file.name} is very large (${img.naturalWidth}×${img.naturalHeight}px) — consider a smaller image.`, true);
      }
      resolve();
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    img.src = url;
  });
}

async function uploadCpAttachment(slot, file) {
  const err = validateCpImageFile(file);
  if (err) return toast(err, true);

  // Prevent duplicate uploads — re-selecting the exact same file (by name
  // + size) already attached to this slot is a no-op, not a re-upload.
  const attachment = MODULES.companySettings.attachments.find((a) => a.key === slot.key);
  const current = (companyProfileRecord?.fields[attachment.fieldId] || [])[0];
  if (current && current.filename === file.name && current.size === file.size) {
    return toast("That file is already uploaded.", true);
  }

  await checkCpImageDimensions(file);

  if (!companyProfileRecord) {
    // No record yet — create a blank one first so there's somewhere to
    // attach the file (mirrors the rest of the app's "save creates the row"
    // convention; the wizard-style presave-attachment flow isn't warranted
    // here since Company Profile has no multi-step create wizard).
    try {
      const res = await api("/company-settings", { method: "POST", body: { fields: {} } });
      companyProfileRecord = res.record;
    } catch (createErr) {
      return toast(createErr.message, true);
    }
  }

  const zone = document.getElementById(`cpDrop_${slot.key}`);
  const progress = document.getElementById(`cpDrop_${slot.key}_progress`);
  if (zone) zone.style.pointerEvents = "none";
  if (progress) progress.classList.remove("hidden");

  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await api(`/company-settings/${companyProfileRecord.id}/upload/${slot.key}`, { method: "POST", body: fd, isForm: true });
    companyProfileRecord = res.record;
    toast(`${slot.label} uploaded.`);
    renderCompanyProfileForm();
  } catch (uploadErr) {
    toast(uploadErr.message, true);
  } finally {
    if (zone) zone.style.pointerEvents = "";
    if (progress) progress.classList.add("hidden");
  }
}

async function removeCpAttachment(slot) {
  if (!companyProfileRecord) return;
  const attachment = MODULES.companySettings.attachments.find((a) => a.key === slot.key);
  try {
    const res = await api(`/company-settings/${companyProfileRecord.id}`, { method: "PATCH", body: { fields: { [attachment.fieldId]: [] } } });
    companyProfileRecord = res.record;
    toast(`${slot.label} removed.`);
    renderCompanyProfileForm();
  } catch (err) {
    toast(err.message, true);
  }
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
const CP_COLOUR_RE = /^#[0-9a-f]{6}$/i;

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

  for (const [id, label] of [["cpPrimaryColour", "Primary Colour"], ["cpSecondaryColour", "Secondary Colour"]]) {
    const v = document.getElementById(id).value.trim();
    if (v && !CP_COLOUR_RE.test(v)) {
      toast(`${label} must be a hex color like #0EA5E9.`, true);
      ok = false;
    }
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
    [CP["Industry"]]: document.getElementById("cpIndustry").value.trim(),
    [CP["Tax Number"]]: document.getElementById("cpTaxNumber").value.trim(),
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
    [CP["Description"]]: document.getElementById("cpDescription").value.trim(),
    [CP["Primary Colour"]]: document.getElementById("cpPrimaryColour").value.trim(),
    [CP["Secondary Colour"]]: document.getElementById("cpSecondaryColour").value.trim(),
    [CP["Document Prefix"]]: document.getElementById("cpDocumentPrefix").value.trim(),
    [CP["Default Version"]]: document.getElementById("cpDefaultVersion").value.trim(),
    [CP["Document Footer"]]: document.getElementById("cpDocumentFooter").value.trim(),
    [CP["Default Paper Size"]]: document.getElementById("cpDefaultPaperSize").value,
    [CP["Default Orientation"]]: document.getElementById("cpDefaultOrientation").value,
    [CP["Default Language"]]: document.getElementById("cpDefaultLanguage").value,
    [CP["Company Confidential"]]: document.getElementById("cpCompanyConfidential").checked ? "On" : "Off",
    [CP["Default Prepared By"]]: document.getElementById("cpPreparedName").value.trim(),
    [CP["Default Prepared By Position"]]: document.getElementById("cpPreparedPosition").value.trim(),
    [CP["Default Reviewed By"]]: document.getElementById("cpReviewedName").value.trim(),
    [CP["Default Reviewed By Position"]]: document.getElementById("cpReviewedPosition").value.trim(),
    [CP["Approved By"]]: document.getElementById("cpApprovedName").value.trim(),
    [CP["Approved By Position"]]: document.getElementById("cpApprovedPosition").value.trim(),
  };
  const activities = Array.from(document.querySelectorAll("[data-cp-activity]:checked")).map((el) => el.dataset.cpActivity);
  fields[CP["Company Activity"]] = activities;

  CP_EXPORT_SETTINGS.forEach((s) => {
    const checked = document.querySelector(`[data-cp-export-setting="${s.key}"]`)?.checked;
    fields[CP[s.key]] = checked ? (s.key === "Repeat Table Headers" ? "Repeat" : "Show") : s.off;
  });

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
    clearCpDirty();
  } catch (err) {
    toast(err.message, true);
  } finally {
    saveBtn.disabled = false;
  }
});

document.getElementById("cpResetBtn").addEventListener("click", () => {
  renderCompanyProfileForm(); // discard unsaved edits, reload last-saved values
  clearCpDirty();
  toast("Reset to last saved values.");
});

// "Preview Report" — opens /company-profile/preview in a new tab, which
// renders through the exact same ReportEngine calls every real report uses
// (public/js/pages/companyProfile.module.js). Handed off via sessionStorage
// (same-origin, so the new tab can read it) rather than a server round-trip,
// so it reflects the CURRENT unsaved form values, not just the last save.
// Uploaded images reflect the last-saved attachment — previewing an
// in-progress unsaved file pick isn't supported (see PRINT_EXPORT_
// IMPLEMENTATION_REPORT.md's known limitations).
document.getElementById("cpPreviewBtn").addEventListener("click", () => {
  const activities = Array.from(document.querySelectorAll("[data-cp-activity]:checked")).map((el) => el.dataset.cpActivity);
  const exportSettings = {};
  CP_EXPORT_SETTINGS.forEach((s) => {
    exportSettings[s.key] = document.querySelector(`[data-cp-export-setting="${s.key}"]`)?.checked ?? true;
  });
  const f = companyProfileRecord?.fields || {};
  const attachmentUrl = (key) => {
    const attachment = MODULES.companySettings.attachments.find((a) => a.key === key);
    return (f[attachment.fieldId] || [])[0] || null;
  };

  const payload = {
    companyName: document.getElementById("cpCompanyName").value.trim(),
    address: document.getElementById("cpAddressLine1").value.trim(),
    addressLine2: document.getElementById("cpAddressLine2").value.trim(),
    city: document.getElementById("cpCity").value.trim(),
    postcode: document.getElementById("cpPostcode").value.trim(),
    state: document.getElementById("cpState").value.trim(),
    country: document.getElementById("cpCountry").value.trim(),
    telephone: document.getElementById("cpPhone").value.trim(),
    email: document.getElementById("cpEmail").value.trim(),
    website: document.getElementById("cpWebsite").value.trim(),
    industry: document.getElementById("cpIndustry").value.trim(),
    description: document.getElementById("cpDescription").value.trim(),
    primaryColour: document.getElementById("cpPrimaryColour").value.trim(),
    secondaryColour: document.getElementById("cpSecondaryColour").value.trim(),
    documentPrefix: document.getElementById("cpDocumentPrefix").value.trim(),
    defaultVersion: document.getElementById("cpDefaultVersion").value.trim(),
    documentFooter: document.getElementById("cpDocumentFooter").value.trim(),
    companyConfidential: document.getElementById("cpCompanyConfidential").checked,
    companyActivity: activities,
    defaultPreparedByName: document.getElementById("cpPreparedName").value.trim(),
    defaultPreparedByPosition: document.getElementById("cpPreparedPosition").value.trim(),
    defaultReviewedByName: document.getElementById("cpReviewedName").value.trim(),
    defaultReviewedByPosition: document.getElementById("cpReviewedPosition").value.trim(),
    approvedByName: document.getElementById("cpApprovedName").value.trim(),
    approvedByPosition: document.getElementById("cpApprovedPosition").value.trim(),
    logo: [attachmentUrl("logo")].filter(Boolean),
    stamp: [attachmentUrl("stamp")].filter(Boolean),
    watermark: [attachmentUrl("watermark")].filter(Boolean),
    signatures: {
      prepared: [attachmentUrl("preparedBySignature")].filter(Boolean),
      reviewed: [attachmentUrl("reviewedBySignature")].filter(Boolean),
      approved: [attachmentUrl("approvedBySignature")].filter(Boolean),
    },
    exportSettings: {
      showLogo: exportSettings["Show Logo"],
      showStamp: exportSettings["Show Company Stamp"],
      showFooter: exportSettings["Show Footer"],
      showPageNumbers: exportSettings["Show Page Numbers"],
      showGeneratedDate: exportSettings["Show Generated Date"],
      showGeneratedTime: exportSettings["Show Generated Time"],
      showGeneratedBy: exportSettings["Show Generated By"],
      repeatTableHeaders: exportSettings["Repeat Table Headers"],
      showDocumentVersion: exportSettings["Show Document Version"],
      showDocumentNumber: exportSettings["Show Document Number"],
    },
  };

  sessionStorage.setItem("companyProfilePreview", JSON.stringify(payload));
  window.open("/company-profile/preview", "_blank", "noopener");
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
