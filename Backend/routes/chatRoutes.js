const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: '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'

});

router.post("/chat", async (req, res) => {
    const { message } = req.body;
    try {
        const response = await openai.completions.create({
            model: "gpt-4",
            prompt: `User: ${message}\nAI:`,
            max_tokens: 150
        });
        res.json({ reply: response.choices[0].text.trim() });
    } catch (error) {
        res.status(500).json({ error: "AI error" });
    }
});

module.exports = router;
