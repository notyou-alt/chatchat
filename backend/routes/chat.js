// backend/routes/chat.js
const { Router } = require("express");
const { dbQuery, dbRun } = require("../utils/asyncDb");
const { similarity, findTopMatches } = require("../utils/nlp");
const { callGemini } = require("../utils/gemini");

const router = Router();

const SCORE_THRESHOLD = 0.5;
const DEFAULT_RESPONSE = "Maaf, saya belum memahami pertanyaan Anda.";
const GEMINI_ERROR_RESPONSE = "Maaf, asisten sedang tidak tersedia. Silakan coba lagi nanti.";

router.post("/", async (req, res) => {
  const userInput = (req.body.message || "").toLowerCase().trim();
  const createdAt = new Date().toISOString();

  try {
    const badWords = await dbQuery("SELECT word FROM bad_words");
    const isBad = badWords.some((r) => userInput.includes(r.word.toLowerCase()));

    if (isBad) {
      await saveLog(null, "Saya mendeteksi kata yang tidak pantas.", 1, "angry", userInput, createdAt);
      return res.json({
        response: "Saya mendeteksi kata yang tidak pantas.",
        score: 1,
        emotion: "angry",
        source: "filter",
      });
    }

    const rows = await dbQuery(`
      SELECT q.question, q.intent_id, i.response, i.emotion
      FROM questions q
      LEFT JOIN intents i ON q.intent_id = i.id
    `);

    let bestScore = 0;
    let best = null;

    for (const row of rows) {
      const score = similarity(userInput, row.question || "");
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }

    if (bestScore >= SCORE_THRESHOLD && best) {
      await saveLog(best.intent_id, best.response, bestScore, best.emotion, userInput, createdAt);
      return res.json({
        response: best.response,
        score: Number(bestScore.toFixed(2)),
        emotion: best.emotion,
        source: "database",
      });
    }

    const topMatches = findTopMatches(userInput, rows, 5);

    if (topMatches.length === 0) {
      await saveLog(null, DEFAULT_RESPONSE, 0, "shy", userInput, createdAt);
      return res.json({
        response: DEFAULT_RESPONSE,
        score: 0,
        emotion: "shy",
        source: "none",
      });
    }

    let response, source, emotion;

    try {
      const geminiResult = await callGemini(userInput, topMatches);
      response = geminiResult.response;
      source = geminiResult.rateLimited ? "rate_limited" : "gemini";
      emotion = geminiResult.rateLimited ? "shy" : "neutral";
    } catch (geminiErr) {
      console.error("[Gemini Error]", geminiErr.status ?? "", geminiErr.message);
      response = GEMINI_ERROR_RESPONSE;
      source = "error";
      emotion = "shy";
    }

    await saveLog(null, response, bestScore, emotion, userInput, createdAt);

    return res.json({
      response,
      score: Number(bestScore.toFixed(2)),
      emotion,
      source,
    });
  } catch (err) {
    console.error("[/chat]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function saveLog(intentId, response, score, emotion, userInput, createdAt) {
  await dbRun(
    `INSERT INTO chat_logs (user_message, bot_response, matched_intent_id, confidence_score, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userInput, response, intentId ?? null, score, createdAt]
  );
}

module.exports = router;