// Adds demo accounts and activity to the database in DATABASE_URL.
// Usage: node scripts/seed-demo.js           (skips if the demo data is already there)
//        node scripts/seed-demo.js --reset   (removes the demo accounts and adds them again)
require('dotenv').config();
const { seedDemo } = require('../src/config/seedDemo');
const db = require('../src/config/db');

seedDemo({ force: process.argv.includes('--reset') })
  .catch(() => { process.exitCode = 1; })
  .finally(() => db.pool.end());
