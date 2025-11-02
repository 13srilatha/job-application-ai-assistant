require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

console.log("Gemini API configured:", !!process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Routes (adjust paths if your folder differs)
const resumeRoutes = require("../backend/routes/resumeRoutes");
const aiRoutes = require("../backend/routes/aiRoutes");
const authRoutes = require("../backend/routes/authRoutes");
const alertsRoutes = require("../backend/routes/alertsRoutes");
const jobsRoutes = require("../backend/routes/jobsRoutes");

app.use("/api/resume", resumeRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/jobs", jobsRoutes);

// Simple health endpoint
app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

