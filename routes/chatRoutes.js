const express = require("express");
const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

const SYSTEM_PROMPT = `You are the CRCE Leave Portal Assistant — a friendly, helpful AI chatbot embedded in the Fr. Conceicao Rodrigues College of Engineering (CRCE) Leave Management System.

Your role:
- Help students, faculty, and HODs with leave-related queries
- Explain leave types (Sick Leave, Casual Leave, Medical, Emergency, Hackathon, College Event, Personal, Earned Leave, Vacation Leave, Bank Work, Compensatory Off)
- Guide users on how to apply for leave, check leave balance, and track application status
- Explain the approval workflow: Student applies → Faculty reviews → HOD final approval
- Answer general questions about the portal features
- Be concise, warm, and professional

Key facts:
- Students can apply for: Sick Leave (12 days), Casual Leave (8 days), Medical (10 days), Emergency (5 days), Hackathon (5 days), College Event (5 days), Personal (10 days)
- Faculty can apply for: Sick Leave (12 days), Casual Leave (8 days), Medical (10 days), Emergency (5 days), Personal (10 days), Earned Leave (30 days), Vacation Leave (42 days), Bank Work (12 days), Compensatory Off (2 days)
- Student annual leave limit: 30 days
- Faculty annual leave limit: 120 days
- Leave applications require: leave type, start date, end date, reason, and optional certificate upload
- The portal has Student, Faculty, HOD, and Super Admin panels

Keep responses concise (2-4 sentences max unless more detail is needed). Use emojis sparingly for friendliness.`;

// Free models to try in order (fallback chain)
const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwen3-coder:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-3-12b-it:free",
];

async function callOpenRouter(model, apiMessages) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5000",
      "X-Title": "CRCE Leave Portal"
    },
    body: JSON.stringify({
      model,
      messages: apiMessages,
      max_tokens: 500,
      temperature: 0.7
    })
  });
  return response;
}

// POST /api/chat
router.post("/", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "Chat API key not configured" });
    }

    const apiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-10)
    ];

    // Try each model in the fallback chain
    let lastError = null;
    for (const model of FREE_MODELS) {
      try {
        const response = await callOpenRouter(model, apiMessages);
        
        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response. Please try again.";
          console.log(`Chat success with model: ${model}`);
          return res.json({ reply });
        }

        // If rate-limited (429) or server error, try next model
        const errText = await response.text();
        console.log(`Model ${model} failed (${response.status}), trying next...`);
        lastError = errText;

        if (response.status !== 429 && response.status < 500) {
          // For non-retryable errors (400, 401, etc.), stop trying
          console.error("OpenRouter error:", errText);
          return res.status(502).json({ error: "AI service temporarily unavailable" });
        }
      } catch (fetchErr) {
        console.log(`Model ${model} fetch error: ${fetchErr.message}`);
        lastError = fetchErr.message;
      }
    }

    // All models failed
    console.error("All models exhausted. Last error:", lastError);
    return res.status(502).json({ error: "AI service temporarily unavailable. Please try again in a moment." });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

module.exports = router;
