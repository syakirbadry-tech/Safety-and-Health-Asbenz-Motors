Auth.requireLogin();
const me = Auth.user();
const isAdmin = me?.role === "Admin";

// ---------- Topbar ----------
document.getElementById("profileName").textContent = me?.fullName || me?.email || "Signed in";
document.getElementById("profileRole").textContent = me?.role || "";
document.getElementById("avatarInitials").textContent = (me?.fullName || me?.email || "?")
  .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
if (isAdmin) document.getElementById("adminLink").classList.remove("hidden");

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { await api("/auth/logout", { method: "POST" }); } catch {}
  Auth.clear();
  window.location.href = "/login.html";
});

document.getElementById("profileBtn").addEventListener("click", () => {
  document.getElementById("profileMenu").classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#profileWrap")) document.getElementById("profileMenu").classList.add("hidden");
});

document.getElementById("changePwBtn").addEventListener("click", () => openChangePassword());

// ---------- Legacy module record cache ----------
// key -> records[]. Populated on demand (see ensureLegacyLoaded) rather than
// eagerly for every module on every page load, since CHRA/HRA/HIRARC/SOP are
// now reached through the "Chemical Management" / "Noise Management" /
// "Operational Safety" placeholder pages (see pages/dashboard.js) instead of
// always being fetched up front on the old single-page dashboard.
const state = {};

async function refreshState(key) {
  try {
    const data = await api(MODULES[key].api);
    state[key] = data.records || [];
  } catch (err) {
    console.error(key, err);
  }
  return state[key];
}

async function ensureLegacyLoaded(key) {
  if (!state[key]) await refreshState(key);
  return state[key];
}

// ---------- Module list overlay ----------
const overlay = document.getElementById("overlay");
const modalBody = document.getElementById("modalBody");
const modalTitle = document.getElementById("modalTitle");

// Set to a module's basePath (e.g. "/machinery") only while the currently-
// open overlay is showing that module's master or sub-record data — see
// openRecordForm and openSubRecordForm (framework/moduleFramework.js). Lets
// closeModal() refresh the router-driven page underneath only when that's
// actually relevant, instead of on every modal close (e.g. Change Password,
// reachable from any page via the sidebar). null for legacy modules
// (CHRA/HRA/HIRARC/SOP), which don't have a router-driven page to refresh.
let modalTouchesModulePath = null;

function closeModal() {
  overlay.classList.remove("open");
  if (modalTouchesModulePath && location.pathname.startsWith(modalTouchesModulePath)) {
    Router.navigate(location.pathname, { replace: true });
  }
}
document.getElementById("modalClose").addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

function openModuleList(key) {
  modalTouchesModulePath = null;
  const mod = MODULES[key];
  const records = state[key] || [];
  modalTitle.textContent = mod.title;

  const rows = records.map((r) => {
    const cells = mod.listColumns.map((c) => {
      const val = r.fields[mod.fields[c]];
      return mod.dateKeys.includes(c) ? fmtDate(val) : (val ?? "—");
    });
    const dateVal = r.fields[mod.fields[mod.dateField]];
    return `<tr class="row-click" data-id="${r.id}">
      ${cells.map((c) => `<td>${c}</td>`).join("")}
      <td>${statusBadge(dateVal)}</td>
    </tr>`;
  }).join("");

  modalBody.innerHTML = `
    <div class="flex gap-8" style="justify-content:flex-end;margin-bottom:14px;">
      ${isAdmin ? `<button class="btn primary small" id="addBtn">+ Add ${mod.title}</button>` : ""}
    </div>
    ${records.length === 0
      ? `<div class="empty-state">No ${mod.title} records yet.${isAdmin ? " Click “Add” to register one." : ""}</div>`
      : `<div class="table-wrap"><table>
          <thead><tr>${mod.listColumns.map((c) => `<th>${c}</th>`).join("")}<th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`
    }
  `;

  if (isAdmin) {
    document.getElementById("addBtn").addEventListener("click", () => openRecordForm(key, null));
  }
  modalBody.querySelectorAll("tr[data-id]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const rec = records.find((r) => r.id === tr.dataset.id);
      openRecordForm(key, rec);
    });
  });

  overlay.classList.add("open");
}

