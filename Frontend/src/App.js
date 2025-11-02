import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import LoginSignup from "./LoginSignup";
import AlertsPanel from "./AlertsPanel";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

function Toast({ message, onClose }) { if (!message) return null; return (
  <div className="robot-toast" role="status" aria-live="polite">
    {message} <button className="toast-close" onClick={onClose}>×</button>
  </div>
);}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [toast, setToast] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // resume/jd state
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [analysis, setAnalysis] = useState(null);
  const [improvedResume, setImprovedResume] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [coverTone, setCoverTone] = useState("concise");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [chatHistory, setChatHistory] = useState([]);

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [recommendedJobs, setRecommendedJobs] = useState([]);

  useEffect(() => {
    if (token) { axios.defaults.headers.common["Authorization"] = `Bearer ${token}`; localStorage.setItem("token", token); }
    else { delete axios.defaults.headers.common["Authorization"]; localStorage.removeItem("token"); }
  }, [token]);

  const showToast = (m, t=3000) => { setToast(m); if (t) setTimeout(()=>setToast(null), t); };

  // file upload: read as base64 and send JSON { fileData, fileName }
  const handleUploadFile = (file) => {
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1];
      try {
        const res = await axios.post(`${API_BASE}/api/resume/upload`, { fileData: base64, fileName: file.name });
        const t = res.data?.resumeText || "";
        setResumeText(t);
        showToast("Resume parsed successfully");
      } catch (err) {
        console.error("Upload error:", err);
        showToast("Resume upload failed");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) return showToast("Provide resume and JD");
    showToast("Analyzing...");
    try {
      const res = await axios.post(`${API_BASE}/api/ai/calculate-score`, { resumeText, jobDescription });
      if (res.data?.raw || res.data?.error) {
        console.error("AI error", res.data);
        showToast("Analysis error — check server logs");
        return;
      }
      setAnalysis(res.data);
      if (res.data.improvedResume) setImprovedResume(res.data.improvedResume);
      showToast("Analysis complete");
    } catch (err) {
      console.error("Analyze error:", err);
      showToast("Analyze failed");
    }
  };

  const handleImprove = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) return showToast("Provide resume and JD");
    showToast("Improving resume...");
    try {
      const res = await axios.post(`${API_BASE}/api/ai/improve-resume`, { resumeText, jobDescription, analysis });
      const improved = res.data?.improvedResume || "";
      setImprovedResume(improved);
      showToast("Improved resume ready");
    } catch (err) {
      console.error("Improve error:", err);
      showToast("Improve failed");
    }
  };

  const handleDownloadDocx = async () => {
    if (!improvedResume) return showToast("No improved resume");
    try {
      const resp = await axios.post(`${API_BASE}/api/resume/download-docx`, { resumeText: improvedResume }, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a"); a.href = url; a.download = "Improved_Resume.docx"; a.click();
      showToast("Downloaded DOCX");
    } catch (err) { console.error(err); showToast("Download failed"); }
  };

  const handleDownloadPdf = async () => {
    if (!improvedResume) return showToast("No improved resume");
    try {
      const resp = await axios.post(`${API_BASE}/api/resume/download-pdf`, { resumeText: improvedResume }, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a"); a.href = url; a.download = "Improved_Resume.pdf"; a.click();
      showToast("Downloaded PDF");
    } catch (err) { console.error(err); showToast("Download failed"); }
  };

  const handleGenerateCover = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) return showToast("Provide resume and JD");
    showToast("Generating cover...");
    try {
      const res = await axios.post(`${API_BASE}/api/ai/generate-cover-letter`, { resumeText, jobDescription, tone: coverTone });
      setCoverLetter(res.data?.coverLetter || "");
      showToast("Cover ready");
    } catch (err) {
      console.error("cover error", err); showToast("Cover failed");
    }
  };

  const handleSendChat = async () => {
    if (!chatMsg.trim()) return;
    setChatHistory(h => [...h, { from: "you", text: chatMsg }]);
    const cur = chatMsg;
    setChatMsg("");
    try {
      const res = await axios.post(`${API_BASE}/api/ai/chat`, { message: cur, lastAnalysis: analysis || null });
      setChatHistory(h => [...h, { from: "bot", text: res.data?.reply || "No reply" }]);
    } catch (err) {
      console.error("chat err", err);
      setChatHistory(h => [...h, { from: "bot", text: "Chat failed" }]);
    }
  };

  const handleShowJobs = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/jobs/recommend`, { resumeText, jobDescription, filters: {} });
      setRecommendedJobs(res.data.jobs || []);
      setJobsOpen(true);
    } catch (err) {
      console.error("jobs err", err); showToast("Jobs failed");
    }
  };

  // Auth success callback
  const handleAuthSuccess = (tok) => { setToken(tok); showToast("Logged in"); };

  const logout = () => { setToken(null); showToast("Logged out"); };

  if (!token) {
    // Not logged in — show small landing with Login modal
    return <LoginSignup onSuccess={handleAuthSuccess} apiBase={API_BASE} />;
  }

  return (
    <div className="app">
      <header className="navbar">
        <button className="hamburger" onClick={()=>setDrawerOpen(o=>!o)}>☰</button>
        <div className="title">Resume Analyzer</div>
        <div style={{ justifySelf: "end", display: "flex", gap: 8 }}>
          <button onClick={handleShowJobs}>Jobs</button>
          <button onClick={()=>setAlertsOpen(true)}>Alerts</button>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className={`drawer ${drawerOpen ? "open" : ""}`}>
        <a href="#resume">Resume Analyzer</a>
        <a href="#jobs">Job Search</a>
        <a href="#alerts">Alerts</a>
      </nav>

      <main className="container">
        <section className="panel" id="resume">
          <h2 className="panel-title">Upload Resume</h2>
          <input className="file-input" type="file" accept=".pdf,.docx,.txt" onChange={e=>handleUploadFile(e.target.files?.[0])} />
          <div style={{ marginTop: 8 }}>{uploadedFileName}</div>
          <label style={{ marginTop: 12 }}>Paste / edit resume text</label>
          <textarea rows={10} value={resumeText} onChange={e=>setResumeText(e.target.value)} />
        </section>

        <section className="panel" id="jobdesc">
          <h2 className="panel-title">Job Description</h2>
          <textarea rows={8} value={jobDescription} onChange={e=>setJobDescription(e.target.value)} />
        </section>

        <div className="actions">
          <button onClick={handleAnalyze}>Analyze Resume</button>
          <button onClick={handleImprove}>Improve Resume</button>
        </div>

        {analysis && (
          <section className="panel">
            <h3 className="panel-title">Resume Analysis</h3>
            <pre className="pre">{JSON.stringify(analysis, null, 2)}</pre>
          </section>
        )}

        {improvedResume && (
          <section className="panel">
            <h3 className="panel-title">Improved Resume</h3>
            <pre className="pre" style={{ whiteSpace: "pre-wrap" }}>{improvedResume}</pre>
            <div className="actions">
              <button onClick={()=>{navigator.clipboard.writeText(improvedResume); showToast("Copied")}}>Copy</button>
              <button onClick={handleDownloadDocx}>Download DOCX</button>
              <button onClick={handleDownloadPdf}>Download PDF</button>
            </div>
          </section>
        )}

        <section className="panel">
          <h3 className="panel-title">Cover Letter</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label>Tone</label>
            <select value={coverTone} onChange={e=>setCoverTone(e.target.value)}>
              <option value="concise">Concise</option>
              <option value="enthusiastic">Enthusiastic</option>
              <option value="technical">Technical</option>
            </select>
            <div className="actions"><button onClick={handleGenerateCover}>Generate</button></div>
          </div>
          {coverLetter && (<div style={{ marginTop: 12 }}>
            <pre className="pre" style={{ whiteSpace: "pre-wrap" }}>{coverLetter}</pre>
            <div className="actions"><button onClick={()=>{navigator.clipboard.writeText(coverLetter); showToast("Copied")}}>Copy</button></div>
          </div>)}
        </section>
      </main>

      {/* Chatbot */}
      <button className="robot-btn" onClick={()=>setChatOpen(o=>!o)}>🤖</button>
      {chatOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div>Assistant</div>
            <button className="chat-close" onClick={()=>setChatOpen(false)}>×</button>
          </div>
          <div className="chat-body">
            {chatHistory.length===0 && <div style={{ color:"#666" }}>Ask about missing skills, fit, resume edits, or next steps.</div>}
            {chatHistory.map((m,i)=>(<div key={i}><b>{m.from}:</b> {m.text}</div>))}
          </div>
          <div className="chat-input">
            <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==="Enter" && handleSendChat()} />
            <button onClick={handleSendChat}>Send</button>
          </div>
        </div>
      )}

      <Toast message={toast} onClose={()=>setToast(null)} />

      {/* Alerts modal */}
      {alertsOpen && <div className="panel" style={{ position:"fixed", left:"50%", top:"50%", transform:"translate(-50%,-50%)", zIndex:2000 }}>
        <AlertsPanel apiBase={API_BASE} onClose={()=>setAlertsOpen(false)} defaultEmail={null} />
      </div>}

      {/* Jobs modal */}
      {jobsOpen && <div className="panel" style={{ position:"fixed", right:18, top:80, width:460, zIndex:2000 }}>
        <h3 className="panel-title">Recommended Jobs</h3>
        <div style={{ maxHeight:320, overflowY:"auto" }}>
          {recommendedJobs.map((j,i)=>(
            <div key={i} style={{ padding:8, borderBottom:"1px solid #eee" }}>
              <div style={{ fontWeight:700 }}>{j.title}</div>
              <div style={{ fontSize:13 }}>{j.company} • {j.location}</div>
              <div style={{ fontSize:13, color:"#666" }}>{j.match}</div>
              <div style={{ marginTop:6 }}>
                <button onClick={()=>alert("Apply flow not implemented")}>Apply</button>
                <button onClick={()=>{navigator.clipboard.writeText(j.title+" at "+j.company); showToast("Copied")}} style={{ marginLeft:8 }}>Copy</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:8 }}>
          <button onClick={()=>setJobsOpen(false)}>Close</button>
        </div>
      </div>}
    </div>
  );
}



