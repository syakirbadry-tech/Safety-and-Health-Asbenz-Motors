// Reusable card/badge primitives shared by every module dashboard.
// Pure functions: data in, HTML string out — no DOM coupling, so they stay
// portable if the rendering layer ever changes.
// var, not const/let: every components/*.js file declares this at top level,
// and classic <script> tags share one global lexical scope — a repeated
// const/let here throws "Identifier 'Components' has already been declared"
// on every file after the first, silently dropping their exports.
var Components = window.Components || {};

const TONE_VAR = { ok: "var(--green)", warn: "var(--amber)", bad: "var(--red)", neutral: "var(--gray)" };

// tabKey: clicking the card switches to that tab within the same mountTabs
// instance (Module Dashboard's Overview/Reports -> its own sub-table tabs).
// navigate: clicking the card routes to a different page/URL entirely (e.g.
// "Registered Chemicals" -> the Chemical Register page). At most one of the
// two makes sense per card; a card with neither stays inert, as before.
Components.kpiCard = ({ label, value, tone = "neutral", tabKey, navigate }) => `
  <div class="stat-card${tabKey || navigate ? " kpi-clickable" : ""}" style="border-color:${TONE_VAR[tone] || TONE_VAR.neutral}"
    ${tabKey ? `data-kpi-tab="${tabKey}"` : ""}${navigate ? ` data-navigate="${navigate}"` : ""}>
    <div class="n">${value}</div>
    <div class="l">${escapeHtml(label)}</div>
  </div>`;

Components.kpiRow = (items) => `<div class="stats">${items.map(Components.kpiCard).join("")}</div>`;

Components.statusPill = (text, tone = "neutral") =>
  `<span class="badge ${tone}">${escapeHtml(text || "—")}</span>`;

// Maps common singleSelect status values used across the new Machinery
// sub-tables (CF/PM/CM/Inspection/Calibration) to a badge tone.
Components.statusPillFor = (value) => {
  const v = (value || "").toLowerCase();
  if (["valid", "completed", "resolved", "pass"].includes(v)) return Components.statusPill(value, "ok");
  if (["expiring soon", "due soon", "scheduled", "conditional pass", "in progress"].includes(v))
    return Components.statusPill(value, "warn");
  if (["expired", "overdue", "open", "fail"].includes(v)) return Components.statusPill(value, "bad");
  return Components.statusPill(value || "—", "neutral");
};

Components.emptyState = (text) => `<div class="empty-state">${escapeHtml(text)}</div>`;

Components.sectionHead = (title, hint = "") => `
  <div class="section-head"><h2>${escapeHtml(title)}</h2>${hint ? `<span class="hint">${escapeHtml(hint)}</span>` : ""}</div>`;

Components.moduleBanner = (text) => `<div class="module-banner">${text}</div>`;

window.Components = Components;
