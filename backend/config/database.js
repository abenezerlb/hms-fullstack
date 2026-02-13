/**
 * Configuration file that exports the database connection
 * This keeps the old import path working for existing code
 */

const database = require('../database/connection');

module.exports = {
    query: (text, params) => database.query(text, params),
    pool: database.getPool(),
    transaction: (callback) => database.transaction(callback),
    checkHealth: () => database.checkHealth(),
    shutdown: () => database.shutdown(),
};