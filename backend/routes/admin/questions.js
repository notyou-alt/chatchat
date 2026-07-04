// backend/routes/admin/questions.js
const { Router } = require("express");
const { dbQuery, dbRun } = require("../../utils/asyncDb");

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await dbQuery(`
      SELECT q.id, q.question, i.id AS intent_id, i.name AS intent_name,
        c.id AS category_id, c.name AS category_name
      FROM questions q
      LEFT JOIN intents i ON q.intent_id = i.id
      LEFT JOIN categories c ON i.category_id = c.id
      ORDER BY c.id, i.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { intent_id, question } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: "Teks question diperlukan" });

  try {
    await dbRun(
      `INSERT INTO questions (intent_id, question, created_at) VALUES ($1, $2, NOW())`,
      [intent_id ?? null, question.trim()]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { question, intent_id } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: "Teks question diperlukan" });

  try {
    const result = await dbRun(
      "UPDATE questions SET question=$1, intent_id=$2 WHERE id=$3",
      [question.trim(), intent_id ?? null, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Question tidak ditemukan" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await dbRun("DELETE FROM questions WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;