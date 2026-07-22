// items: [{label, href}, ...] — the last item renders as plain (current) text.
// var, not const/let — see the comment in components/cards.js.
var Components = window.Components || {};

Components.breadcrumb = (items) => {
  const parts = items.map((item, i) => {
    const isLast = i === items.length - 1;
    if (isLast || !item.href) return `<span class="current">${escapeHtml(item.label)}</span>`;
    return `<a data-navigate="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`;
  });
  return `<div class="breadcrumb">${parts.join('<span class="sep">/</span>')}</div>`;
};

window.Components = Components;
