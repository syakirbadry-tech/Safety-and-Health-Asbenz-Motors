// Generic business-module engine, extracted from the hand-written Machinery
// Dashboard/Register/Profile pages. `defineBusinessModule(config)` turns a
// declarative config object (master table + linked sub-tables + optional
// reused risk-assessment table + attachments) into a full working module:
// Register page, Module Dashboard (Overview + one tab per sub-table + Risk +
// Documents + Reports), Profile page (General Info + optional merged
// "history" tab + one tab per sub-table + Photos + Attachments + Risk +
// Activity Timeline), and the sub-record CRUD form shared by every module.
//
// Machinery is the reference config (public/js/pages/machinery.module.js).
// A second module (e.g. Chemical Management) should only need a new config
// file + new Airtable tables — no new page-rendering code.

// key -> config, populated by defineBusinessModule. Lets shell-level code in
// app.js (the shared #overlay, quick-add buttons, sub-record file uploads)
// look up a module's config/services from a short key embedded in a data
// attribute, without every module needing bespoke global listeners.
const MODULE_REGISTRY = {};

// modulesKey (MODULES.<key>) -> basePath, populated by defineBusinessModule.
// Read by app.js's openRecordForm/closeModal so the shared #overlay knows
// whether the record it's editing belongs to a router-driven module (close
// = refresh the page underneath) or a legacy module still using the
// overlay-as-list pattern (close = reopen the legacy list, unchanged).
const FRAMEWORK_MODULE_BASE_PATHS = {};

function defineBusinessModule(config) {
  const masterApi = MODULES[config.modulesKey].api;
  config._services = {
    master: makeLinkedTableService(masterApi),
    sub: Object.fromEntries(Object.entries(config.subTables).map(([k, st]) => [k, makeLinkedTableService(st.api)])),
  };
  config._profileLastTab = {}; // parentId -> tab key, so a save doesn't reset the view (see profile page below)

  MODULE_REGISTRY[config.key] = config;
  FRAMEWORK_MODULE_BASE_PATHS[config.modulesKey] = config.basePath;

  Router.register(config.basePath, () => renderModuleDashboard(config));
  Router.register(`${config.basePath}/register`, () => renderRegisterPage(config));
  Router.register(`${config.basePath}/:id`, (params) => renderProfilePage(config, params));

  return config;
}

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

function fw_masterField(config, label) {
  return MODULES[config.modulesKey].fields[label];
}

function fw_parentLinkCell(config, linkedIds, nameMap) {
  const id = (linkedIds || [])[0];
  if (!id) return "—";
  const name = escapeHtml(nameMap[id] || id);
  return `<a data-navigate="${config.basePath}/${id}">${name}</a>`;
}

async function fw_getParentNameMap(config) {
  const records = await config._services.master.list();
  const nameField = fw_masterField(config, config.nameField);
  const map = {};
  records.forEach((r) => (map[r.id] = r.fields[nameField] || r.id));
  return map;
}

// Every "+ Add X" entry point (Register page button, Dashboard quick-add)
// routes through here. Modules that need something other than the plain
// master-record overlay form — e.g. Chemical Management's SDS-driven wizard
// — set config.customAddHandler; everything else keeps using the default
// openRecordForm(modulesKey, null), unchanged.
function fw_triggerAdd(config) {
  if (config.customAddHandler) config.customAddHandler();
  else openRecordForm(config.modulesKey, null);
}

// listColumns entries are either a plain field-key string, or
// { key, truncate } for a long free-text field (e.g. a fault description)
// that should be previewed rather than shown in full in a table cell.
function fw_colDef(entry) {
  return typeof entry === "string" ? { key: entry, truncate: null } : entry;
}

// Renders one sub-table cell value generically: dates via fmtDate, singleSelect
// fields via the status-pill component, everything else as escaped text
// (optionally truncated — see fw_colDef).
function fw_subTableCell(subTable, record, colDef) {
  const fieldId = subTable.fields[colDef.key];
  const val = record.fields[fieldId];
  if (subTable.formMeta.dateKeys.includes(colDef.key)) return fmtDate(val);
  if (subTable.formMeta.selectOptions && subTable.formMeta.selectOptions[colDef.key]) return Components.statusPillFor(val);
  const text = val || "—";
  return escapeHtml(colDef.truncate ? String(text).slice(0, colDef.truncate) : text);
}

