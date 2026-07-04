// backend/utils/asyncDb.js
const pool = require("../db");

const dbQuery = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
};

const dbGet = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows[0] ?? null;
};

const dbRun = async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return {
    rowCount: result.rowCount,
    rows: result.rows,
  };
};

module.exports = { dbQuery, dbGet, dbRun };