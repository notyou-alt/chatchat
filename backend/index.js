const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const ExcelJS = require("exceljs");
const multer = require("multer");
const XLSX = require("xlsx");
const Sastrawi = require("sastrawijs");
const stemmer = new Sastrawi.Stemmer();

const upload = multer({ dest: "uploads/" });
const notify = (msg) => alert(msg);

const app = express();
const db = new sqlite3.Database("./database.db");

// ======================
// MIDDLEWARE
// ======================
app.use(cors());
app.use(express.json());

// ======================
// UTILS
// ======================
const normalize = (v) => Number(v);

// ======================
// ROOT
// ======================
app.get("/", (req, res) => {
  res.send("Backend chatbot running 🚀");
});


// ======================================================
// 💬 CHAT ENGINE (LOG + INTENT + BAD WORD + EMOTION)
// ======================================================
app.post("/chat", (req, res) => {
  let userInput = (req.body.message || "").toLowerCase().trim();
  const createdAt = new Date().toISOString();

  // ======================
  // 1. BAD WORD CHECK
  // ======================
  db.all("SELECT word FROM bad_words", [], (err, badWords) => {
    if (err) return res.status(500).json(err);

    const badList = badWords.map(w => w.word.toLowerCase());

    if (badList.some(w => userInput.includes(w))) {
      return saveLog(null, "Saya mendeteksi kata yang tidak pantas.", 1, "angry");
    }

    // ======================
    // 2. AMBIL DATA INTENT
    // ======================
    db.all(`
      SELECT 
        q.question,
        q.intent_id,
        i.response,
        i.emotion
      FROM questions q
      LEFT JOIN intents i ON q.intent_id = i.id
    `, [], (err, rows) => {
      if (err) return res.status(500).json(err);

      let bestScore = 0;
      let best = null;

      rows.forEach(r => {
        const score = similarity(userInput, (r.question || "").toLowerCase());

        if (score > bestScore) {
          bestScore = score;
          best = r;
        }
      });

      let response = "Maaf saya belum memahami pertanyaan Anda.";
      let emotion = "shy";
      let intentId = null;

      if (bestScore >= 0.5 && best) {
        response = best.response;
        emotion = best.emotion;
        intentId = best.intent_id;
      }

      saveLog(intentId, response, bestScore, emotion);
    });
  });

  // ======================
  // SAVE LOG FUNCTION
  // ======================
  function saveLog(intentId, response, score, emotion) {
    db.run(
      `INSERT INTO chat_logs 
      (user_message, bot_response, matched_intent_id, confidence_score, created_at)
      VALUES (?, ?, ?, ?, ?)`,
      [userInput, response, intentId, score, createdAt]
    );

    res.json({
      response,
      score: Number(score.toFixed(2)),
      emotion
    });
  }
});

  // ======================
  // UPDATE INTENTS LOG
  // ======================

app.post("/admin/update-log-intent", (req, res) => {
  console.log("Received update-log-intent:", req.body);
  const { log_id, intent_id } = req.body;

  // Validasi
  if (!log_id) {
    return res.status(400).json({ error: "log_id diperlukan" });
  }

  // Konversi intent_id ke integer atau null
  let finalIntentId = intent_id === "" || intent_id === null || intent_id === undefined 
    ? null 
    : parseInt(intent_id, 10);
  
  if (isNaN(finalIntentId)) finalIntentId = null;

  const sql = "UPDATE chat_logs SET matched_intent_id = ? WHERE id = ?";
  db.run(sql, [finalIntentId, log_id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Log tidak ditemukan" });
    }
    res.json({ success: true });
  });
});

