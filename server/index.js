require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const { authenticate } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const machineryRoutes = require("./routes/machinery");
const chraRoutes = require("./routes/chra");
const hraRoutes = require("./routes/hra");
const hirarcRoutes = require("./routes/hirarc");
const sopRoutes = require("./routes/sop");
const adminRoutes = require("./routes/admin");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Public
app.use("/api/auth", authRoutes);

// Everything below requires a valid session (any role)
app.use("/api/machinery", authenticate, machineryRoutes);
app.use("/api/chra", authenticate, chraRoutes);
app.use("/api/hra", authenticate, hraRoutes);
app.use("/api/hirarc", authenticate, hirarcRoutes);
app.use("/api/sop", authenticate, sopRoutes);

// Admin-only (checked inside admin.js)
app.use("/api/admin", adminRoutes);

// Static frontend
app.use(express.static(path.join(__dirname, "..", "public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OSH-C Portal server listening on port ${PORT}`);
});
