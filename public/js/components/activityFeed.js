// Renders a list of already-normalized activity entries:
// { timestamp, action, module, recordRef, details }
// Callers normalize from whatever shape their endpoint returns (raw Airtable
// records vs. the admin API's flattened rows) — keeps this component decoupled
// from Airtable's field-ID shape. Reused by the top-level Dashboard
// (cross-module) and the Machine Profile's Activity Timeline tab.
const Components = window.Components || {};

Components.activityFeed = (items, { limit = 12, emptyLabel = "No activity yet." } = {}) => {
  if (!items.length) return Components.emptyState(emptyLabel);
  const sorted = [...items].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  const rows = sorted.slice(0, limit).map((item) => `
    <div class="activity-item">
      <div class="dot"></div>
      <div class="body">
        <div><strong>${escapeHtml(item.action || "Activity")}</strong>${item.module ? ` · ${escapeHtml(item.module)}` : ""}${item.recordRef ? ` · ${escapeHtml(item.recordRef)}` : ""}</div>
        ${item.details ? `<div class="text-dim">${escapeHtml(item.details)}</div>` : ""}
        <div class="when">${fmtDateTime(item.timestamp)}</div>
      </div>
    </div>`);
  return `<div class="record-list">${rows.join("")}</div>`;
};

// Normalizes raw Airtable Activity Log records (record.fields keyed by
// field ID) into the shape activityFeed() expects.
Components.normalizeActivityRecords = (records) => {
  const f = MODULES_SCHEMA.activityLog.fields;
  return records.map((r) => ({
    timestamp: r.fields[f.timestamp],
    action: r.fields[f.action],
    module: r.fields[f.module],
    recordRef: r.fields[f.recordRef],
    details: r.fields[f.details],
  }));
};

window.Components = Components;
