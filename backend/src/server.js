require('dotenv').config();
const app    = require('./app');
const db     = require('./models/db');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function start() {
  // Verify the DATABASE_URL + SSL config before accepting traffic.
  // If this fails, Render marks the deploy unhealthy immediately.
  try {
    const { rows } = await db.query('SELECT NOW() AS db_time');
    logger.info(`✅ Database connected — ${rows[0].db_time}`);
  } catch (err) {
    logger.error(`❌ Database connection failed: ${err.message}`);
    logger.error('   → Check DATABASE_URL is set in Render environment variables');
    process.exit(1);
  }

  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

start();
