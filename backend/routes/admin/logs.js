// backend/routes/admin/logs.js
const { Router } = require("express");
const { dbQuery, dbGet, dbRun } = require("../../utils/asyncDb");

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await dbQuery(`
      SELECT c.*, i.name AS intent_name
      FROM chat_logs c
      LEFT JOIN intents i ON c.matched_intent_id = i.id
      ORDER BY c.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/validate", async (req, res) => {
  const { id, is_correct } = req.body;
  if (!id || (is_correct !== 0 && is_correct !== 1))
    return res.status(400).json({ error: "Invalid data" });

  try {
    await dbRun("UPDATE chat_logs SET is_correct = $1 WHERE id = $2", [is_correct, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/update-intent", async (req, res) => {
  const { log_id, intent_id } = req.body;
  if (!log_id) return res.status(400).json({ error: "log_id diperlukan" });

  const finalIntentId =
    intent_id === "" || intent_id == null || isNaN(parseInt(intent_id, 10))
      ? null
      : parseInt(intent_id, 10);

  try {
    const result = await dbRun(
      "UPDATE chat_logs SET matched_intent_id = $1 WHERE id = $2",
      [finalIntentId, log_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Log tidak ditemukan" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/add-question", async (req, res) => {
  const { log_id } = req.body;
  try {
    const log = await dbGet("SELECT * FROM chat_logs WHERE id = $1", [log_id]);
    if (!log) return res.status(404).json({ error: "Log tidak ditemukan" });
    if (!log.matched_intent_id)
      return res.status(400).json({ error: "Tidak ada intent untuk log ini" });

    await dbRun(
      `INSERT INTO questions (intent_id, question, created_at) VALUES ($1, $2, NOW())`,
      [log.matched_intent_id, log.user_message]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;