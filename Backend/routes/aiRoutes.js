const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });

const router = express.Router();

function normalize(text = "") { return String(text).replace(/\s+/g, " ").trim().toLowerCase(); }
function makeKey(a, b) { return crypto.createHash("sha256").update(normalize(a)+"|"+normalize(b)).digest("hex"); }

function stripFences(t="") { return t.replace(/```json|```/g,"").trim(); }

// calculate-score
router.post("/calculate-score", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body || {};
    if (!resumeText || !jobDescription) return res.status(400).json({ error: "Missing inputs" });

    const key = makeKey(resumeText, jobDescription);
    const cached = cache.get(key);
    if (cached) return res.json(cached);

    const baseUrl = process.env.GEMINI_BASE_URL;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!baseUrl || !apiKey) {
      // simple heuristic fallback
      const skills = ["python","java","c","c++","c#","javascript","azure","aws","rest","storage","dpu"];
      const matched = []; const missing = [];
      const r = resumeText.toLowerCase(), j = jobDescription.toLowerCase();
      for (const s of skills) { if (r.includes(s)) matched.push(s); else if (j.includes(s)) missing.push(s); }
      const score = Math.min(95, 30 + matched.length*10);
      const result = {
        score,
        skills_matched: matched,
        skills_missing: missing,
        education: "Bachelor degree (from resume)",
        eligibility: score >= 60 ? "Eligible" : "Possibly not eligible",
        explanation: "Heuristic analysis (no AI key configured).",
        ATS_decision: score >= 60 ? "Pass" : "Fail",
        ATS_confidence_score: Math.round(Math.min(90, 30 + matched.length*12)),
        improvedResume: resumeText
      };
      cache.set(key, result);
      return res.json(result);
    }

    // Call AI (Gemini) - using generic chat completions endpoint used earlier
    const prompt = `You are an ATS screener. Compare the RESUME and JOB DESCRIPTION and return valid JSON (no commentary).
Schema:
{ "score": number, "skills_matched": [], "skills_missing": [], "education": string,
  "eligibility": string, "explanation": string, "ATS_decision": "Pass"|"Fail",
  "ATS_confidence_score": number, "improvedResume": string }
RESUME:
${resumeText}
JOB:
${jobDescription}
`;
    const aiResp = await axios.post(`${baseUrl}chat/completions`, {
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    }, { headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}` }, timeout: 30000 });

    let text = aiResp.data?.choices?.[0]?.message?.content || "{}";
    text = stripFences(text);
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) {
      console.error("AI parsing failed:", e.message, text.slice(0,1000));
      return res.status(500).json({ error: "AI parsing failed", raw: text.slice(0,1000) });
    }
    if (Array.isArray(parsed.skills_matched)) parsed.skills_matched.sort();
    if (Array.isArray(parsed.skills_missing)) parsed.skills_missing.sort();
    if (!parsed.improvedResume) parsed.improvedResume = resumeText;
    cache.set(key, parsed);
    res.json(parsed);

  } catch (err) {
    console.error("calculate-score error:", err?.response?.data || err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// improve-resume (explicit)
router.post("/improve-resume", async (req, res) => {
  try {
    const { resumeText, jobDescription, analysis } = req.body || {};
    if (!resumeText || !jobDescription) return res.status(400).json({ error: "Missing inputs" });

    const baseUrl = process.env.GEMINI_BASE_URL, apiKey = process.env.GEMINI_API_KEY;
    if (!baseUrl || !apiKey) return res.json({ improvedResume: resumeText });

    const prompt = `You are a resume expert. Improve the RESUME to match the JOB. Do NOT invent facts. Return ONLY the improved resume text. 
Resume:
${resumeText}
Job:
${jobDescription}
Analysis:
${JSON.stringify(analysis || {})}
`;
    const aiResp = await axios.post(`${baseUrl}chat/completions`, {
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 });

    let improved = aiResp.data?.choices?.[0]?.message?.content || "";
    improved = improved.replace(/```/g, "").trim();
    if (!improved) improved = resumeText;
    return res.json({ improvedResume: improved });

  } catch (err) {
    console.error("improve-resume error:", err?.response?.data || err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// generate-cover-letter
router.post("/generate-cover-letter", async (req, res) => {
  try {
    const { resumeText, jobDescription, tone } = req.body || {};
    if (!resumeText || !jobDescription) return res.status(400).json({ error: "Missing inputs" });

    const baseUrl = process.env.GEMINI_BASE_URL, apiKey = process.env.GEMINI_API_KEY;
    if (!baseUrl || !apiKey) {
      const fallback = `Dear Hiring Manager,\n\nI am applying for the role. My experience in Python and Java and projects like URL Shortener make me a fit.\n\nSincerely.`;
      return res.json({ coverLetter: fallback });
    }

    const prompt = `Write a ${tone || "concise"} cover letter tailored to the job using only resume facts. Return plain text. Resume: ${resumeText} Job: ${jobDescription}`;
    const aiResp = await axios.post(`${baseUrl}chat/completions`, {
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 });

    const coverLetter = (aiResp.data?.choices?.[0]?.message?.content || "").replace(/```/g, "").trim();
    return res.json({ coverLetter });
  } catch (err) {
    console.error("generate-cover-letter error:", err?.response?.data || err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// chat passthrough (uses lastAnalysis context)
router.post("/chat", async (req, res) => {
  try {
    const { message, lastAnalysis } = req.body || {};
    if (!message) return res.status(400).json({ error: "Missing message" });

    const baseUrl = process.env.GEMINI_BASE_URL, apiKey = process.env.GEMINI_API_KEY;
    if (!baseUrl || !apiKey) {
      return res.json({ reply: `Demo: I received "${String(message).slice(0,120)}"` });
    }

    const prompt = `You are a recruiter assistant. Use this analysis if relevant: ${JSON.stringify(lastAnalysis || {})}\nUser: ${message}`;
    const aiResp = await axios.post(`${baseUrl}chat/completions`, {
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 });

    const reply = (aiResp.data?.choices?.[0]?.message?.content || "").replace(/```/g, "").trim();
    res.json({ reply });
  } catch (err) {
    console.error("chat error:", err?.response?.data || err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
