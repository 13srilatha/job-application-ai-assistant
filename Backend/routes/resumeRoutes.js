// const express = require('express');
// const mammoth = require('mammoth');
// const pdf = require('pdf-parse');
// const FileType = require('file-type');

// const router = express.Router();

// async function extractTextFromDocx(buffer) {
//   const result = await mammoth.extractRawText({ buffer });
//   return result.value;
// }
// async function extractTextFromPdf(buffer) {
//   const data = await pdf(buffer);
//   return data.text;
// }

// router.post('/submit-resume', async (req, res) => {
//   let { resume } = req.body;
//   if (!resume) return res.status(400).json({ message: 'No resume provided' });

//   try {
//     let extractedResumeText;
//     if (/^[A-Za-z0-9+/=]+$/.test(resume) && resume.length > 200) {
//       const resumeBuffer = Buffer.from(resume, 'base64');
//       const detectedType = await FileType.fromBuffer(resumeBuffer);
//       if (!detectedType) return res.status(400).json({ message: 'Could not determine file type.' });

//       if (detectedType.mime === 'application/pdf') {
//         extractedResumeText = await extractTextFromPdf(resumeBuffer);
//       } else if (detectedType.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
//         extractedResumeText = await extractTextFromDocx(resumeBuffer);
//       } else {
//         return res.status(400).json({ message: 'Unsupported file type.' });
//       }
//     } else {
//       extractedResumeText = String(resume); // plain text paste
//     }

//     return res.status(200).json({ message: 'Resume parsed successfully', extractedResumeText });
//   } catch (err) {
//     console.error('Error parsing resume:', err);
//     return res.status(400).json({ message: 'Error parsing the resume file.', error: err.message });
//   }
// });

// module.exports = router;


// above worked below is testing/feature adding
// job/backend/routes/resumeRoutes.js
const express = require("express");
const FileType = require("file-type");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const fs = require("fs-extra");
const path = require("path");
const { Document, Packer, Paragraph, TextRun } = require("docx");
const { PDFDocument, StandardFonts } = require("pdf-lib");

const router = express.Router();

// Accept either JSON base64 { fileData, fileName } OR form-data file under "file"
router.post("/upload", async (req, res) => {
  try {
    // If form-data file present (some clients)
    if (req.files && req.files.file) {
      const file = req.files.file;
      // try to guess type by filename
      const lower = (file.name || "").toLowerCase();
      if (lower.endsWith(".pdf")) {
        const parsed = await pdfParse(file.data);
        return res.json({ resumeText: parsed.text });
      } else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
        const r = await mammoth.extractRawText({ buffer: file.data });
        return res.json({ resumeText: r.value });
      } else {
        // fallback to text
        return res.json({ resumeText: file.data.toString("utf8") });
      }
    }

    // JSON body with base64
    const { fileData, fileName } = req.body || {};
    if (!fileData) return res.status(400).json({ error: "No fileData in body" });

    const buffer = Buffer.from(fileData, "base64");
    const ft = await FileType.fromBuffer(buffer);
    const mime = ft?.mime || "";
    if (mime === "application/pdf" || (fileName || "").toLowerCase().endsWith(".pdf")) {
      const parsed = await pdfParse(buffer);
      return res.json({ resumeText: parsed.text });
    } else if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || (fileName || "").toLowerCase().endsWith(".docx")) {
      const r = await mammoth.extractRawText({ buffer });
      return res.json({ resumeText: r.value });
    } else {
      // treat as plain text
      return res.json({ resumeText: buffer.toString("utf8") });
    }
  } catch (err) {
    console.error("Error in /resume/upload:", err);
    return res.status(500).json({ error: "Failed to parse resume" });
  }
});

// Download docx
router.post("/download-docx", async (req, res) => {
  try {
    const { resumeText } = req.body || {};
    if (!resumeText) return res.status(400).json({ error: "Missing resumeText" });

    const doc = new Document({
      sections: [{ children: resumeText.split(/\r?\n/).map(line => new Paragraph({ children: [new TextRun(line || "")] })) }]
    });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Disposition", 'attachment; filename="Improved_Resume.docx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    return res.send(buffer);
  } catch (err) {
    console.error("DOCX error:", err);
    res.status(500).json({ error: "Failed to create docx" });
  }
});

// Download pdf (simple text layout)
router.post("/download-pdf", async (req, res) => {
  try {
    const { resumeText } = req.body || {};
    if (!resumeText) return res.status(400).json({ error: "Missing resumeText" });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { height } = page.getSize();
    const left = 40;
    const topStart = height - 40;
    const lineHeight = 12;
    const lines = resumeText.split(/\r?\n/);
    lines.forEach((line, i) => {
      page.drawText(line || "", { x: left, y: topStart - i * lineHeight, size: 11, font });
    });
    const bytes = await pdfDoc.save();
    res.setHeader("Content-Disposition", 'attachment; filename="Improved_Resume.pdf"');
    res.setHeader("Content-Type", "application/pdf");
    return res.send(Buffer.from(bytes));
  } catch (err) {
    console.error("PDF error:", err);
    res.status(500).json({ error: "Failed to create pdf" });
  }
});

module.exports = router;
