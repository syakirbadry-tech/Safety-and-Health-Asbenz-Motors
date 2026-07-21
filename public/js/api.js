// Shared fetch helper: attaches the session token, redirects to login on 401.
const Auth = {
  token: () => localStorage.getItem("osh_token"),
  user: () => JSON.parse(localStorage.getItem("osh_user") || "null"),
  setSession(token, user) {
    localStorage.setItem("osh_token", token);
    localStorage.setItem("osh_user", JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem("osh_token");
    localStorage.removeItem("osh_user");
  },
  requireLogin() {
    if (!Auth.token()) window.location.href = "/login.html";
  },
  requireAdmin() {
    const u = Auth.user();
    if (!u || u.role !== "Admin") window.location.href = "/index.html";
  },
};

async function api(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = Auth.token();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isForm && body) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  // Only treat a 401 as "your session died" if we actually had a token —
  // otherwise this fires on plain wrong-password login attempts (no token
  // yet) and would wipe out the real error message before the login form
  // ever gets to show it.
  if (res.status === 401 && token) {
    Auth.clear();
    window.location.href = "/login.html";
    throw new Error("Session expired");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function toast(message, isError = false) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.className = "show" + (isError ? " err" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.className = ""), 3200);
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function fmtDateTime(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d;
  }
}

function daysUntil(d) {
  if (!d) return null;
  const diff = (new Date(d) - new Date()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

function statusBadge(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return '<span class="badge neutral">NO DATE</span>';
  if (days < 0) return '<span class="badge bad">EXPIRED</span>';
  if (days <= 30) return '<span class="badge warn">DUE SOON</span>';
  return '<span class="badge ok">VALID</span>';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
