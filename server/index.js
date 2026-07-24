require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const { authenticate } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const machineryRoutes = require("./routes/machinery");
const machineryCFRoutes = require("./routes/machineryCF");
const preventiveMaintenanceRoutes = require("./routes/preventiveMaintenance");
const correctiveMaintenanceRoutes = require("./routes/correctiveMaintenance");
const machineryInspectionRoutes = require("./routes/machineryInspection");
const calibrationRecordsRoutes = require("./routes/calibrationRecords");
const chraRoutes = require("./routes/chra");
const hraRoutes = require("./routes/hra");
const hirarcRoutes = require("./routes/hirarc");
const sopRoutes = require("./routes/sop");
const chemicalsRoutes = require("./routes/chemicals");
const substancesRoutes = require("./routes/substances");
const chemicalProcessUsageRoutes = require("./routes/chemicalProcessUsage");
const exposureMonitoringRoutes = require("./routes/exposureMonitoring");
const chemicalStorageInspectionRoutes = require("./routes/chemicalStorageInspection");
const chemicalLabelInspectionRoutes = require("./routes/chemicalLabelInspection");
const wasteManagementRoutes = require("./routes/wasteManagement");
const sdsDocumentsRoutes = require("./routes/sdsDocuments");
const chemicalSafetyTrainingRoutes = require("./routes/chemicalSafetyTraining");
const companySettingsRoutes = require("./routes/companySettings");
const doshRegisterGenerationsRoutes = require("./routes/doshRegisterGenerations");
const configRoutes = require("./routes/config");
const actionsRoutes = require("./routes/actions");
const oshCommitteeMeetingsRoutes = require("./routes/oshCommitteeMeetings");
const oshCommitteeMembersRoutes = require("./routes/oshCommitteeMembers");
const adminRoutes = require("./routes/admin");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Public
app.use("/api/auth", authRoutes);

// Everything below requires a valid session (any role)
app.use("/api/machinery", authenticate, machineryRoutes);
app.use("/api/machinery-cf", authenticate, machineryCFRoutes);
app.use("/api/preventive-maintenance", authenticate, preventiveMaintenanceRoutes);
app.use("/api/corrective-maintenance", authenticate, correctiveMaintenanceRoutes);
app.use("/api/machinery-inspection", authenticate, machineryInspectionRoutes);
app.use("/api/calibration-records", authenticate, calibrationRecordsRoutes);
app.use("/api/chra", authenticate, chraRoutes);
app.use("/api/hra", authenticate, hraRoutes);
app.use("/api/hirarc", authenticate, hirarcRoutes);
app.use("/api/sop", authenticate, sopRoutes);
app.use("/api/chemicals", authenticate, chemicalsRoutes);
app.use("/api/substances", authenticate, substancesRoutes);
app.use("/api/chemical-process-usage", authenticate, chemicalProcessUsageRoutes);
app.use("/api/exposure-monitoring", authenticate, exposureMonitoringRoutes);
app.use("/api/chemical-storage-inspection", authenticate, chemicalStorageInspectionRoutes);
app.use("/api/chemical-label-inspection", authenticate, chemicalLabelInspectionRoutes);
app.use("/api/waste-management", authenticate, wasteManagementRoutes);
app.use("/api/sds-documents", authenticate, sdsDocumentsRoutes);
app.use("/api/chemical-safety-training", authenticate, chemicalSafetyTrainingRoutes);
app.use("/api/company-settings", authenticate, companySettingsRoutes);
app.use("/api/dosh-register-generations", authenticate, doshRegisterGenerationsRoutes);
app.use("/api/config", authenticate, configRoutes);
app.use("/api/actions", authenticate, actionsRoutes);
app.use("/api/osh-committee-meetings", authenticate, oshCommitteeMeetingsRoutes);
app.use("/api/osh-committee-members", authenticate, oshCommitteeMembersRoutes);

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
