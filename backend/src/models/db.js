const { Pool } = require('pg');
const { logger } = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('connect', () => logger.info('✅ DB connection acquired from pool'));
pool.on('error',   (err) => logger.error('❌ Idle DB client error:', err.message));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
```

6. Scroll down → **Commit new file** → commit to `main`

---

After this your repo will have:
```
backend/src/
├── config/database.js   ← already updated (no harm leaving it)
├── models/db.js         ← NEW file, this is what controllers use
└── server.js            ← already updated ✅
