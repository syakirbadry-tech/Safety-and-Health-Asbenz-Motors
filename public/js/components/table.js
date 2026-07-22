// Reusable data table. Rows navigate via the router's [data-navigate]
// click delegation (see router.js) instead of per-row listeners.
// var, not const/let — see the comment in components/cards.js.
var Components = window.Components || {};

Components.dataTable = ({ columns, rows, emptyLabel = "No records yet." }) => {
  if (!rows.length) return Components.emptyState(emptyLabel);
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows
            .map((row) => {
              const attrs = [];
              if (row.navigate) attrs.push(`class="row-click" data-navigate="${escapeHtml(row.navigate)}"`);
              Object.entries(row.dataAttrs || {}).forEach(([k, v]) => attrs.push(`class="row-click" ${k}="${escapeHtml(v)}"`));
              return `
            <tr${attrs.length ? " " + attrs.join(" ") : ""}>
              ${columns.map((c) => `<td>${row.cells[c.key] ?? "—"}</td>`).join("")}
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
};

window.Components = Components;