// columns/row builder shared by the Dashboard's cross-master tabs (one row
// per record across every parent, with a parent-link column) and the
// Profile page's per-parent sub-tables (no parent column, since the page is
// already scoped to one parent).
function fw_subTableColumns(config, subKey, { withParent }) {
  const st = config.subTables[subKey];
  const cols = [];
  if (withParent) cols.push({ key: "__parent", label: config.parentLabel });
  cols.push({ key: "__primary", label: st.formMeta.labels[st.primary] });
  (st.listColumns || []).forEach((entry) => {
    const c = fw_colDef(entry);
    cols.push({ key: c.key, label: st.formMeta.labels[c.key] });
  });
  return cols;
}

function fw_subTableRow(config, subKey, record, { withParent, nameMap, openOnClick }) {
  const st = config.subTables[subKey];
  const cells = { __primary: escapeHtml(record.fields[st.fields[st.primary]] || "—") };
  if (withParent) cells.__parent = fw_parentLinkCell(config, record.fields[st.fields[st.parentFieldKey]], nameMap);
  (st.listColumns || []).forEach((entry) => {
    const c = fw_colDef(entry);
    cells[c.key] = fw_subTableCell(st, record, c);
  });
  const row = { cells };
  if (openOnClick) row.dataAttrs = { "data-open-sub": `${subKey}:${record.id}` };
  return row;
}

function fw_dueSoonCount(records, fieldId, days = 30) {
  return records.filter((r) => {
    const d = daysUntil(r.fields[fieldId]);
    return d !== null && d <= days;
  }).length;
}

function fw_overdueCount(records, fieldId) {
  return records.filter((r) => daysUntil(r.fields[fieldId]) < 0).length;
}

function fw_openCount(records, subTable) {
  const fieldId = subTable.fields[subTable.openStatusField];
  return records.filter((r) => (subTable.openValues || []).includes(r.fields[fieldId])).length;
}

// One KPI per configured sub-table, used by both the Overview tab (30-day
// "due soon" window) and the Reports tab (strict "overdue" window) — see
// each subtable's optional dueField/openStatusField/label overrides.
function fw_subTableKpis(config, dataByKey, { overdue }) {
  return (config.dashboardSubTabOrder || Object.keys(config.subTables)).map((subKey) => {
    const st = config.subTables[subKey];
    const records = dataByKey[subKey];
    if (st.dueField) {
      const fieldId = st.fields[st.dueField];
      const value = overdue ? fw_overdueCount(records, fieldId) : fw_dueSoonCount(records, fieldId);
      const label = overdue ? st.overdueLabel || `Overdue ${st.title}` : st.dueSoonLabel || `${st.title} Due Soon (30d)`;
      return { label, value, tone: value ? (overdue ? "bad" : "warn") : "ok" };
    }
    if (st.openStatusField) {
      const value = fw_openCount(records, st);
      return { label: st.openLabel || `Open ${st.title}`, value, tone: value ? "bad" : "ok" };
    }
    return { label: st.countLabel || `${st.title} Logged`, value: records.length, tone: "neutral" };
  });
}

// ---------------------------------------------------------------------
// Register page — generic table of master records
// ---------------------------------------------------------------------

function renderRegisterPage(config) {
  const view = document.getElementById("view");
  const isAdmin = Auth.user()?.role === "Admin";

  view.innerHTML = `
    ${Components.breadcrumb([{ label: "Dashboard", href: "/" }, { label: config.title, href: config.basePath }, { label: config.registerLabel }])}
    <div class="page-head"><h1>${escapeHtml(config.registerLabel)}</h1><p>${escapeHtml(config.registerDesc)}</p></div>
    <div class="flex gap-8" style="justify-content:flex-end;margin-bottom:14px;" id="fwRegisterActions"></div>
    <div id="fwRegisterTable"><div class="page-loading">Loading…</div></div>
  `;

  if (isAdmin) {
    document.getElementById("fwRegisterActions").innerHTML = `<button class="btn primary small" id="fwAddBtn">+ ${escapeHtml(config.quickAddLabel)}</button>`;
    document.getElementById("fwAddBtn").addEventListener("click", () => fw_triggerAdd(config));
  }

  config._services.master
    .list()
    .then((records) => renderFwRegisterTable(config, records))
    .catch((err) => {
      console.error(err);
      document.getElementById("fwRegisterTable").innerHTML = Components.emptyState(`Could not load ${config.title.toLowerCase()}.`);
    });
}