// ======================
// LOG VALIDATION (BENAR/SALAH)
// ======================
app.post("/admin/validate", (req, res) => {
  const { id, is_correct } = req.body;

  if (!id || (is_correct !== 0 && is_correct !== 1)) {
    return res.status(400).json({ error: "Invalid data" });
  }

  db.run(
    "UPDATE chat_logs SET is_correct = ? WHERE id = ?",
    [is_correct, id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

  // ======================
  // SAVING LOG 
  // ======================
app.post("/admin/add-from-log", (req, res) => {
  const { log_id } = req.body;

  db.get(
    "SELECT * FROM chat_logs WHERE id = ?",
    [log_id],
    (err, log) => {
      if (err) return res.status(500).json(err);
      if (!log) return res.status(404).json({ error: "Log tidak ditemukan" });

      if (!log.matched_intent_id) {
        return res.status(400).json({ error: "Tidak ada intent untuk log ini" });
      }

      db.run(
        `INSERT INTO questions (intent_id, question, created_at)
         VALUES (?, ?, datetime('now'))`,
        [log.matched_intent_id, log.user_message],
        (err) => {
          if (err) return res.status(500).json(err);
          res.json({ success: true });
        }
      );
    }
  );
});

// ======================
// SIMILARITY ENGINE
// ======================
function preprocess(text) {
  return stemmer
    .stem(text.toLowerCase())
    .split(" ")
    .filter(Boolean);
}

function similarity(a, b) {
  const aWords = preprocess(a);
  const bWords = preprocess(b);

  let match = 0;

  aWords.forEach(w => {
    if (bWords.includes(w)) match++;
  });

  return match / Math.max(aWords.length, bWords.length);
}


// ======================================================
// 📊 ADMIN - LOGS
// ======================================================
app.get("/admin/logs", (req, res) => {
  db.all(`
    SELECT 
      c.*,
      i.name AS intent_name
    FROM chat_logs c
    LEFT JOIN intents i ON c.matched_intent_id = i.id
    ORDER BY c.id DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});


// ======================================================
// 🏷️ CATEGORIES (WITH COUNT QUESTIONS)
// ======================================================
app.get("/admin/categories", (req, res) => {
  db.all(`
    SELECT 
      c.id,
      c.name,
      (
        SELECT COUNT(*)
        FROM questions q
        JOIN intents i ON q.intent_id = i.id
        WHERE i.category_id = c.id
      ) AS question_count
    FROM categories c
    ORDER BY c.id DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post("/admin/categories", (req, res) => {
  const { name } = req.body;

  db.run(
    "INSERT INTO categories (name) VALUES (?)",
    [name],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

app.delete("/admin/categories/:id", (req, res) => {
  const id = req.params.id;

  db.get(`
    SELECT COUNT(q.id) AS total
    FROM questions q
    JOIN intents i ON q.intent_id = i.id
    WHERE i.category_id = ?
  `, [id], (err, row) => {
    if (err) return res.status(500).json(err);

    if (row.total > 0) {
      return res.status(400).json({
        error: "Category masih digunakan oleh questions"
      });
    }

    db.run("DELETE FROM categories WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    });
  });
});

app.put("/admin/categories/:id", (req, res) => {
  const { name } = req.body;

  db.run(
    "UPDATE categories SET name = ? WHERE id = ?",
    [name, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// ======================================================
// 🧠 INTENTS (WITH COUNT + RESPONSE)
// ======================================================
app.get("/admin/intents", (req, res) => {
  db.all(`
    SELECT 
      i.id,
      i.name,
      i.response,
      i.emotion,
      i.category_id,
      c.name AS category_name,
      (
        SELECT COUNT(*)
        FROM questions q
        WHERE q.intent_id = i.id
      ) AS question_count
    FROM intents i
    LEFT JOIN categories c ON i.category_id = c.id
    ORDER BY i.id DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post("/admin/intents", (req, res) => {
  const { category_id, name, response, emotion } = req.body;

  db.run(`
    INSERT INTO intents 
    (category_id, name, response, emotion, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [category_id, name, response, emotion], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

app.delete("/admin/intents/:id", (req, res) => {
  const id = req.params.id;

  db.get(`
    SELECT COUNT(*) AS total
    FROM questions
    WHERE intent_id = ?
  `, [id], (err, row) => {
    if (err) return res.status(500).json(err);

    if (row.total > 0) {
      return res.status(400).json({
        error: "Intent masih memiliki questions"
      });
    }

    db.run("DELETE FROM intents WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    });
  });
});

app.put("/admin/intents/:id", (req, res) => {
  const { name, response, emotion, category_id } = req.body;

  db.run(
    `UPDATE intents 
     SET name=?, response=?, emotion=?, category_id=?, updated_at=datetime('now') 
     WHERE id=?`,
    [name, response, emotion, category_id, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// ======================================================
// ❓ QUESTIONS (JOIN INTENT + CATEGORY)
// ======================================================
app.get("/admin/questions", (req, res) => {
  db.all(`
    SELECT 
      q.id,
      q.question,
      i.id AS intent_id,
      i.name AS intent_name,
      c.id AS category_id,
      c.name AS category_name
    FROM questions q
    LEFT JOIN intents i ON q.intent_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    ORDER BY c.id, i.id
  `, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post("/admin/questions", (req, res) => {
  const { intent_id, question } = req.body;

  db.run(`
    INSERT INTO questions (intent_id, question, created_at)
    VALUES (?, ?, datetime('now'))
  `, [intent_id, question], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

app.delete("/admin/questions/:id", (req, res) => {
  db.run(
    "DELETE FROM questions WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

app.put("/admin/questions/:id", (req, res) => {
  const { question, intent_id } = req.body;

  db.run(
    "UPDATE questions SET question=?, intent_id=? WHERE id=?",
    [question, intent_id, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

// ======================================================
// 📦 EXPORT EXCEL
// ======================================================
app.get("/admin/export", async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const tables = ["categories", "intents", "questions", "chat_logs", "bad_words"];

  for (let table of tables) {
    const sheet = workbook.addWorksheet(table);

    await new Promise(resolve => {
      db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
        if (rows?.length > 0) {
          sheet.columns = Object.keys(rows[0]).map(k => ({
            header: k,
            key: k
          }));
          sheet.addRows(rows);
        }
        resolve();
      });
    });
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=chatbot.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
});


// ======================================================
// 📥 IMPORT EXCEL
// ======================================================
app.post("/admin/import", upload.single("file"), (req, res) => {
  const workbook = XLSX.readFile(req.file.path);

  workbook.SheetNames.forEach(sheet => {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);

    data.forEach(row => {
      const keys = Object.keys(row);
      const values = Object.values(row);

      db.run(
        `INSERT INTO ${sheet} (${keys.join(",")}) 
         VALUES (${keys.map(() => "?").join(",")})`,
        values
      );
    });
  });

  res.json({ success: true });
});


// ======================================================
// 🚀 START SERVER
// ======================================================
app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});