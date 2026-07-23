// Collapsible, lazy-loaded accordion — sibling to mountTabs (components/tabs.js)
// but every section can be open at once instead of exclusively one at a
// time, which is what a "expand only what you need" read-only overview
// (Chemical Management's Master-Detail Cockpit) needs instead of tabs.
// sections: [{ key, label, render: () => string|Promise<string>, defaultOpen? }]
// render() is called once per section, the first time it's expanded, and
// cached — same lazy-loading contract as mountTabs.
// var, not const/let — see the comment in components/cards.js.
var Components = window.Components || {};

Components.mountAccordion = (container, { sections }) => {
  const cache = {};

  container.innerHTML = `
    <div class="accordion">
      ${sections.map((s) => `
        <div class="accordion-section" data-section-key="${s.key}">
          <button type="button" class="accordion-header" data-accordion-toggle="${s.key}">
            <span>${escapeHtml(s.label)}</span>
            <span class="accordion-caret">▾</span>
          </button>
          <div class="accordion-body" data-accordion-body="${s.key}" hidden></div>
        </div>`).join("")}
    </div>`;

  async function toggle(key) {
    const section = container.querySelector(`[data-section-key="${key}"]`);
    const body = container.querySelector(`[data-accordion-body="${key}"]`);
    const isOpen = section.classList.toggle("open");
    body.hidden = !isOpen;
    if (isOpen && cache[key] === undefined) {
      body.innerHTML = `<div class="page-loading">Loading…</div>`;
      const def = sections.find((s) => s.key === key);
      cache[key] = await def.render();
      body.innerHTML = cache[key];
      if (def.afterRender) def.afterRender(body);
    }
  }

  container.querySelectorAll("[data-accordion-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => toggle(btn.dataset.accordionToggle));
  });

  const defaultOpenKeys = sections.filter((s) => s.defaultOpen).map((s) => s.key);
  defaultOpenKeys.forEach(toggle);

  return {
    invalidate(key) {
      if (key) delete cache[key];
      else Object.keys(cache).forEach((k) => delete cache[k]);
    },
  };
};

window.Components = Components;
