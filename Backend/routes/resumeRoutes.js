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

