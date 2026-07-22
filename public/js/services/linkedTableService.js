// Generic CRUD service factory for any module sub-table built on the
// server's buildModuleRouter pattern (list/get/create/update/delete/upload).
// One factory call replaces a hand-written service per table — reused by
// every Machinery sub-table now, and by Noise/Chemical/Operational Safety
// sub-tables in later milestones.
function makeLinkedTableService(apiBase) {
  return {
    list: () => api(apiBase).then((d) => d.records),
    get: (id) => api(`${apiBase}/${id}`).then((d) => d.record),
    create: (fields) => api(apiBase, { method: "POST", body: { fields } }).then((d) => d.record),
    update: (id, fields) => api(`${apiBase}/${id}`, { method: "PATCH", body: { fields } }).then((d) => d.record),
    remove: (id) => api(`${apiBase}/${id}`, { method: "DELETE" }),
    // Only meaningful for a module's master table (the ones with a
    // GET /:id/profile route built from server/lib/profileAggregation.js) —
    // harmless to have on every service, since it's simply unused otherwise.
    getProfile: (id) => api(`${apiBase}/${id}/profile`),
    upload: (id, fieldKey, file) => {
      const fd = new FormData();
      fd.append("file", file);
      return api(`${apiBase}/${id}/upload/${fieldKey}`, { method: "POST", body: fd, isForm: true });
    },
  };
}
