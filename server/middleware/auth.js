const { verifyToken } = require("../lib/auth");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not signed in." });
  try {
    req.user = verifyToken(token); // { sub, name, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired, please sign in again." });
  }
}

// Admin = full read/write everywhere. Everyone else (HR, Staff) = read only.
function requireAdmin(req, res, next) {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Admins only." });
  }
  next();
}

// Blocks write verbs for non-admins, lets GET through for any signed-in user.
function writeRequiresAdmin(req, res, next) {
  if (req.method === "GET") return next();
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Your role (view only) can't make changes here." });
  }
  next();
}

module.exports = { authenticate, requireAdmin, writeRequiresAdmin };