function renderFwRegisterTable(config, records) {
  const columns = [
    ...config.registerColumns.map((c) => ({ key: c.key, label: c.label })),
    ...(config.statusDateField ? [{ key: "status", label: "Status" }] : []),
  ];
  const rows = records.map((r) => {
    const cells = {};
    config.registerColumns.forEach((c) => {
      const val = r.fields[fw_masterField(config, c.field)];
      const display = c.isDate ? fmtDate(val) : escapeHtml(val || "—");
      cells[c.key] = c.strong ? `<strong>${display}</strong>` : display;
    });
    if (config.statusDateField) cells.status = statusBadge(r.fields[fw_masterField(config, config.statusDateField)]);
    return { navigate: `${config.basePath}/${r.id}`, cells };
  });
  document.getElementById("fwRegisterTable").innerHTML = Components.dataTable({
    columns,
    rows,
    emptyLabel: `No ${config.title.toLowerCase()} registered yet.`,
  });
}

// ---------------------------------------------------------------------
// Module Dashboard — Overview + one cross-master tab per sub-table +
// optional Risk Assessment + Documents + Reports
// ---------------------------------------------------------------------

function renderModuleDashboard(config) {
  const view = document.getElementById("view");
  view.innerHTML = `
    ${Components.breadcrumb([{ label: "Dashboard", href: "/" }, { label: config.title }])}
    <div class="page-head"><h1>${escapeHtml(config.dashboardTitle)}</h1><p>${escapeHtml(config.dashboardDesc)}</p></div>
    <div id="fwDashboardTabs"></div>
  `;

  const subTabs = (config.dashboardSubTabOrder || Object.keys(config.subTables)).map((subKey) => ({
    key: subKey,
    label: config.subTables[subKey].title,
    render: () => renderFwCrossMasterTab(config, subKey),
  }));

  const tabs = [
    { key: "overview", label: "Overview", render: () => renderFwOverviewTab(config) },
    { key: "register", label: config.registerLabel, render: () => renderFwRegisterLinkTab(config) },
    ...subTabs,
    ...(config.riskAssessment ? [{ key: "risk", label: config.riskAssessment.label, render: () => renderFwDashboardRiskTab(config) }] : []),
    { key: "documents", label: config.documents.label, render: () => renderFwDocumentsTab(config) },
    // Escape hatch for a module-specific tab that doesn't fit the generic
    // sub-table shape (e.g. Chemical Management's Emergency Spill Procedure,
    // which surfaces SOP records tagged Document Type = "Spill Response"
    // rather than a dedicated sub-table) — same spirit as Machinery keeping
    // its AI license-extract endpoints outside the framework.
    ...(config.extraDashboardTabs || []),
    { key: "reports", label: "Reports", render: () => renderFwReportsTab(config) },
  ];

  Components.mountTabs(document.getElementById("fwDashboardTabs"), { tabs });
}

async function renderFwOverviewTab(config) {
  try {
    const subKeys = config.dashboardSubTabOrder || Object.keys(config.subTables);
    const [masters, ...subLists] = await Promise.all([
      config._services.master.list(),
      ...subKeys.map((k) => config._services.sub[k].list()),
    ]);
    const dataByKey = Object.fromEntries(subKeys.map((k, i) => [k, subLists[i]]));

    const kpis = [
      { label: config.masterCountLabel, value: masters.length, tone: "neutral" },
      ...fw_subTableKpis(config, dataByKey, { overdue: false }),
    ];

    const isAdmin = Auth.user()?.role === "Admin";
    const quickActions = `<div class="flex gap-8 flex-wrap" style="margin-top:18px;">
      ${isAdmin ? `<button class="btn primary small" data-quick-add="${config.key}">+ ${escapeHtml(config.quickAddLabel)}</button>` : ""}
      <button class="btn small" data-navigate="${config.basePath}/register">Open ${escapeHtml(config.registerLabel)}</button>
    </div>`;

    return `${Components.sectionHead("Key Indicators")}${Components.kpiRow(kpis)}${quickActions}`;
  } catch (err) {
    console.error(err);
    return Components.emptyState(`Could not load the ${config.title} overview.`);
  }
}

