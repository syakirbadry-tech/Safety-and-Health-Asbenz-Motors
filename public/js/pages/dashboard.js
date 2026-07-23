// Top-level Dashboard — redesigned around business functions instead of
// raw document tables. Registered against "/" and rendered by router.js.
Router.register("/", async () => {
  const view = document.getElementById("view");
  const me = Auth.user();
  const isAdmin = me?.role === "Admin";
  const first = (me?.fullName || "there").split(" ")[0];
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";

  view.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">Occupational Safety &amp; Health Committee</div>
      <h1>Good ${part}, ${escapeHtml(first)} \u{1F44B}</h1>
      <p>Asbenz Motors EHS platform, organized around business functions: Machinery, Chemical Management, Noise Management and Operational Safety.</p>
      <span class="snapshot">Live data · ${new Date().toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}</span>
    </div>
    ${Components.sectionHead("Modules", "Tap a tile to open its dashboard")}
    <div class="grid" id="businessGrid"></div>
    ${Components.sectionHead("Compliance Overview", "Machinery")}
    <div id="dashboardKpis"><div class="page-loading">Loading…</div></div>
    ${Components.sectionHead("Compliance Overview", "Chemical Management")}
    <div id="dashboardKpisChemical"><div class="page-loading">Loading…</div></div>
    ${Components.sectionHead("Corrective Actions (CAPA)")}
    <div id="dashboardKpisActions"><div class="page-loading">Loading…</div></div>
    ${Components.sectionHead("OSH Committee")}
    <div id="dashboardKpisCommittee"><div class="page-loading">Loading…</div></div>
    <div class="section-head" style="margin-top:34px;"><h2>Open Corrective Actions</h2></div>
    <div id="dashboardOpenActions"><div class="page-loading">Loading…</div></div>
    <div class="section-head" style="margin-top:34px;"><h2>Recent Activity</h2></div>
    <div id="dashboardActivity"><div class="page-loading">Loading…</div></div>
  `;

  document.getElementById("businessGrid").innerHTML = BUSINESS_MODULES.map(
    (m) => `
    <div class="tile" data-navigate="${m.route}">
      <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none">${ICONS[m.icon]}</svg></div>
      <div><h3>${escapeHtml(m.title)}</h3><p>${escapeHtml(m.desc)}</p></div>
      <div class="tile-footer">
        <span class="text-dim">${m.ready ? "Full dashboard" : "Classic list · upgrade in progress"}</span>
        ${m.ready ? '<span class="badge ok">READY</span>' : '<span class="badge neutral">IN PROGRESS</span>'}
      </div>
    </div>`
  ).join("");

  const kpiEl = document.getElementById("dashboardKpis");
  try {
    const machinerySvc = MACHINERY_MODULE._services;
    const [machines, cf, cm, pm] = await Promise.all([
      machinerySvc.master.list(),
      machinerySvc.sub.cf.list(),
      machinerySvc.sub.cm.list(),
      machinerySvc.sub.pm.list(),
    ]);
    const cfF = MACHINERY_MODULE.subTables.cf.fields;
    const cmF = MACHINERY_MODULE.subTables.cm.fields;
    const expiringCf = cf.filter((r) => {
      const d = daysUntil(r.fields[cfF.expiryDate]);
      return d !== null && d <= 30;
    }).length;
    const openCm = cm.filter((r) => r.fields[cmF.status] !== "Resolved").length;

    kpiEl.innerHTML = Components.kpiRow([
      { label: "Registered Machines", value: machines.length, tone: "neutral", navigate: "/machinery/register" },
      { label: "CF Expiring/Expired (30d)", value: expiringCf, tone: expiringCf ? "warn" : "ok", navigate: "/machinery/register" },
      { label: "Open Corrective Maintenance", value: openCm, tone: openCm ? "bad" : "ok", navigate: "/machinery/register" },
      { label: "Preventive Maintenance Logged", value: pm.length, tone: "neutral", navigate: "/machinery/register" },
    ]);
  } catch (err) {
    console.error(err);
    kpiEl.innerHTML = Components.emptyState("Could not load the compliance overview.");
  }

  // Chemical Management — same hand-rolled per-module fetch shape as
  // Machinery above; a shared cross-module KPI abstraction isn't worth
  // building until a third module needs the exact same shape again.
  const chemKpiEl = document.getElementById("dashboardKpisChemical");
  try {
    const chemSvc = CHEMICAL_MODULE._services;
    const [chemicals, sdsDocs, storageInsp] = await Promise.all([
      chemSvc.master.list(),
      chemSvc.sub.sdsDocuments.list(),
      chemSvc.sub.storageInspection.list(),
    ]);
    const sdsF = CHEMICAL_MODULE.subTables.sdsDocuments.fields;
    const storageF = CHEMICAL_MODULE.subTables.storageInspection.fields;
    const expiredSds = sdsDocs.filter(
      (r) => r.fields[sdsF.status] === "Current" && clientSdsExpiryStatus(r.fields[sdsF.expiryDate]) === "Expired"
    ).length;
    const storageDue = storageInsp.filter((r) => {
      const d = daysUntil(r.fields[storageF.nextDue]);
      return d !== null && d <= 30;
    }).length;

    chemKpiEl.innerHTML = Components.kpiRow([
      { label: "Registered Chemicals", value: chemicals.length, tone: "neutral", navigate: "/chemical/register" },
      { label: "Expired SDS", value: expiredSds, tone: expiredSds ? "bad" : "ok", navigate: "/chemical/register" },
      { label: "Storage Inspections Due (30d)", value: storageDue, tone: storageDue ? "warn" : "ok", navigate: "/chemical/register" },
    ]);
  } catch (err) {
    console.error(err);
    chemKpiEl.innerHTML = Components.emptyState("Could not load the Chemical Management overview.");
  }

  // Corrective Actions/CAPA — also feeds the "Open Corrective Actions"
  // mini-table below, so the record list is fetched once and reused.
  const actionsKpiEl = document.getElementById("dashboardKpisActions");
  const openActionsEl = document.getElementById("dashboardOpenActions");
  let actionRecords = [];
  try {
    actionRecords = await ACTION_MODULE._services.master.list();
    const F = MODULES.actions.fields;
    const open = actionRecords.filter((r) => !["Completed", "Cancelled"].includes(r.fields[F.Status]));
    const overdue = open.filter((r) => {
      const due = r.fields[F["Due Date"]];
      return due && new Date(due) < new Date();
    });
    const capaOpen = open.filter((r) => ["Corrective", "Preventive"].includes(r.fields[F["Action Type"]]));

    actionsKpiEl.innerHTML = Components.kpiRow([
      { label: "Open Actions", value: open.length, tone: open.length ? "warn" : "ok", navigate: "/capa/register" },
      { label: "Overdue Actions", value: overdue.length, tone: overdue.length ? "bad" : "ok", navigate: "/capa/register" },
      { label: "CAPA Open", value: capaOpen.length, tone: capaOpen.length ? "warn" : "ok", navigate: "/capa/register" },
    ]);

    const topOverdue = overdue
      .slice()
      .sort((a, b) => new Date(a.fields[F["Due Date"]]) - new Date(b.fields[F["Due Date"]]))
      .slice(0, 5);
    if (!topOverdue.length) {
      openActionsEl.innerHTML = Components.emptyState("No overdue actions — nice work.");
    } else {
      openActionsEl.innerHTML = Components.dataTable({
        columns: [
          { key: "title", label: "Title" },
          { key: "type", label: "Type" },
          { key: "priority", label: "Priority" },
          { key: "assignedTo", label: "Assigned To" },
          { key: "source", label: "Source" },
          { key: "due", label: "Due Date" },
        ],
        rows: topOverdue.map((r) => ({
          navigate: `/capa/${r.id}`,
          cells: {
            title: `<strong>${escapeHtml(r.fields[F.Title] || "—")}</strong>`,
            type: escapeHtml(r.fields[F["Action Type"]] || "—"),
            priority: Components.statusPillFor(r.fields[F.Priority]),
            assignedTo: escapeHtml(r.fields[F["Assigned To"]] || "—"),
            source: escapeHtml(r.fields[F["Source Module"]] || "—"),
            due: fmtDate(r.fields[F["Due Date"]]),
          },
        })),
        emptyLabel: "No overdue actions.",
      });
    }
  } catch (err) {
    console.error(err);
    actionsKpiEl.innerHTML = Components.emptyState("Could not load the Corrective Actions overview.");
    openActionsEl.innerHTML = Components.emptyState("Could not load open actions.");
  }

  // OSH Committee — membership count + soonest upcoming scheduled meeting.
  const committeeKpiEl = document.getElementById("dashboardKpisCommittee");
  try {
    const [membersData, meetings] = await Promise.all([
      api("/osh-committee-members"),
      OSH_COMMITTEE_MODULE._services.master.list(),
    ]);
    const memberF = MODULES.oshCommitteeMembers.fields;
    const meetingF = MODULES.oshCommitteeMeetings.fields;
    const activeMembers = (membersData.records || []).filter((r) => r.fields[memberF.Status] === "Active").length;
    const upcoming = meetings
      .filter((r) => r.fields[meetingF.Status] === "Scheduled" && r.fields[meetingF["Meeting Date"]])
      .sort((a, b) => new Date(a.fields[meetingF["Meeting Date"]]) - new Date(b.fields[meetingF["Meeting Date"]]))[0];

    committeeKpiEl.innerHTML = Components.kpiRow([
      { label: "Active Members", value: activeMembers, tone: "neutral", navigate: "/osh-committee/members" },
      { label: "Next Scheduled Meeting", value: upcoming ? fmtDate(upcoming.fields[meetingF["Meeting Date"]]) : "None", tone: upcoming ? "neutral" : "warn", navigate: "/osh-committee/register" },
    ]);
  } catch (err) {
    console.error(err);
    committeeKpiEl.innerHTML = Components.emptyState("Could not load the OSH Committee overview.");
  }

  const activityEl = document.getElementById("dashboardActivity");
  if (!isAdmin) {
    activityEl.innerHTML = Components.emptyState("Activity history is visible to Admins in the Admin panel.");
  } else {
    try {
      const data = await api("/admin/activity");
      activityEl.innerHTML = Components.activityFeed(data.activity, { limit: 10 });
    } catch (err) {
      console.error(err);
      activityEl.innerHTML = Components.emptyState("Could not load recent activity.");
    }
  }
});

// Chemical Management, Noise Management, Operational Safety don't have their
// own module dashboard yet (next milestones per PROJECT_ROADMAP.md). Their
// tiles route here instead of a raw table, and still work fully — they open
// the same classic record list/form the app has always used for CHRA/HRA/
// HIRARC/SOP — so nothing already working is lost while the rebuild is staged.
function registerPlaceholderModuleRoute(businessModule) {
  Router.register(businessModule.route, async () => {
    const view = document.getElementById("view");
    view.innerHTML = `
      ${Components.breadcrumb([{ label: "Dashboard", href: "/" }, { label: businessModule.title }])}
      <div class="page-head">
        <div class="eyebrow">Business Function</div>
        <h1>${escapeHtml(businessModule.title)}</h1>
        <p>${escapeHtml(businessModule.desc)}</p>
      </div>
      ${Components.moduleBanner(
        `The full ${escapeHtml(businessModule.title)} dashboard (register, profile pages, reports) ships in an upcoming milestone — see PROJECT_ROADMAP.md. For now, use the classic record list below, exactly as before.`
      )}
      ${Components.sectionHead("Classic record lists")}
      <div class="grid" id="legacyGrid"></div>
    `;
    const grid = document.getElementById("legacyGrid");
    grid.innerHTML = businessModule.legacyKeys
      .map((key) => {
        const mod = MODULES[key];
        return `
        <div class="tile" data-legacy-key="${key}">
          <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none">${ICONS[mod.icon]}</svg></div>
          <div><h3>${escapeHtml(mod.title)}</h3><p>${escapeHtml(mod.desc)}</p></div>
        </div>`;
      })
      .join("");
    grid.querySelectorAll("[data-legacy-key]").forEach((el) => {
      el.addEventListener("click", async () => {
        await ensureLegacyLoaded(el.dataset.legacyKey);
        openModuleList(el.dataset.legacyKey);
      });
    });
  });
}

BUSINESS_MODULES.filter((m) => !m.ready).forEach(registerPlaceholderModuleRoute);
