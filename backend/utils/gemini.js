// backend/utils/gemini.js
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { dbGet, dbRun } = require("./asyncDb");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });

const RATE_LIMIT = parseInt(process.env.GEMINI_RATE_LIMIT_PER_MINUTE) || 60;

const getRateLimitRecord = async () => {
  const record = await dbGet("SELECT * FROM gemini_rate_limit WHERE id = 1");
  return record;
};

const isRateLimited = async () => {
  const record = await getRateLimitRecord();
  if (!record) return false;

  const now = new Date();
  const resetAt = new Date(record.reset_at);

  if (now > resetAt) {
    await dbRun(
      "UPDATE gemini_rate_limit SET api_calls = 1, reset_at = $1, updated_at = NOW() WHERE id = 1",
      [new Date(now.getTime() + 60000)]
    );
    return false;
  }

  if (record.api_calls >= RATE_LIMIT) return true;

  await dbRun(
    "UPDATE gemini_rate_limit SET api_calls = api_calls + 1, updated_at = NOW() WHERE id = 1"
  );
  return false;
};

const buildPrompt = (userInput, topMatches) => {
  const context = topMatches
    .map((m, i) => `Q${i + 1}: ${m.question}\nA${i + 1}: ${m.response}`)
    .join("\n\n");

  return `Kamu adalah asisten chatbot mentoring mahasiswa baru UMN yang helpful dan ramah.
Gunakan referensi berikut untuk menjawab pertanyaan user. Jawab dalam Bahasa Indonesia yang natural dan sopan.
Jika pertanyaan tidak relevan dengan referensi yang diberikan, katakan bahwa kamu belum memiliki informasi tersebut.
Jangan mengarang informasi di luar referensi yang diberikan.

REFERENSI:
${context}

PERTANYAAN USER: ${userInput}

JAWABAN:`;
};

const callGemini = async (userInput, topMatches) => {
  const limited = await isRateLimited();
  if (limited) {
    return {
      response: "Maaf, asisten sedang sibuk. Silakan coba beberapa saat lagi.",
      rateLimited: true,
    };
  }

  const prompt = buildPrompt(userInput, topMatches);
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  return { response: text, rateLimited: false };
};

module.exports = { callGemini };