function renderFwRegisterLinkTab(config) {
  return `
    <p class="text-dim" style="font-size:13px;margin-bottom:14px;">The full ${escapeHtml(config.registerLabel)} (with search and status) is its own page.</p>
    <button class="btn primary small" data-navigate="${config.basePath}/register">Open ${escapeHtml(config.registerLabel)} →</button>`;
}

async function renderFwCrossMasterTab(config, subKey) {
  try {
    const st = config.subTables[subKey];
    const [records, nameMap] = await Promise.all([config._services.sub[subKey].list(), fw_getParentNameMap(config)]);
    const columns = fw_subTableColumns(config, subKey, { withParent: true });
    const rows = records.map((r) => fw_subTableRow(config, subKey, r, { withParent: true, nameMap }));
    return Components.dataTable({ columns, rows, emptyLabel: `No ${st.title.toLowerCase()} records yet.` });
  } catch (err) {
    console.error(err);
    return Components.emptyState("Could not load this section.");
  }
}

async function renderFwDashboardRiskTab(config) {
  try {
    const ra = config.riskAssessment;
    const [records, nameMap] = await Promise.all([api(ra.api).then((d) => d.records), fw_getParentNameMap(config)]);
    const columns = [
      { key: "__parent", label: config.parentLabel },
      { key: "__primary", label: ra.labels[ra.primary] },
      ...(ra.listColumns || []).map((k) => ({ key: k, label: ra.labels[k] })),
    ];
    const rows = records.map((r) => {
      const cells = {
        __parent: fw_parentLinkCell(config, r.fields[ra.fields[ra.parentFieldKey]], nameMap),
        __primary: escapeHtml(r.fields[ra.fields[ra.primary]] || "—"),
      };
      (ra.listColumns || []).forEach((k) => {
        const val = r.fields[ra.fields[k]];
        cells[k] = ra.dateKeys?.includes(k) ? fmtDate(val) : ra.selectFields?.includes(k) ? Components.statusPillFor(val) : escapeHtml(val || "—");
      });
      return { cells };
    });
    return Components.dataTable({ columns, rows, emptyLabel: `No ${ra.label.toLowerCase()} linked yet.` });
  } catch (err) {
    console.error(err);
    return Components.emptyState(`Could not load ${config.riskAssessment.label.toLowerCase()}.`);
  }
}

async function renderFwDocumentsTab(config) {
  try {
    const records = await config._services.master.list();
    const nameField = fw_masterField(config, config.nameField);
    const rows = [];
    records.forEach((rec) => {
      const name = rec.fields[nameField] || rec.id;
      config.documents.fields.forEach(({ label, key }) => {
        (rec.fields[fw_masterField(config, key)] || []).forEach((file) => {
          rows.push({
            navigate: `${config.basePath}/${rec.id}`,
            cells: {
              parent: `<strong>${escapeHtml(name)}</strong>`,
              type: escapeHtml(label),
              file: `<a href="${file.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escapeHtml(file.filename)}</a>`,
            },
          });
        });
      });
    });
    return Components.dataTable({
      columns: [
        { key: "parent", label: config.parentLabel },
        { key: "type", label: "Document Type" },
        { key: "file", label: "File" },
      ],
      rows,
      emptyLabel: "No documents uploaded yet.",
    });
  } catch (err) {
    console.error(err);
    return Components.emptyState("Could not load documents.");
  }
}

async function renderFwReportsTab(config) {
  try {
    const subKeys = config.dashboardSubTabOrder || Object.keys(config.subTables);
    const [masters, ...subLists] = await Promise.all([
      config._services.master.list(),
      ...subKeys.map((k) => config._services.sub[k].list()),
    ]);
    const dataByKey = Object.fromEntries(subKeys.map((k, i) => [k, subLists[i]]));
    const kpis = [
      { label: config.masterCountLabelReports || config.masterCountLabel, value: masters.length, tone: "neutral" },
      ...fw_subTableKpis(config, dataByKey, { overdue: true }),
    ];
    return `
      ${Components.sectionHead("Compliance Summary Report", "Snapshot as of " + fmtDateTime(new Date().toISOString()))}
      ${Components.kpiRow(kpis)}
      <p class="text-dim" style="font-size:12.5px;margin-top:18px;">Exportable/printable reports are planned for a future milestone — for now this summary reflects live Airtable data.</p>
    `;
  } catch (err) {
    console.error(err);
    return Components.emptyState("Could not build the report.");
  }
}

