import pool from './connect.js'
import fs from 'fs'
import csv from 'csv-parser'
import path from 'path'

async function createTables() {
  try {
    // Slet tabellen hvis den findes, så vi starter forfra med det nye Elo-design
    await pool.query('DROP TABLE IF EXISTS tracks')
    
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
        tempo         DECIMAL(6,3),
        elo_rating    INTEGER DEFAULT 1000
      )
    `)
    console.log('Tabeller oprettet!')
  } catch (error) {
    console.error('Fejl ved oprettelse af tabeller:', error)
  }
}

async function importTracks() {
  const results = [];
  console.log('Begynder at læse CSV filen...');

  // 1. Skab en "læsestrøm" (ReadStream) fra din dataset.csv
  fs.createReadStream('./db/dataset.csv')

    // 2. Kør den igennem csv-parseren
    .pipe(csv())

    // 3. Hver gang parseren finder en ny række med data, affyres 'data' eventet
    .on('data', (row) => {
      // Tilføj rækken til vores array
      results.push(row);
    })

    // 4. Når hele filen er læst færdig, affyres 'end' eventet
    .on('end', async () => {
      console.log(`Færdig med at læse! Fandt ${results.length} sange.`);
      console.log('Starter indsættelse i databasen...');

      let count = 0;
      const amountToImport = Math.min(results.length, 1000); // Vi importerer max 1000 sange for at det går hurtigt

      // For-loop igennem sangene
      for (let i = 0; i < amountToImport; i++) {
        const sang = results[i];
        
        // Beregn start Elo ud fra popularity (0-100)
        const pop = parseInt(sang.popularity) || 0;
        const startElo = 1000 + (pop * 5);

        try {
          await pool.query(`
            INSERT INTO tracks (track_id, title, artist, genre, duration_ms, popularity, danceability, energy, valence, tempo, elo_rating)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
            ON CONFLICT (track_id) DO NOTHING
          `, [
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
          ]);
          count++;
        } catch (err) {
          console.error("Fejl ved sang", sang.track_name, err);
        }
      }

      console.log('Færdig med at importere til databasen!');
      process.exit(0);
    });
}

// Vi samler det hele i en main() funktion for at sikre den rigtige rækkefølge
async function main() {
  try {
    await createTables();
    await importTracks();
  } catch (error) {
    console.error("Noget gik helt galt i hovedfunktionen:", error);
  }
}

// Start programmet
main();