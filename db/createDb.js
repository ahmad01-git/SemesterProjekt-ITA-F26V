import pool from './connect.js'
import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'

async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracks (
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
        tempo         DECIMAL(6,3)
      )
    `)
    console.log('Tabeller oprettet!')
  } catch (error) {
    console.error('Fejl ved oprettelse af tabeller:', error)
  } finally {
    process.exit(0)
  }
}

async function importTracks() {
  const results = [];
  console.log('Begynder at læse CSV filen...');

  // 1. Skab en "læsestrøm" (ReadStream) fra din dataset.csv
  fs.createReadStream('../backend/dataset.csv')

    // 2. Kør den igennem csv-parseren
    .pipe(csv())

    // 3. Hver gang parseren finder en ny række med data, affyres 'data' eventet
    .on('data', (row) => {
      // row er nu et JavaScript objekt med kolonnerne fra CSV-filen
      // Her kan du tilføje row til dit 'results' array!
      // (Brug push)

    })

    // 4. Når hele filen er læst færdig, affyres 'end' eventet
    .on('end', async () => {
      console.log(`Færdig med at læse! Fandt ${results.length} sange.`);
      console.log('Starter indsættelse i databasen...');

      // For-loop der kun tager de første f.eks. 1000 sange
      for (let i = 0; i < 1000; i++) {
        const sang = results[i];

        try {
          // Her skal du skrive din SQL INSERT forespørgsel!
          // Brug sang.track_id, sang.track_name, sang.artists osv.
          /*
          await pool.query(
            `INSERT INTO tracks (track_id, title, artist, genre) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (track_id) DO NOTHING`, 
            [sang.track_id, sang.track_name, sang.artists, sang.track_genre]
          );
          */
          await pool.query('INSERT INTO tracks (track_id, title, artist, genre, duration_ms, popularity, danceability, energy, valence, tempo)')
          VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT(track_id) DO NOTHING', [
          row.track_id,
            row.track_name,
            row.artists,
            row.track_genre,
            parseInt(row.duration_ms),
            parseInt(row.popularity),
            parseFloat(row.danceability),
            parseFloat(row.energy),
            parseFloat(row.valence),
            parseFloat(row.tempo)
          ])
  count++
} catch (err) {
  console.error("Fejl ved sang", sang.track_name, err);
}
      }

console.log('Færdig med at importere til databasen!');

// Husk at lukke programmet til sidst
process.exit(0);
    });
}














createTables()