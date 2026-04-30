const pool = require('../db/connect');
const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server virker!');
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server kører på http://localhost:${PORT}`);
});

app.get('/api/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB fejl');
  }
});