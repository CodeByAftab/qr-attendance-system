const { Pool } = require('pg');
const { logger } = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('connect', () => logger.debug('DB connection acquired'));
pool.on('error',   (err) => logger.error('DB pool error:', err.message));

// Convenience wrapper
const db = {
  query: (text, params) => pool.query(text, params),
  pool,
};

module.exports = db;
