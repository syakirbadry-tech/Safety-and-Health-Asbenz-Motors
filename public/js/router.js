// Tiny History-API router for the app shell. No framework, no build step —
// registers path patterns ("/machinery/:id") against render functions and
// swaps the content of #view. The Express catch-all already serves
// index.html for every path, so deep links and refreshes work unchanged.
const Router = (() => {
  const routes = [];
  let viewEl = null;
  // Bumped on every render() call (direct load, click-nav, popstate — every
  // path). A route's render function receives isCurrent(), a closure over
  // the token it was handed; once a newer navigation bumps this counter,
  // isCurrent() permanently returns false for the abandoned render. Promises
  // can't be cancelled, so a slow-resolving fetch from a page the user has
  // already left will still finish — this lets both the abandoned render's
  // own code and the router's error handler recognize that and bail instead
  // of writing stale content (or a stale error) over whatever is on screen
  // now. Without this, an in-flight render from a page the user navigated
  // away from can complete (or throw) later and clobber the current page.
  let navGeneration = 0;

  function compile(pattern) {
    const keys = [];
    const src = pattern
      .split("/")
      .map((seg) => {
        if (seg.startsWith(":")) {
          keys.push(seg.slice(1));
          return "([^/]+)";
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    return { regex: new RegExp(`^${src}$`), keys };
  }

  function register(pattern, render) {
    const { regex, keys } = compile(pattern);
    routes.push({ pattern, regex, keys, render });
  }

  // Static routes ("/machinery/register") must win over dynamic ones at the
  // same depth ("/machinery/:id") regardless of registration order — e.g.
  // pages/machineryRegister.js happens to load before pages/machineryProfile.js
  // today, but correctness shouldn't depend on <script> tag order. Sorting by
  // fewest params (ties broken by original registration order, since Array.sort
  // is stable) makes every static route take priority over a same-shape
  // dynamic one, however routes end up registered.
  function orderedRoutes() {
    return [...routes].sort((a, b) => a.keys.length - b.keys.length);
  }

  function match(path) {
    for (const route of orderedRoutes()) {
      const m = route.regex.exec(path);
      if (m) {
        const params = {};
        route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        return { route, params };
      }
    }
    return null;
  }

  function highlightNav(path) {
    document.querySelectorAll(".side-nav a[data-route]").forEach((a) => {
      const base = a.dataset.route;
      const isActive = base === "/" ? path === "/" : path === base || path.startsWith(base + "/");
      a.classList.toggle("active", isActive);
    });
  }

  async function render(path) {
    if (!viewEl) viewEl = document.getElementById("view");
    const found = match(path);
    highlightNav(path);
    window.scrollTo(0, 0);

    const myGeneration = ++navGeneration;
    const isCurrent = () => myGeneration === navGeneration;

    if (!found) {
      viewEl.innerHTML = `<div class="empty-state">Page not found. <a data-navigate="/" data-link>Back to Dashboard</a></div>`;
      return;
    }
    viewEl.innerHTML = `<div class="page-loading">Loading…</div>`;
    try {
      await found.route.render(found.params, path, isCurrent);
    } catch (err) {
      if (!isCurrent()) return; // a newer navigation already took over #view
      console.error("[router] render failed:", err);
      viewEl.innerHTML = `<div class="empty-state">Something went wrong loading this page.<br>${escapeHtml(err.message || "")}</div>`;
    }
  }

  function navigate(path, { replace = false } = {}) {
    if (location.pathname === path) return render(path);
    if (replace) history.replaceState({}, "", path);
    else history.pushState({}, "", path);
    render(path);
  }

  function start() {
    document.addEventListener("click", (e) => {
      const navEl = e.target.closest("[data-navigate]");
      if (!navEl) return;
      e.preventDefault();
      navigate(navEl.dataset.navigate);
    });
    window.addEventListener("popstate", () => render(location.pathname));
    render(location.pathname);
  }

  return { register, navigate, start };
})();
