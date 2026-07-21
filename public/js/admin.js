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
    document.getElementById("tabActivity").classList.toggle("hidden", target !== "activity");
    document.getElementById("tabSettings").classList.toggle("hidden", target !== "settings");
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
