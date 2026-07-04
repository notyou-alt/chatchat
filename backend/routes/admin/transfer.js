// backend/routes/admin/transfer.js
const { Router } = require("express");
const { dbQuery, dbRun } = require("../../utils/asyncDb");
const pool = require("../../db");

const router = Router();

router.get("/export", async (req, res) => {
  try {
    const [categories, intents, questions, chat_logs, bad_words] = await Promise.all([
      dbQuery("SELECT * FROM categories"),
      dbQuery("SELECT * FROM intents"),
      dbQuery("SELECT * FROM questions"),
      dbQuery("SELECT * FROM chat_logs"),
      dbQuery("SELECT * FROM bad_words"),
    ]);
    res.json({ categories, intents, questions, chat_logs, bad_words });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/import", async (req, res) => {
  const { categories, intents, questions } = req.body;

  if (!Array.isArray(categories) || !Array.isArray(intents) || !Array.isArray(questions))
    return res.status(400).json({ error: "categories, intents, questions harus berupa array" });

  const validStr = (v, field) => {
    if (!v || typeof v !== "string")
      throw new Error(`Field '${field}' harus string dan tidak boleh kosong`);
  };

  try {
    for (const cat of categories) validStr(cat.name, "name (category)");
    for (const intent of intents) {
      validStr(intent.name, "name (intent)");
      validStr(intent.response, "response (intent)");
    }
    for (const q of questions) validStr(q.question, "question");
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM questions");
    await client.query("DELETE FROM intents");
    await client.query("DELETE FROM categories");

    const catIdMap = new Map();
    for (const cat of categories) {
      const result = await client.query(
        "INSERT INTO categories (name) VALUES ($1) RETURNING id",
        [cat.name]
      );
      catIdMap.set(cat.id, result.rows[0].id);
    }

    const intentIdMap = new Map();
    for (const intent of intents) {
      const mappedCatId = intent.category_id ? catIdMap.get(intent.category_id) ?? null : null;
      const result = await client.query(
        `INSERT INTO intents (category_id, name, response, emotion, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        [mappedCatId, intent.name, intent.response, intent.emotion ?? "neutral"]
      );
      intentIdMap.set(intent.id, result.rows[0].id);
    }

    for (const q of questions) {
      const mappedIntentId = q.intent_id ? intentIdMap.get(q.intent_id) ?? null : null;
      await client.query(
        `INSERT INTO questions (intent_id, question, created_at) VALUES ($1, $2, NOW())`,
        [mappedIntentId, q.question]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      stats: {
        categories: categories.length,
        intents: intents.length,
        questions: questions.length,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Gagal menyimpan data: " + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;