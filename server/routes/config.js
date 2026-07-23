// Exposes the same feature flags the backend reads (server/lib/config.js) to
// the frontend, so the browser never carries a second hardcoded copy.
const express = require("express");
const config = require("../lib/config");

const router = express.Router();

router.get("/flags", (req, res) => {
  res.json({ flags: config.allFlags() });
});

module.exports = router;
