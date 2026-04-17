const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS intents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT,
    response TEXT,
    emotion TEXT,
    created_at TEXT,
    updated_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intent_id INTEGER,
    question TEXT,
    created_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_message TEXT,
    bot_response TEXT,
    matched_intent_id INTEGER,
    confidence_score REAL,
    is_correct INTEGER,
    created_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bad_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT
  )`);
});

module.exports = db;

console.log("Database siap!");