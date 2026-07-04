// backend/db.js
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

pool.connect((err) => {
  if (err) {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  }
  console.log("Connected to Supabase PostgreSQL");
});

module.exports = pool;