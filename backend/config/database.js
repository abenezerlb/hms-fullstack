// Central database configuration that uses your existing db.js
const { query, pool } = require('../database/db');

module.exports = {
  query,     // Expose the query function
  pool,      // Expose the pool
  // Helper method for transactions
  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};