// backend/routes/admin/intents.js
const { Router } = require("express");
const { dbQuery, dbRun } = require("../../utils/asyncDb");

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await dbQuery(`
      SELECT i.id, i.name, i.response, i.emotion, i.category_id,
        c.name AS category_name,
        (SELECT COUNT(*) FROM questions q WHERE q.intent_id = i.id) AS question_count
      FROM intents i
      LEFT JOIN categories c ON i.category_id = c.id
      ORDER BY i.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { category_id, name, response, emotion } = req.body;
  if (!name?.trim() || !response?.trim())
    return res.status(400).json({ error: "name dan response diperlukan" });

  try {
    await dbRun(
      `INSERT INTO intents (category_id, name, response, emotion, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [category_id ?? null, name.trim(), response.trim(), emotion ?? "neutral"]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { name, response, emotion, category_id } = req.body;
  if (!name?.trim() || !response?.trim())
    return res.status(400).json({ error: "name dan response diperlukan" });

  try {
    const result = await dbRun(
      `UPDATE intents SET name=$1, response=$2, emotion=$3, category_id=$4, updated_at=NOW() WHERE id=$5`,
      [name.trim(), response.trim(), emotion ?? "neutral", category_id ?? null, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Intent tidak ditemukan" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const rows = await dbQuery(
      "SELECT COUNT(*) AS total FROM questions WHERE intent_id = $1",
      [req.params.id]
    );
    if (parseInt(rows[0].total) > 0)
      return res.status(400).json({ error: "Intent masih memiliki questions" });

    await dbRun("DELETE FROM intents WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;