// ---------------------------------------------------------------------
// Profile page — General Information + optional merged History tab + one
// tab per sub-table + Photos + Attachments + Risk + Activity Timeline
// ---------------------------------------------------------------------

async function renderProfilePage(config, params) {
  const view = document.getElementById("view");
  const isAdmin = Auth.user()?.role === "Admin";

  let profile;
  try {
    profile = await config._services.master.getProfile(params.id);
  } catch (err) {
    console.error(err);
    view.innerHTML = Components.emptyState(`${config.parentLabel} not found, or it may have been deleted.`);
    return;
  }

  const nameField = fw_masterField(config, config.nameField);
  const record = profile.master;
  const name = record.fields[nameField] || config.parentLabel;
  const subtitleParts = (config.headerSubtitleFields || [])
    .map((label) => record.fields[fw_masterField(config, label)])
    .filter(Boolean);

  view.innerHTML = `
    ${Components.breadcrumb([
      { label: "Dashboard", href: "/" },
      { label: config.title, href: config.basePath },
      { label: config.registerLabel, href: `${config.basePath}/register` },
      { label: name },
    ])}
    <div class="page-head">
      <h1>${escapeHtml(name)}</h1>
      <p>${escapeHtml(subtitleParts.join(" · "))}</p>
      <div class="flex gap-8" style="margin-top:10px;align-items:center;">
        ${config.statusDateField ? statusBadge(record.fields[fw_masterField(config, config.statusDateField)]) : ""}
        ${isAdmin ? `<button class="btn small" id="fwEditBtn">Edit / Manage Files</button>` : ""}
      </div>
    </div>
    <div id="fwProfileTabs"></div>
  `;

  if (isAdmin) {
    document.getElementById("fwEditBtn").addEventListener("click", () => openRecordForm(config.modulesKey, record));
  }

  const tabs = [
    { key: "general", label: "General Information", render: () => renderFwGeneralInfoTab(config, record, profile) },
    ...(config.historyTab
      ? [{ key: config.historyTab.key, label: config.historyTab.label, render: () => renderFwHistoryTab(config, profile), afterRender: bindSubHandlers }]
      : []),
    ...config.profileSubTabs.map((t) => ({
      key: t.tabKey,
      label: t.label,
      render: () => renderFwProfileSubTable(config, t.subKey, profile.subTables[t.subKey], t.emptyNoun),
      afterRender: bindSubHandlers,
    })),
    ...(config.photos ? [{ key: "photos", label: "Photos", render: () => renderFwPhotosTab(config, record), afterRender: (el) => bindFwPhotoUpload(config, el, record.id) }] : []),
    { key: "attachments", label: "Attachments", render: () => renderFwAttachmentsTab(config, record) },
    ...(config.riskAssessment
      ? [{ key: "risk", label: config.riskAssessment.label, render: () => renderFwProfileRiskTab(config, profile.subTables[config.riskAssessment.profileSourceKey]) }]
      : []),
    { key: "activity", label: "Activity Timeline", render: () => renderFwActivityTab(profile.activity) },
  ];

  Components.mountTabs(document.getElementById("fwProfileTabs"), {
    tabs,
    initialKey: config._profileLastTab[params.id],
    onChange: (key) => { config._profileLastTab[params.id] = key; },
  });

  function bindSubHandlers(panelEl) {
    panelEl.querySelectorAll("[data-add-sub]").forEach((btn) => {
      btn.addEventListener("click", () => openSubRecordForm(config, btn.dataset.addSub, params.id, null));
    });
    panelEl.querySelectorAll("[data-open-sub]").forEach((row) => {
      row.addEventListener("click", () => {
        const [subKey, recordId] = row.dataset.openSub.split(":");
        const source = profile.subTables[subKey] || [];
        const found = source.find((r) => r.id === recordId);
        if (found) openSubRecordForm(config, subKey, params.id, found);
      });
    });
  }
}

