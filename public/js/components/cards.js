// Reusable card/badge primitives shared by every module dashboard.
// Pure functions: data in, HTML string out — no DOM coupling, so they stay
// portable if the rendering layer ever changes.
const Components = window.Components || {};

const TONE_VAR = { ok: "var(--green)", warn: "var(--amber)", bad: "var(--red)", neutral: "var(--gray)" };

Components.kpiCard = ({ label, value, tone = "neutral" }) => `
  <div class="stat-card" style="border-color:${TONE_VAR[tone] || TONE_VAR.neutral}">
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
