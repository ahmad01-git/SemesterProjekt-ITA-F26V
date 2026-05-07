const pool = require('./connect');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

async function createTables() {
  try {
    await pool.query('DROP TABLE IF EXISTS tracks');

    await pool.query(`
      CREATE TABLE tracks (
        id            SERIAL PRIMARY KEY,
        track_id      VARCHAR(50) UNIQUE,
        title         VARCHAR(255) NOT NULL,
        artist        VARCHAR(255) NOT NULL,
        genre         VARCHAR(100),
        duration_ms   INTEGER,
        popularity    INTEGER,
        danceability  DECIMAL(4,3),
        energy        DECIMAL(4,3),
        valence       DECIMAL(4,3),
        tempo         DECIMAL(6,3),
        elo_rating    INTEGER DEFAULT 1000
      )
    `);

    console.log('Tabel oprettet!');
  } catch (error) {
    console.error('Fejl ved oprettelse af tabel:', error);
  }
}

async function importTracks() {
  const genreCounter = {};
  let count = 0;

  console.log('Begynder at læse CSV filen...');

  return new Promise((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, 'dataset.csv'))
      .pipe(csv())
      .on('data', async (sang) => {
        const genre = sang.track_genre;

        if (!genreCounter[genre]) {
          genreCounter[genre] = 0;
        }

        if (genreCounter[genre] >= 10) {
          return;
        }

        genreCounter[genre]++;

        const pop = parseInt(sang.popularity) || 0;
        const startElo = 1000 + pop * 5;

        try {
          await pool.query(
            `
            INSERT INTO tracks
              (track_id, title, artist, genre, duration_ms, popularity, danceability, energy, valence, tempo, elo_rating)
            VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (track_id) DO NOTHING
            `,
            [
              sang.track_id,
              sang.track_name,
              sang.artists,
              sang.track_genre,
              parseInt(sang.duration_ms) || 0,
              pop,
              parseFloat(sang.danceability) || 0,
              parseFloat(sang.energy) || 0,
              parseFloat(sang.valence) || 0,
              parseFloat(sang.tempo) || 0,
              startElo
            ]
          );

          count++;
          console.log(`Indsat ${count} sange...`);
        } catch (err) {
          console.error('Fejl ved indsættelse:', err.message);
        }
      })
      .on('end', () => {
        console.log(`Færdig! Indsatte ca. ${count} sange.`);
        resolve();
      })
      .on('error', reject);
  });
}

async function main() {
  try {
    await createTables();
    await importTracks();
    await pool.end();

    console.log('Database er klar med 10 sange pr. genre!');
  } catch (error) {
    console.error('Noget gik galt:', error);
  }
}

main();