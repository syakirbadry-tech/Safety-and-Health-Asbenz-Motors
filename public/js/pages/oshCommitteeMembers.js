// OSH Committee Members — a flat roster, not a sub-table of any meeting (a
// member attends many meetings; a meeting has many attendees — genuinely
// many-to-many, which the module framework's master/sub-table shape doesn't
// fit). Gets its own real route per MASTER_PROMPT.md's navigation principle
// (every business surface gets a URL, not just a modal), reusing the
// existing openRecordForm modal for add/edit — no new form code.

Router.register("/osh-committee/members", async () => {
  const view = document.getElementById("view");
  const isAdmin = Auth.user()?.role === "Admin";

  view.innerHTML = `
    ${Components.breadcrumb([
      { label: "Dashboard", href: "/" },
      { label: "OSH Committee", href: "/osh-committee" },
      { label: "Committee Members" },
    ])}
    <div class="page-head">
      <h1>OSH Committee Members</h1>
      <p>Who's on the committee, their role and term.</p>
    </div>
    <div class="flex gap-8" style="justify-content:flex-end;margin-bottom:14px;" id="membersActions"></div>
    <div id="membersTable"><div class="page-loading">Loading…</div></div>
  `;

  if (isAdmin) {
    document.getElementById("membersActions").innerHTML = `<button class="btn primary small" id="addMemberBtn">+ Add Member</button>`;
    document.getElementById("addMemberBtn").addEventListener("click", () => openMember(null));
  }

  let records = [];
  try {
    const data = await api("/osh-committee-members");
    records = data.records || [];
    renderMembersTable(records);
  } catch (err) {
    console.error(err);
    document.getElementById("membersTable").innerHTML = Components.emptyState("Could not load committee members.");
  }

  function renderMembersTable(list) {
    const F = MODULES.oshCommitteeMembers.fields;
    const rows = list.map((r) => ({
      dataAttrs: { "data-member-id": r.id },
      cells: {
        name: `<strong>${escapeHtml(r.fields[F["Member Name"]] || "—")}</strong>`,
        position: Components.statusPillFor(r.fields[F.Position]),
        department: escapeHtml(r.fields[F.Department] || "—"),
        term: `${fmtDate(r.fields[F["Term Start"]])} – ${fmtDate(r.fields[F["Term End"]]) || "—"}`,
        status: Components.statusPillFor(r.fields[F.Status]),
      },
    }));
    document.getElementById("membersTable").innerHTML = Components.dataTable({
      columns: [
        { key: "name", label: "Member Name" },
        { key: "position", label: "Position" },
        { key: "department", label: "Department" },
        { key: "term", label: "Term" },
        { key: "status", label: "Status" },
      ],
      rows,
      emptyLabel: "No committee members registered yet.",
    });
    document.getElementById("membersTable").querySelectorAll("[data-member-id]").forEach((row) => {
      row.addEventListener("click", () => openMember(records.find((r) => r.id === row.dataset.memberId)));
    });
  }

  function openMember(record) {
    openRecordForm("oshCommitteeMembers", record);
    // openRecordForm only recognizes module-framework base paths (see
    // FRAMEWORK_MODULE_BASE_PATHS in moduleFramework.js); this page is a
    // small bespoke register, not a framework module, so it isn't in that
    // map. Setting modalTouchesModulePath here reuses the exact same
    // generic closeModal() refresh mechanism every framework module relies
    // on, instead of inventing a second one.
    modalTouchesModulePath = "/osh-committee/members";
  }
});
