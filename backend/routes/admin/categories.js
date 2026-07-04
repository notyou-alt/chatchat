// backend/routes/admin/categories.js
const { Router } = require("express");
const { dbQuery, dbRun } = require("../../utils/asyncDb");

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await dbQuery(`
      SELECT c.id, c.name,
        (SELECT COUNT(*) FROM questions q JOIN intents i ON q.intent_id = i.id WHERE i.category_id = c.id) AS question_count
      FROM categories c
      ORDER BY c.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nama category diperlukan" });

  try {
    await dbRun("INSERT INTO categories (name) VALUES ($1)", [name.trim()]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nama category diperlukan" });

  try {
    const result = await dbRun(
      "UPDATE categories SET name = $1 WHERE id = $2",
      [name.trim(), req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Category tidak ditemukan" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const rows = await dbQuery(
      `SELECT COUNT(q.id) AS total FROM questions q JOIN intents i ON q.intent_id = i.id WHERE i.category_id = $1`,
      [req.params.id]
    );
    if (parseInt(rows[0].total) > 0)
      return res.status(400).json({ error: "Category masih digunakan oleh questions" });

    await dbRun("DELETE FROM categories WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;