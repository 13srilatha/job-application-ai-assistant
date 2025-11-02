const express = require("express");
const router = express.Router();
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: 'Your_api_key'

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

