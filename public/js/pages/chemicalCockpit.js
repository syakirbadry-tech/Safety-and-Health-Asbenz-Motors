// Master-Detail Cockpit (v2.0) — an ADDITIONAL interface, not a replacement
// for the existing Chemical Profile page. Left: Chemical Register (reuses
// the same /chemicals/reports/register-data endpoint and search box as the
// Register page's filter toolbar). Right: a read-only, collapsible Overview
// built from Components.mountAccordion over the same GET /:id/profile
// response the full Chemical Profile page uses (public/js/framework/
// moduleFramework.js) — one aggregated fetch per chemical selection (this
// codebase's established pattern, see server/lib/profileAggregation.js's own
// rationale for why it fetches once rather than per-section), with each
// accordion section's HTML deferred until first expanded. No page reload
// when switching chemicals; a button opens the existing full Profile page.

Router.register("/chemical/cockpit", async (params, path, isCurrent) => {
  const view = document.getElementById("view");
  view.innerHTML = `
    ${Components.breadcrumb([
      { label: "Dashboard", href: "/" },
      { label: "Chemical Management", href: "/chemical" },
      { label: "Master-Detail Cockpit" },
    ])}
    <div class="page-head">
      <h1>Chemical Master-Detail Cockpit</h1>
      <p>Select a chemical on the left to review everything about it on the right — read-only, no page reload. Use "Open Full Chemical Profile" to edit.</p>
    </div>
    <div class="field" style="max-width:340px;"><input type="text" id="cockpitSearch" placeholder="Search product name, CAS number…" /></div>
    <div class="cockpit-layout" style="margin-top:14px;">
      <div class="cockpit-list" id="cockpitList"><div class="page-loading">Loading…</div></div>
      <div class="cockpit-overview" id="cockpitOverview">
        <div class="empty-state">Select a chemical to view its overview.</div>
      </div>
    </div>
  `;

  let rows = [];
  let selectedId = null;

  try {
    const data = await api("/chemicals/reports/register-data");
    if (!isCurrent()) return;
    rows = data.rows || [];
    renderList(rows);
  } catch (err) {
    if (!isCurrent()) return;
    console.error(err);
    document.getElementById("cockpitList").innerHTML = Components.emptyState("Could not load the chemical register.");
    return;
  }

  document.getElementById("cockpitSearch").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    renderList(rows.filter((r) => `${r.productName} ${r.casNumber}`.toLowerCase().includes(term)));
  });

  function renderList(list) {
    const listEl = document.getElementById("cockpitList");
    if (!list.length) {
      listEl.innerHTML = Components.emptyState("No chemicals match.");
      return;
    }
    listEl.innerHTML = list.map((r) => `
      <div class="cockpit-list-item${r.id === selectedId ? " active" : ""}" data-cockpit-select="${r.id}">
        <div><strong>${escapeHtml(r.productName || "—")}</strong></div>
        <div class="meta">${escapeHtml(r.storageLocation || "—")}${r.casNumber ? ` · CAS ${escapeHtml(r.casNumber)}` : ""}</div>
      </div>`).join("");
    listEl.querySelectorAll("[data-cockpit-select]").forEach((el) => {
      el.addEventListener("click", () => selectChemical(el.dataset.cockpitSelect, list));
    });
  }

  async function selectChemical(id, list) {
    selectedId = id;
    renderList(list);
    const overviewEl = document.getElementById("cockpitOverview");
    overviewEl.innerHTML = `<div class="page-loading">Loading…</div>`;
    try {
      const profile = await api(`/chemicals/${id}/profile`);
      if (!isCurrent()) return;
      overviewEl.innerHTML = `
        <div class="flex gap-8" style="justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h2 style="font-size:15px;margin:0;">${escapeHtml(profile.master.fields[MODULES.chemicals.fields["Product Name"]] || "—")}</h2>
          <button type="button" class="btn small" data-navigate="/chemical/${id}">Open Full Chemical Profile →</button>
        </div>
        <div id="cockpitAccordion"></div>
      `;
      Components.mountAccordion(document.getElementById("cockpitAccordion"), {
        sections: cockpitSections(profile),
      });
    } catch (err) {
      if (!isCurrent()) return;
      console.error(err);
      overviewEl.innerHTML = Components.emptyState("Could not load this chemical's overview.");
    }
  }
});