function renderFwGeneralInfoTab(config, record, profile) {
  const dateFieldLabels = new Set(MODULES[config.modulesKey].dateKeys);
  const cells = config.generalInfoFields
    .map((label) => {
      const val = record.fields[fw_masterField(config, label)];
      const display = dateFieldLabels.has(label) ? fmtDate(val) : val || "—";
      return `<div class="field"><label>${escapeHtml(label)}</label><div style="padding:8px 0;font-size:13.5px;">${escapeHtml(String(display))}</div></div>`;
    })
    .join("");
  const complianceFieldId = MODULES[config.modulesKey].complianceFieldId;
  const complianceHtml = complianceFieldId
    ? `<div class="field" style="margin-top:10px;"><label>Compliance Status (auto)</label>${Components.statusPillFor(record.fields[complianceFieldId])}</div>`
    : "";
  // Optional hook: derived/computed fields a module's postProcess attached
  // to the profile response (compliance summaries, current-SDS status, ...)
  // rendered after the plain fields grid above — see chemical.module.js.
  const derivedHtml = config.generalInfoDerived ? config.generalInfoDerived(profile) : "";
  return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));">${cells}</div>${complianceHtml}${derivedHtml}`;
}

function renderFwHistoryTab(config, profile) {
  const { combine, label } = config.historyTab;
  const items = combine.flatMap(({ subKey, typeLabel, dateKey }) => {
    const st = config.subTables[subKey];
    const records = profile.subTables[subKey] || [];
    return records.map((r) => ({
      type: typeLabel,
      date: r.fields[st.fields[dateKey]],
      ref: r.fields[st.fields[st.primary]],
      status: st.formMeta.selectOptions?.status ? r.fields[st.fields.status] : null,
      subKey,
      id: r.id,
    }));
  }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const isAdmin = Auth.user()?.role === "Admin";
  const actions = isAdmin
    ? `<div class="flex gap-8 flex-wrap" style="justify-content:flex-end;margin-bottom:14px;">
        ${combine.map(({ subKey }) => `<button type="button" class="btn small" data-add-sub="${subKey}">+ Add ${escapeHtml(config.subTables[subKey].title)}</button>`).join("")}
      </div>`
    : "";

  const table = Components.dataTable({
    columns: [{ key: "type", label: "Type" }, { key: "ref", label: "Reference" }, { key: "date", label: "Date" }, { key: "status", label: "Status" }],
    rows: items.map((it) => ({
      dataAttrs: { "data-open-sub": `${it.subKey}:${it.id}` },
      cells: { type: escapeHtml(it.type), ref: escapeHtml(it.ref || "—"), date: fmtDate(it.date), status: it.status ? Components.statusPillFor(it.status) : "—" },
    })),
    emptyLabel: `No ${label.toLowerCase()} yet.`,
  });
  return actions + table;
}

function renderFwProfileSubTable(config, subKey, records, emptyNoun) {
  const st = config.subTables[subKey];
  const isAdmin = Auth.user()?.role === "Admin";
  const actions = isAdmin
    ? `<div class="flex gap-8" style="justify-content:flex-end;margin-bottom:14px;"><button type="button" class="btn small" data-add-sub="${subKey}">+ Add ${escapeHtml(st.title)}</button></div>`
    : "";
  const columns = fw_subTableColumns(config, subKey, { withParent: false });
  const rows = records.map((r) => fw_subTableRow(config, subKey, r, { withParent: false, openOnClick: true }));
  return actions + Components.dataTable({ columns, rows, emptyLabel: `No ${emptyNoun} recorded yet.` });
}

function renderFwPhotosTab(config, record) {
  const files = record.fields[fw_masterField(config, config.photos.fieldKey)] || [];
  const isAdmin = Auth.user()?.role === "Admin";
  const gallery = files.length
    ? `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));">
        ${files.map((f) => `<a href="${f.url}" target="_blank" rel="noopener"><img src="${f.thumbnails?.large?.url || f.url}" alt="${escapeHtml(f.filename)}" style="width:100%;border-radius:var(--radius);border:1px solid var(--border);aspect-ratio:1;object-fit:cover;" /></a>`).join("")}
      </div>`
    : Components.emptyState("No photos uploaded yet.");
  const upload = isAdmin
    ? `<div style="margin-bottom:14px;"><label class="btn small">+ Upload Photo<input type="file" accept="image/*" style="display:none" data-photo-upload /></label></div>`
    : "";
  return upload + gallery;
}

function bindFwPhotoUpload(config, panelEl, recordId) {
  const input = panelEl.querySelector("[data-photo-upload]");
  if (!input) return;
  input.addEventListener("change", async () => {
    if (!input.files[0]) return;
    try {
      toast("Uploading…");
      await config._services.master.upload(recordId, config.photos.uploadKey, input.files[0]);
      toast("Photo uploaded.");
      Router.navigate(location.pathname, { replace: true });
    } catch (err) {
      toast(err.message, true);
    }
  });
}

function renderFwAttachmentsTab(config, record) {
  const rows = config.documents.fields
    .map(({ label, key }) => {
      const files = record.fields[fw_masterField(config, key)];
      const chips = (files || []).length
        ? files.map((file) => `<a class="file-chip" href="${file.url}" target="_blank" rel="noopener">\u{1F4CE} ${escapeHtml(file.filename)}</a>`).join("")
        : `<span class="text-dim" style="font-size:12px;">No files uploaded.</span>`;
      return `<div class="record-row"><div><div style="font-weight:600;font-size:13px;">${escapeHtml(label)}</div><div class="meta flex gap-8 flex-wrap" style="margin-top:8px;">${chips}</div></div></div>`;
    })
    .join("");
  const isAdmin = Auth.user()?.role === "Admin";
  return `
    <div class="record-list">${rows}</div>
    ${isAdmin && config.attachmentsNote ? `<p class="text-dim" style="font-size:12px;margin-top:14px;">${config.attachmentsNote}</p>` : ""}`;
}

function renderFwProfileRiskTab(config, records) {
  const ra = config.riskAssessment;
  const rows = (records || []).map((r) => ({
    cells: {
      __primary: escapeHtml(r.fields[ra.fields[ra.primary]] || "—"),
      ...Object.fromEntries(
        (ra.listColumns || []).map((k) => {
          const val = r.fields[ra.fields[k]];
          return [k, ra.dateKeys?.includes(k) ? fmtDate(val) : ra.selectFields?.includes(k) ? Components.statusPillFor(val) : escapeHtml(val || "—")];
        })
      ),
    },
  }));
  return Components.dataTable({
    columns: [{ key: "__primary", label: ra.labels[ra.primary] }, ...(ra.listColumns || []).map((k) => ({ key: k, label: ra.labels[k] }))],
    rows,
    emptyLabel: `No ${ra.label.toLowerCase()} linked yet.`,
  });
}

function renderFwActivityTab(activityRecords) {
  return Components.activityFeed(Components.normalizeActivityRecords(activityRecords), { limit: 25, emptyLabel: "No recorded activity yet." });
}

// ---------------------------------------------------------------------
// Generic sub-record CRUD form — reuses the shared #overlay/#modalBody from
// app.js, exactly like openRecordForm does for master records. One function
// serves every sub-table of every module (parameterized by config + subKey).
// ---------------------------------------------------------------------

function openSubRecordForm(config, subKey, parentId, record) {
  modalTouchesModulePath = config.basePath;
  const st = config.subTables[subKey];
  const meta = st.formMeta;
  const isAdmin = Auth.user()?.role === "Admin";
  modalTitle.textContent = record ? record.fields[st.fields[st.primary]] || st.title : `New ${st.title}`;

  const inputs = Object.entries(meta.labels)
    .map(([key, label]) => {
      const fieldId = st.fields[key];
      const val = record ? record.fields[fieldId] ?? "" : "";
      const options = meta.selectOptions?.[key];
      if (options) {
        return `<div class="field"><label>${label}</label><select data-field="${fieldId}" ${isAdmin ? "" : "disabled"}>
          <option value="">—</option>
          ${options.map((o) => `<option value="${o}" ${val === o ? "selected" : ""}>${o}</option>`).join("")}
        </select></div>`;
      }
      if (meta.textareaKeys.includes(key)) {
        return `<div class="field"><label>${label}</label><textarea data-field="${fieldId}" rows="3" ${isAdmin ? "" : "disabled"}>${escapeHtml(val)}</textarea></div>`;
      }
      const isDate = meta.dateKeys.includes(key);
      const inputType = isDate ? "date" : meta.numberKeys?.includes(key) ? "number" : "text";
      const dateVal = isDate && val ? String(val).slice(0, 10) : val;
      return `<div class="field"><label>${label}</label><input type="${inputType}" ${meta.numberKeys?.includes(key) ? 'step="0.01"' : ""} data-field="${fieldId}" value="${escapeHtml(dateVal)}" ${isAdmin ? "" : "disabled"} /></div>`;
    })
    .join("");

  const attachmentHtml = record
    ? fw_subRecordAttachmentHtml(config, subKey, record, isAdmin)
    : `<p class="text-dim" style="font-size:12.5px;">Save this record first, then you can upload a file.</p>`;

  modalBody.innerHTML = `
    <form id="fwSubRecordForm">
      ${inputs}
      <div class="flex gap-8" style="margin:18px 0;flex-wrap:wrap;">
        ${isAdmin ? `<button type="submit" class="btn primary">Save</button>` : ""}
        ${isAdmin && record ? `<button type="button" class="btn danger" id="fwSubDeleteBtn">Delete</button>` : ""}
        <button type="button" class="btn ghost" id="fwSubBackBtn">Close</button>
      </div>
    </form>
    <div class="section-head" style="margin-top:8px;"><h2 style="font-size:14px;">${escapeHtml(meta.attachmentLabel)}</h2></div>
    <div class="record-list">${attachmentHtml}</div>
  `;

  document.getElementById("fwSubBackBtn").addEventListener("click", closeModal);

  if (isAdmin) {
    document.getElementById("fwSubRecordForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fields = {};
      modalBody.querySelectorAll("[data-field]").forEach((el) => {
        if (el.value !== "") fields[el.dataset.field] = el.value;
      });
      try {
        const service = config._services.sub[subKey];
        if (record) {
          await service.update(record.id, fields);
          toast("Saved.");
        } else {
          fields[st.fields[st.parentFieldKey]] = [parentId];
          record = await service.create(fields);
          toast("Created.");
          openSubRecordForm(config, subKey, parentId, record);
          return;
        }
        closeModal();
      } catch (err) {
        toast(err.message, true);
      }
    });

    const delBtn = document.getElementById("fwSubDeleteBtn");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        if (!confirm("Delete this record? This cannot be undone.")) return;
        try {
          await config._services.sub[subKey].remove(record.id);
          toast("Deleted.");
          closeModal();
        } catch (err) {
          toast(err.message, true);
        }
      });
    }
  }

  overlay.classList.add("open");
}

