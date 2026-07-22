// Interactive tab panel. Unlike the other pure-string components, this one
// mounts directly into a container because it owns click-handling and lazy
// per-tab rendering (each tab's `render` can be async — e.g. fetch-on-open).
// tabs: [{ key, label, render: () => string|Promise<string>, afterRender?: (panelEl) => void }]
// render() is called once (result cached); afterRender runs after every
// show() — including cache hits — so a tab can rebind listeners each time
// its content is displayed (e.g. an "+ Add" button wired to fresh DOM).
// onChange(key) fires whenever a tab is shown (including the initial one) —
// lets a page remember which tab was active across a full re-render (e.g.
// after a save forces the page to refetch and rebuild from scratch).
const Components = window.Components || {};

Components.mountTabs = (container, { tabs, initialKey, onChange }) => {
  const panelCache = {};
  let activeKey = initialKey || tabs[0]?.key;

  container.innerHTML = `
    <div class="tabs" role="tablist">
      ${tabs.map((t) => `<button type="button" class="tab" data-tab-key="${t.key}">${escapeHtml(t.label)}</button>`).join("")}
    </div>
    <div class="tab-panel"></div>`;

  const panelEl = container.querySelector(".tab-panel");

  async function show(key) {
    activeKey = key;
    container.querySelectorAll(".tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.tabKey === key));
    const tab = tabs.find((t) => t.key === key);
    if (!tab) return;
    if (panelCache[key] === undefined) {
      panelEl.innerHTML = `<div class="page-loading">Loading…</div>`;
      panelCache[key] = await tab.render();
    }
    panelEl.innerHTML = panelCache[key];
    if (tab.afterRender) tab.afterRender(panelEl);
    if (onChange) onChange(key);
  }

  container.querySelectorAll("[data-tab-key]").forEach((btn) => {
    btn.addEventListener("click", () => show(btn.dataset.tabKey));
  });

  show(activeKey);

  return {
    invalidate(key) {
      if (key) delete panelCache[key];
      else Object.keys(panelCache).forEach((k) => delete panelCache[k]);
    },
    refresh() {
      delete panelCache[activeKey];
      show(activeKey);
    },
  };
};

window.Components = Components;
