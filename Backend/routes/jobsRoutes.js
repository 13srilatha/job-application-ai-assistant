const express = require("express");
const router = express.Router();

router.post("/recommend", (req, res) => {
  const { resumeText = "", jobDescription = "", filters = {} } = req.body || {};
  const text = (resumeText + " " + jobDescription + " " + (filters.keywords || "")).toLowerCase();

  const jobs = [];
  if (text.includes("azure") || text.includes("storage") || text.includes("dpu")) {
    jobs.push({ id: "MS-1863347", title: "Software Engineer - Azure Storage DPU", company: "Microsoft (sample)", location: "India", match: "Azure/Storage keywords matched" });
  }
  if (text.includes("python")) jobs.push({ id: "PY-001", title: "Backend Engineer (Python)", company: "ExampleCloud", location: "Remote", match: "Python skills" });
  if (jobs.length === 0) jobs.push({ id: "GEN-1", title: "Software Engineer", company: "GenericCorp", location: "Remote", match: "General fit" });

  res.json({ jobs });
});

module.exports = router;


