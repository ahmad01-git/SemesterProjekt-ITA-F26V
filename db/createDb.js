
const pool = require('./connect')
const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')

async function createTables() {
  try {
    // Vi sletter tabellerne først så vi starter helt forfra hver gang
    await pool.query('DROP TABLE IF EXISTS tracks CASCADE')
    await pool.query('DROP TABLE IF EXISTS user_mixtapes CASCADE')
    await pool.query('DROP TABLE IF EXISTS user_elo CASCADE')
    //bruger tracks er en tabel der viser sange der er tilføjet til en brugers mixtape,
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
    //bruger mixtapes som en tabel der viser sange der er tilføjet til en brugers mixtape,
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_mixtapes (
        id          SERIAL PRIMARY KEY,
        username    VARCHAR(100),
        track_id    INTEGER REFERENCES tracks(id),
        mixtape_name VARCHAR(255) DEFAULT 'Mit Mixtape',
        added_at    TIMESTAMP DEFAULT NOW()
      )
    `)
    //bruger elo rating, er en tabel der viser sange med elo rating, den er god til at vise hvor mange der har stemt på en sang.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_elo (
        username    VARCHAR(100),
        track_id    INTEGER REFERENCES tracks(id),
        elo_score   INTEGER DEFAULT 1000,
        PRIMARY KEY (username, track_id)
      )
    `)



    console.log('Tabeller oprettet!')
  } catch (error) {
    console.error('Fejl ved oprettelse af tabeller:', error)
  }
}

// Denne funktion fjerner alt det "skrald" vi ikke skal bruge, 
// så vi kun beholder top 100 sange fra hver genre baseret på popularitet.
async function filterTopTracks() {
  try {
    console.log('Finder alle de gode sange baby, ud fra hver genre')

    // så basic vi sletter sange der ikke er top 100 fra hver genre
    await pool.query(`
      DELETE FROM tracks
      WHERE id NOT IN (
        SELECT id
        FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY genre 
                   ORDER BY popularity DESC
                 ) AS rank
          FROM tracks
        ) AS ranked
        WHERE rank <= 100
      );
    `)

    const finalCount = await pool.query('SELECT COUNT(*) FROM tracks')
    console.log(`Færdig! Vi har fundet de bedste sange baby og gemt dem i databasen. Der er nu ${finalCount.rows[0].count} sange tilbage (Top 100 per genre).`)

  } catch (err) {
    console.error('Fejl i filterTopTracks:', err)
  }
}
// her importerer vi sange fra en csv fil til databasen
async function importTracks() {
  const results = []
  console.log('Begynder at læse CSV filen...')

  return new Promise(function (resolve, reject) {
    fs.createReadStream(path.join(__dirname, 'dataset.csv'))
      .pipe(csv())
      .on('data', function (row) {
        results.push(row)
      })
      .on('end', async function () {
        console.log(`Færdig med at læse! Fandt ${results.length} sange i CSV filen.`)
        console.log('Starter indsættelse i databasen (dette kan tage et øjeblik da vi tager det hele)...')

        let count = 0
        // Vi fjerner limit, så vi får ALT ind først, så vi kan finde de bedste sange på tværs af hele filen
        for (let i = 0; i < results.length; i++) {
          const sang = results[i]
          const pop = parseInt(sang.popularity) || 0
          const startElo = 1000 + (pop * 5)

          try {
            await pool.query(`
              INSERT INTO tracks 
                (track_id, title, artist, genre, duration_ms, popularity, danceability, energy, valence, tempo, elo_rating)
              VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
            ])
            count++

            // Vis fremskridt for hver 5000. sang så brugeren ikke tror den er gået i stå
            if (count % 5000 === 0) {
              console.log(`Indsat ${count} sange...`)
            }
          } catch (err) {
            // Vi logger ikke alle fejl for at undgå at fylde terminalen
          }
        }

        console.log(`${count} sange indsat i alt.`)
        resolve()
      })
      .on('error', reject)
  })
}

async function main() {
  // så vi skal jo først starte med at oprette tabellerne, derefter importere sange, 
  // derefter lave toptracks ved at tage top 100 sange fra hver genre og putter ind i en ny tabel
  // og så lukke database forbindelsen, og til sidst viser vi at databasen er klar. 
  try {
    await createTables()
    await importTracks()
    await filterTopTracks()
    await pool.end()
    console.log('Database er 100% klar med top-tracks fra alle genrer!')
  } catch (error) {
    console.error('Noget gik galt i main:', error)
  }
}

main()