// ---------- Record detail / form ----------
// Holds a file the admin picked on the "New <module>" form before the
// record exists yet (e.g. a license). Set by the presave upload handler
// below, consumed right after the record is created in the submit handler,
// then cleared. Reset whenever a fresh blank form is opened.
let pendingNewRecordFile = null;

function openRecordForm(key, record) {
  modalTouchesModulePath = FRAMEWORK_MODULE_BASE_PATHS[key] || null;
  const mod = MODULES[key];
  if (!record) pendingNewRecordFile = null;
  modalTitle.textContent = record ? (record.fields[mod.fields[mod.primary]] || mod.title) : `New ${mod.title}`;

  const readOnly = !isAdmin;
  const formFields = Object.entries(mod.fields).map(([label, fieldId]) => {
    const val = record ? (record.fields[fieldId] ?? "") : "";
    const isTextarea = mod.textareaKeys.includes(label);
    const isDate = mod.dateKeys.includes(label);
    const inputType = isDate ? "date" : "text";
    const dateVal = isDate && val ? String(val).slice(0, 10) : val;
    if (isTextarea) {
      return `<div class="field"><label>${label}</label><textarea data-field="${fieldId}" rows="3" ${readOnly ? "disabled" : ""}>${escapeHtml(dateVal)}</textarea></div>`;
    }
    return `<div class="field"><label>${label}</label><input type="${inputType}" data-field="${fieldId}" value="${escapeHtml(dateVal)}" ${readOnly ? "disabled" : ""} /></div>`;
  }).join("");

  const complianceVal = record ? record.fields[mod.complianceFieldId] : null;
  const complianceHtml = record && mod.complianceFieldId
    ? `<div class="field"><label>Compliance Status (auto)</label><input type="text" value="${escapeHtml(complianceVal || "—")}" disabled /></div>`
    : "";

  const attachmentsHtml = record
    ? mod.attachments.map((a) => attachmentBlockHtml(mod, key, record, a)).join("")
    : preSaveAttachmentHtml(mod);

  modalBody.innerHTML = `
    <form id="recordForm">
      ${formFields}
      ${complianceHtml}
      <div class="flex gap-8" style="margin:18px 0;flex-wrap:wrap;">
        ${isAdmin ? `<button type="submit" class="btn primary">Save</button>` : ""}
        ${isAdmin && record ? `<button type="button" class="btn danger" id="deleteBtn">Delete</button>` : ""}
        <button type="button" class="btn ghost" id="backBtn">← Back to list</button>
      </div>
    </form>
    <div class="section-head" style="margin-top:8px;"><h2 style="font-size:14px;">Files</h2></div>
    <div class="record-list">${attachmentsHtml}</div>
  `;

  // Framework-driven modules (Machinery, and any future module defined via
  // defineBusinessModule) are reached from the router-driven pages (Register,
  // Profile, Dashboard quick action) now, not the legacy single-page grid —
  // closing back to whichever of those is underneath is correct there, while
  // CHRA/HRA/HIRARC/SOP still use the legacy list-inside-overlay flow until
  // their own module dashboard ships.
  document.getElementById("backBtn").addEventListener("click", () => {
    if (FRAMEWORK_MODULE_BASE_PATHS[key]) closeModal();
    else openModuleList(key);
  });

  if (isAdmin) {
    document.getElementById("recordForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fields = {};
      modalBody.querySelectorAll("[data-field]").forEach((el) => {
        if (el.value !== "") fields[el.dataset.field] = el.value;
      });
      try {
        if (record) {
          await api(`${mod.api}/${record.id}`, { method: "PATCH", body: { fields } });
          toast("Saved.");
        } else {
          const res = await api(mod.api, { method: "POST", body: { fields } });
          record = res.record;

          if (pendingNewRecordFile) {
            try {
              const fd = new FormData();
              fd.append("file", pendingNewRecordFile.file);
              await api(`${mod.api}/${record.id}/upload/${pendingNewRecordFile.key}`, {
                method: "POST",
                body: fd,
                isForm: true,
              });
              toast("Created and license file attached.");
            } catch (uploadErr) {
              toast(`Record created, but attaching the file failed: ${uploadErr.message}`, true);
            } finally {
              pendingNewRecordFile = null;
            }
          } else {
            toast("Created.");
          }
        }
        await refreshState(key);
        openRecordForm(key, record);
      } catch (err) {
        toast(err.message, true);
      }
    });

    const delBtn = document.getElementById("deleteBtn");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (!confirm("Delete this record? This cannot be undone.")) return;
        try {
          await api(`${mod.api}/${record.id}`, { method: "DELETE" });
          toast("Deleted.");
          await refreshState(key);
          if (FRAMEWORK_MODULE_BASE_PATHS[key]) closeModal();
          else openModuleList(key);
        } catch (err) {
          toast(err.message, true);
        }
      });
    }
  }

  overlay.classList.add("open");
}