function cockpitReadOnlySubTable(subKey, records, emptyNoun) {
  const st = CHEMICAL_MODULE.subTables[subKey];
  const columns = [
    { key: "__primary", label: st.formMeta.labels[st.primary] },
    ...(st.listColumns || []).map((entry) => {
      const key = typeof entry === "string" ? entry : entry.key;
      return { key, label: st.formMeta.labels[key] };
    }),
  ];
  const rows = records.map((r) => {
    const cells = { __primary: escapeHtml(r.fields[st.fields[st.primary]] || "—") };
    (st.listColumns || []).forEach((entry) => {
      const key = typeof entry === "string" ? entry : entry.key;
      const fieldId = st.fields[key];
      const val = r.fields[fieldId];
      cells[key] = st.formMeta.dateKeys.includes(key)
        ? fmtDate(val)
        : st.formMeta.selectOptions?.[key]
        ? Components.statusPillFor(val)
        : escapeHtml(val || "—");
    });
    return { cells };
  });
  return Components.dataTable({ columns, rows, emptyLabel: `No ${emptyNoun} recorded yet.` });
}

function cockpitSections(profile) {
  const record = profile.master;
  const flagYes = (key) => record.fields[MODULES.chemicals.fields[key]] === "Yes";

  const sections = [
    { key: "general", label: "General Information", defaultOpen: true, render: () => renderCockpitGeneralInfo(record, profile) },
    { key: "sds", label: "SDS", render: () => cockpitReadOnlySubTable("sdsDocuments", profile.subTables.sdsDocuments, "SDS revisions") },
    { key: "substances", label: "Substances", render: () => cockpitReadOnlySubTable("substances", profile.subTables.substances, "substances") },
    { key: "storage", label: "Storage", render: () => renderCockpitStorage(record, profile) },
    { key: "label", label: "Label Inspection", render: () => cockpitReadOnlySubTable("labelInspection", profile.subTables.labelInspection, "label inspections") },
    { key: "waste", label: "Waste Management", render: () => cockpitReadOnlySubTable("wasteManagement", profile.subTables.wasteManagement, "waste disposal records") },
    { key: "training", label: "Training", render: () => cockpitReadOnlySubTable("training", profile.subTables.training, "training records") },
    // renderFwAggregatedDocumentsTab is a plain top-level function in
    // moduleFramework.js — reused directly, every classic <script> in this
    // app shares one global scope (see ARCHITECTURE.md §3.1), same as
    // CHEMICAL_MODULE/MODULES/Components are shared across page files.
    { key: "documents", label: "Documents", render: () => renderFwAggregatedDocumentsTab(profile.documents || []) },
    { key: "chra", label: "CHRA (Risk Assessment)", render: () => cockpitReadOnlyChra(profile.subTables.chra) },
  ];

  if (flagYes("Exposure Monitoring Required")) {
    sections.push({ key: "exposure", label: "Exposure Monitoring", render: () => cockpitReadOnlySubTable("exposureMonitoring", profile.subTables.exposureMonitoring, "exposure monitoring records") });
  }
  ["LEV", "Biological Monitoring", "Health Surveillance"].forEach((name) => {
    if (flagYes(`${name} Required`)) sections.push({ key: name.toLowerCase().replace(/\s/g, ""), label: name, render: () => conditionalModulePlaceholder(name) });
  });

  return sections;
}

function renderCockpitGeneralInfo(record, profile) {
  const fields = CHEMICAL_MODULE.generalInfoFields
    .map((label) => {
      const val = record.fields[MODULES.chemicals.fields[label]];
      return `<div class="field"><label>${escapeHtml(label)}</label><div style="padding:6px 0;font-size:13px;">${escapeHtml(String(val || "—"))}</div></div>`;
    })
    .join("");
  return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));">${fields}</div>${CHEMICAL_MODULE_renderGeneralInfoDerived(profile)}`;
}

function renderCockpitStorage(record, profile) {
  const st = CHEMICAL_MODULE.subTables.storageInspection;
  const header = st.profileHeaderFields
    .map((label) => `<div class="field"><label>${escapeHtml(label)}</label><div style="padding:6px 0;font-size:13px;">${escapeHtml(String(record.fields[MODULES.chemicals.fields[label]] || "—"))}</div></div>`)
    .join("");
  return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));">${header}</div>` + cockpitReadOnlySubTable("storageInspection", profile.subTables.storageInspection, "storage inspections");
}

function cockpitReadOnlyChra(records) {
  const ra = CHEMICAL_MODULE.riskAssessment;
  const rows = (records || []).map((r) => ({
    cells: {
      __primary: escapeHtml(r.fields[ra.fields[ra.primary]] || "—"),
      ...Object.fromEntries((ra.listColumns || []).map((k) => {
        const val = r.fields[ra.fields[k]];
        return [k, ra.dateKeys?.includes(k) ? fmtDate(val) : ra.selectFields?.includes(k) ? Components.statusPillFor(val) : escapeHtml(val || "—")];
      })),
    },
  }));
  return Components.dataTable({
    columns: [{ key: "__primary", label: ra.labels[ra.primary] }, ...(ra.listColumns || []).map((k) => ({ key: k, label: ra.labels[k] }))],
    rows,
    emptyLabel: "No CHRA linked yet.",
  });
}
