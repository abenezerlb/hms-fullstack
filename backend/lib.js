import db from "./db.js";
import crypto from "crypto";

/**
 * Executes a SQL query and returns the results
 * @param {string} sql - The SQL query string
 * @param {Array} params - Optional array of parameters for prepared statements
 * @returns {Promise<Array>} - The rows returned by the query
 */

export async function queryDatabase(sql, params = []) {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (error) {
    console.error("❌ Database query failed:", error);
    throw error;
  }
}

export function generateSessionId() {
  return crypto.randomBytes(32).toString("hex");
}