function attachmentBlockHtml(mod, key, record, attachment) {
  const files = record.fields[attachment.fieldId] || [];
  const fileChips = files.length
    ? files.map((f) => `<a class="file-chip" href="${f.url}" target="_blank" rel="noopener">\u{1F4CE} ${escapeHtml(f.filename)}</a>`).join("")
    : `<span class="text-dim" style="font-size:12px;">No files uploaded.</span>`;

  return `
    <div class="record-row">
      <div>
        <div style="font-weight:600;font-size:13px;">${attachment.label}</div>
        <div class="meta flex gap-8 flex-wrap" style="margin-top:8px;">${fileChips}</div>
      </div>
      ${isAdmin ? `
        <div class="actions">
          <label class="btn small">
            ${attachment.aiExtract ? "Upload & Auto-fill (AI)" : "Upload"}
            <input type="file" style="display:none" data-upload="${key}:${record.id}:${attachment.key}" />
          </label>
        </div>` : ""}
    </div>`;
}

// Shown in the Files section of a brand-new (unsaved) record. If the module
// has an AI-extractable attachment (currently just Machinery's license),
// lets the admin pick that file immediately — it gets read for suggestions
// right away and held in memory, then actually attached once Save creates
// the record. Other attachment types on a new record still need Save first,
// since there's no record ID yet to attach them to.
function preSaveAttachmentHtml(mod) {
  const aiAtt = mod.attachments.find((a) => a.aiExtract);
  if (!isAdmin || !aiAtt) {
    return `<p class="text-dim" style="font-size:12.5px;">Save the record first, then you can upload files.</p>`;
  }
  const others = mod.attachments.filter((a) => a !== aiAtt);
  return `
    <div class="record-row">
      <div>
        <div style="font-weight:600;font-size:13px;">${aiAtt.label}</div>
        <div class="meta" id="presaveFileName" style="margin-top:8px;font-size:12px;">No file selected yet.</div>
      </div>
      <div class="actions">
        <label class="btn small">
          Upload & Auto-fill (AI)
          <input type="file" style="display:none" data-presave-upload="${mod.key}:${aiAtt.key}" />
        </label>
      </div>
    </div>
    <p class="text-dim" style="font-size:11.5px;margin-top:10px;">Pick the license file first — I'll read it, fill in the fields above, and attach it automatically when you click Save.</p>
    ${others.map((a) => `<p class="text-dim" style="font-size:12px;margin-top:10px;">${a.label}: save the record first to upload.</p>`).join("")}
  `;
}

