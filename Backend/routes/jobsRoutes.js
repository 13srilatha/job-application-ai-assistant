// const OpenAI = require("openai");

// const openai = new OpenAI({
//     apiKey: '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'
// });

// // Dummy job data
// const jobs = [
//     { id: 1, title: "Frontend Developer", company: "Google" },
//     { id: 2, title: "Backend Developer", company: "Amazon" },
// ];

// // Search jobs
// const express = require("express");
// const router = express.Router();

// router.get("/search", (req, res) => {
//     const query = req.query.query.toLowerCase();
//     const filteredJobs = jobs.filter((job) =>
//         job.title.toLowerCase().includes(query)
//     );
//     res.json(filteredJobs);
// });

// const extractKeywords = async (text) => {
//     const prompt = `Extract relevant keywords from the following text:\n\n${text}`;
//     const response = await openai.completions.create({
//         model: "gpt-4",
//         prompt: prompt,
//         max_tokens: 100
//     });
//     return response.choices[0].text.split(',').map(keyword => keyword.trim());
// };

// const calculateMatchingScore = async (jobDescription, userResume) => {
//     const jobKeywords = await extractKeywords(jobDescription);
//     const resumeKeywords = await extractKeywords(userResume);

//     const matchedKeywords = jobKeywords.filter(keyword => resumeKeywords.includes(keyword));
//     const score = (matchedKeywords.length / jobKeywords.length) * 100;

//     return {
//         score: Math.round(score),
//         matchedKeywords,
//         nonMatchedKeywords: jobKeywords.filter(keyword => !resumeKeywords.includes(keyword))
//     };
// };

// module.exports = router;






































// job/backend/routes/jobsRoutes.js
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
