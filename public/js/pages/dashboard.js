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
    ${Components.sectionHead("Compliance Overview")}
    <div id="dashboardKpis"><div class="page-loading">Loading…</div></div>
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
      { label: "Registered Machines", value: machines.length, tone: "neutral" },
      { label: "CF Expiring/Expired (30d)", value: expiringCf, tone: expiringCf ? "warn" : "ok" },
      { label: "Open Corrective Maintenance", value: openCm, tone: openCm ? "bad" : "ok" },
      { label: "Preventive Maintenance Logged", value: pm.length, tone: "neutral" },
    ]);
  } catch (err) {
    console.error(err);
    kpiEl.innerHTML = Components.emptyState("Could not load the compliance overview.");
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
