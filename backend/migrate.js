// backend/migrate.js
require("dotenv").config();
const sqlite3 = require("sqlite3").verbose();
const pool = require("./db");

const sqlite = new sqlite3.Database("./database.db");

const sqliteAll = (sql) =>
  new Promise((resolve, reject) =>
    sqlite.all(sql, [], (err, rows) => (err ? reject(err) : resolve(rows)))
  );

const pgRun = (sql, params = []) => pool.query(sql, params);

async function migrate() {
  console.log("Migration SQLite → PostgreSQL dimulai...");

  const categories = await sqliteAll("SELECT * FROM categories");
  const intents = await sqliteAll("SELECT * FROM intents");
  const questions = await sqliteAll("SELECT * FROM questions");
  const chat_logs = await sqliteAll("SELECT * FROM chat_logs");
  const bad_words = await sqliteAll("SELECT * FROM bad_words");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM questions");
    await client.query("DELETE FROM chat_logs");
    await client.query("DELETE FROM bad_words");
    await client.query("DELETE FROM intents");
    await client.query("DELETE FROM categories");

    const catMap = new Map();
    for (const cat of categories) {
      const res = await client.query(
        "INSERT INTO categories (name) VALUES ($1) RETURNING id",
        [cat.name]
      );
      catMap.set(cat.id, res.rows[0].id);
    }
    console.log(`Categories migrated: ${categories.length}`);

    const intentMap = new Map();
    for (const intent of intents) {
      const res = await client.query(
        `INSERT INTO intents (category_id, name, response, emotion, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        [
          intent.category_id ? catMap.get(intent.category_id) ?? null : null,
          intent.name,
          intent.response,
          intent.emotion ?? "neutral",
        ]
      );
      intentMap.set(intent.id, res.rows[0].id);
    }
    console.log(`Intents migrated: ${intents.length}`);

    for (const q of questions) {
      await client.query(
        `INSERT INTO questions (intent_id, question, created_at) VALUES ($1, $2, NOW())`,
        [q.intent_id ? intentMap.get(q.intent_id) ?? null : null, q.question]
      );
    }
    console.log(`Questions migrated: ${questions.length}`);

    for (const log of chat_logs) {
      await client.query(
        `INSERT INTO chat_logs (user_message, bot_response, matched_intent_id, confidence_score, is_correct, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          log.user_message,
          log.bot_response,
          log.matched_intent_id ? intentMap.get(log.matched_intent_id) ?? null : null,
          log.confidence_score,
          log.is_correct,
        ]
      );
    }
    console.log(`Chat logs migrated: ${chat_logs.length}`);

    for (const bw of bad_words) {
      await client.query(
        "INSERT INTO bad_words (word) VALUES ($1) ON CONFLICT DO NOTHING",
        [bw.word]
      );
    }
    console.log(`Bad words migrated: ${bad_words.length}`);

    await client.query("COMMIT");
    console.log("Migration selesai!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration gagal:", err.message);
    throw err;
  } finally {
    client.release();
    sqlite.close();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});