const m = require('./backend/src/models/database');
m.getDb().then(db => {
  console.log('DB OK');
  const c = m.query('SELECT COUNT(*) as count FROM countries');
  console.log('Countries:', JSON.stringify(c));
  const a = m.query('SELECT COUNT(*) as count FROM artifacts');
  console.log('Artifacts:', JSON.stringify(a));
  process.exit(0);
}).catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
