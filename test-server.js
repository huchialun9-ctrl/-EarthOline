const express = require('express');
const http = require('http');
console.log('express loaded');
const app = express();
const server = http.createServer(app);
console.log('server created');

app.get('/', (req, res) => {
  console.log('GET /');
  res.send('Hello');
});

const PORT = 3456;
server.listen(PORT, () => {
  console.log('Listening on http://localhost:' + PORT);
});
