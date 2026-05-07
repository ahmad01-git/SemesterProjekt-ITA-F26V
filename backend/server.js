const pool = require('../db/connect');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors()); // så frontend kan hente data

// TEST
app.get('/', (req, res) => {
  res.send('Server virker!');
});

// TEST DATABASE
app.get('/api/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB fejl');
  }
});


// HENT SANGE (med søgning + sortering efter Elo)
app.get('/api/songs', async (req, res) => {
  try {
    const search = req.query.search || '';

    const result = await pool.query(
      `SELECT * FROM tracks
       WHERE title ILIKE $1
       OR artist ILIKE $1
       OR genre ILIKE $1
       ORDER BY elo_rating DESC
       LIMIT 20`,
      [`%${search}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Fejl ved hentning af sange');
  }
});


// AFSPIL SANG → øg Elo (simpel version)
app.post('/api/play/:id', async (req, res) => {
  try {
    await pool.query(
      'UPDATE tracks SET elo_rating = elo_rating + 10 WHERE id = $1',
      [req.params.id]
    );

    res.json({ message: 'Elo opdateret' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Fejl ved opdatering af Elo');
  }
});


const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server kører på http://localhost:${PORT}`);
});