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
  }
}

async function importTracks() {
  const results = [];
  let count = 0;
  console.log('Begynder at læse CSV filen...');

  // 1. Skab en "læsestrøm" (ReadStream) fra din dataset.csv
  fs.createReadStream('../backend/dataset.csv')
    .pipe(csv())
    .on('data', (row) => {
      results.push(row); // Gemmer hver række i vores array
    })
    .on('end', async () => {
      console.log(`Færdig med at læse! Fandt ${results.length} sange.`);
      console.log('Starter indsættelse i databasen...');

      // Vi tager de første 1000 sange som test
      for (let i = 0; i < Math.min(results.length, 1000); i++) {
        const sang = results[i];
        
        try {
          await pool.query(`
            INSERT INTO tracks (track_id, title, artist, genre, duration_ms, popularity, danceability, energy, valence, tempo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            ON CONFLICT (track_id) DO NOTHING`, 
            [
              sang.track_id,
              sang.track_name,
              sang.artists,
              sang.track_genre,
              parseInt(sang.duration_ms),
              parseInt(sang.popularity),
              parseFloat(sang.danceability),
              parseFloat(sang.energy),
              parseFloat(sang.valence),
              parseFloat(sang.tempo)
            ]
          );
          count++;
        } catch (err) {
          console.error("Fejl ved sang:", sang.track_name, err);
        }
      }

      console.log(`Færdig! Succesfuldt importeret ${count} sange.`);
      process.exit(0);
    });
}

// Skift mellem disse to for at køre dem
// await createTables(); 
importTracks();