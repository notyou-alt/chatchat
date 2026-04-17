const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  console.log("🧨 Clearing tables...");

  db.run("DELETE FROM chat_logs");
  db.run("DELETE FROM questions");
  db.run("DELETE FROM intents");
  db.run("DELETE FROM categories");
  db.run("DELETE FROM bad_words");

  console.log("✅ Tables cleared");

  setTimeout(() => {
    require("./seed");
  }, 1000);
});