modalBody?.addEventListener?.("change", async (e) => {
  const presaveInput = e.target.closest("input[data-presave-upload]");
  if (presaveInput && presaveInput.files[0]) {
    const [key, attKey] = presaveInput.dataset.presaveUpload.split(":");
    const mod = MODULES[key];
    const attachment = mod.attachments.find((a) => a.key === attKey);
    const file = presaveInput.files[0];
    pendingNewRecordFile = { key: attKey, file };

    const nameEl = document.getElementById("presaveFileName");
    if (nameEl) nameEl.textContent = `Reading ${file.name}…`;

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api(`${mod.api}/${attachment.previewExtractEndpoint}`, {
        method: "POST",
        body: fd,
        isForm: true,
      });
      if (res.suggestion) {
        applyAiSuggestion(mod, res.suggestion);
        toast("AI filled in the fields above — review them, then click Save to create the record and attach the file.");
      } else {
        toast(`Couldn't read the document (${res.error || "unknown error"}) — you can still fill in fields manually.`, true);
      }
      if (nameEl) nameEl.textContent = `${file.name} — will attach when you click Save.`;
    } catch (err) {
      toast(err.message, true);
      if (nameEl) nameEl.textContent = `${file.name} — will attach when you click Save (AI read failed).`;
    }
    return;
  }

  const input = e.target.closest("input[data-upload]");
  if (!input || !input.files[0]) return;
  const [key, recordId, attKey] = input.dataset.upload.split(":");
  const mod = MODULES[key];
  const attachment = mod.attachments.find((a) => a.key === attKey);
  const fd = new FormData();
  fd.append("file", input.files[0]);

  try {
    if (attachment?.aiExtract) {
      toast("Uploading & reading document with AI…");
      const res = await api(`${mod.api}/${recordId}/${attachment.extractEndpoint}`, { method: "POST", body: fd, isForm: true });
      await refreshState(key);
      const rec = state[key].find((r) => r.id === recordId);
      openRecordForm(key, rec);
      if (res.suggestion) {
        applyAiSuggestion(mod, res.suggestion);
        toast("AI filled in fields below from the license — check them, then Save.");
      } else {
        toast(`File uploaded, but AI extraction didn't work (${res.extractError || "unknown error"}). Fill in fields manually.`, true);
      }
    } else {
      toast("Uploading…");
      await api(`${mod.api}/${recordId}/upload/${attKey}`, { method: "POST", body: fd, isForm: true });
      toast("File uploaded.");
      await refreshState(key);
      const rec = state[key].find((r) => r.id === recordId);
      openRecordForm(key, rec);
    }
  } catch (err) {
    toast(err.message, true);
  }
});

// Pre-fills form inputs with AI-suggested values (from license extraction)
// and visually flags them so the admin knows to double-check before saving.
// Nothing here saves to Airtable — the existing Save button still does that.
function applyAiSuggestion(mod, suggestion) {
  const map = {
    serialNumber: mod.fields["Serial Number"],
    category: mod.fields["Category"],
    originManufacturer: mod.fields["Country of Origin / Manufacturer"],
    licenseExpiryDate: mod.fields["License Expiry Date"],
    doshCertificateNo: mod.fields["DOSH Certificate No"],
  };
  Object.entries(map).forEach(([suggestionKey, fieldId]) => {
    const val = suggestion[suggestionKey];
    if (!val || !fieldId) return;
    const input = modalBody.querySelector(`[data-field="${fieldId}"]`);
    if (!input) return;
    input.value = val;
    input.style.borderColor = "var(--accent)";
    input.style.boxShadow = "0 0 0 1px var(--accent)";
    input.title = "AI-suggested from the uploaded license — please verify.";
  });
}

// ---------- Change password ----------
function openChangePassword() {
  modalTouchesModulePath = null;
  document.getElementById("profileMenu").classList.add("hidden");
  modalTitle.textContent = "Change password";
  modalBody.innerHTML = `
    <div class="login-error" id="cpError"></div>
    <form id="cpForm">
      <div class="field"><label>Current password</label><input type="password" id="cpCurrent" required /></div>
      <div class="field"><label>New password (min 8 characters)</label><input type="password" id="cpNew" minlength="8" required /></div>
      <div class="field"><label>Confirm new password</label><input type="password" id="cpConfirm" minlength="8" required /></div>
      <button class="btn primary block" type="submit">Update password</button>
    </form>`;
  document.getElementById("cpForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById("cpCurrent").value;
    const newPassword = document.getElementById("cpNew").value;
    const confirm = document.getElementById("cpConfirm").value;
    const errEl = document.getElementById("cpError");
    errEl.classList.remove("show");
    if (newPassword !== confirm) {
      errEl.textContent = "New passwords don't match.";
      errEl.classList.add("show");
      return;
    }
    try {
      await api("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
      toast("Password updated.");
      closeModal();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.add("show");
    }
  });
  overlay.classList.add("open");
}

// ---------- Boot the router (all page routes are registered by pages/*.js,
// loaded before this file) ----------
Router.start();