function fw_subRecordAttachmentHtml(config, subKey, record, isAdmin) {
  const st = config.subTables[subKey];
  const fieldId = st.fields[st.formMeta.attachmentKey];
  const files = record.fields[fieldId] || [];
  const chips = files.length
    ? files.map((f) => `<a class="file-chip" href="${f.url}" target="_blank" rel="noopener">\u{1F4CE} ${escapeHtml(f.filename)}</a>`).join("")
    : `<span class="text-dim" style="font-size:12px;">No files uploaded.</span>`;
  return `
    <div class="record-row">
      <div><div class="meta flex gap-8 flex-wrap">${chips}</div></div>
      ${isAdmin ? `<div class="actions"><label class="btn small">Upload<input type="file" style="display:none" data-fw-sub-upload="${config.key}:${subKey}:${record.id}:${st.formMeta.attachmentKey}" /></label></div>` : ""}
    </div>`;
}

// ---------------------------------------------------------------------
// Global delegated listeners — one set for every module, keyed off the
// module's short `key` embedded in the data attribute (see MODULE_REGISTRY).
// ---------------------------------------------------------------------

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-quick-add]");
  if (!btn) return;
  const config = MODULE_REGISTRY[btn.dataset.quickAdd];
  if (config) fw_triggerAdd(config);
});

document.addEventListener("change", async (e) => {
  const input = e.target.closest("input[data-fw-sub-upload]");
  if (!input || !input.files[0]) return;
  const [moduleKey, subKey, recordId, attachmentKey] = input.dataset.fwSubUpload.split(":");
  const config = MODULE_REGISTRY[moduleKey];
  if (!config) return;
  try {
    toast("Uploading…");
    await config._services.sub[subKey].upload(recordId, attachmentKey, input.files[0]);
    toast("File uploaded.");
    closeModal();
  } catch (err) {
    toast(err.message, true);
  }
});
