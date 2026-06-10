const initSqlJs = require('sql.js');
console.log('sql.js loaded, initializing...');
initSqlJs().then(SQL => {
  console.log('SQL.js initialized');
  const db = new SQL.Database();
  db.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
  db.run('INSERT INTO test VALUES (1, "hello")');
  const stmt = db.prepare('SELECT * FROM test');
  while (stmt.step()) {
    console.log('Row:', JSON.stringify(stmt.getAsObject()));
  }
  stmt.free();
  console.log('All good!');
  process.exit(0);
}).catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
