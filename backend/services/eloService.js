const { pool } = require('../../db/connect');

const K = 32;

// Elo er et matematisk system lånt fra Skak.
// Idéen er: Hvis en bundskraber slår en verdensmester, skal den vinde vildt mange point!
// Hvis en verdensmester slår en bundskraber, vinder den næsten ingen point (det var forventet).
// actualScore: 1 hvis sangen vandt, 0 hvis den tabte.
function updatereElo(rating1, rating2, actualScore) {
    const p1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
    const nyRating = rating1 + K * (actualScore - p1);
    return Math.round(nyRating);
}

// Gemmer den globale elo-rating. Dette påvirker sangens placering for ALLE brugere (Billboard).
async function gemEloTilDatabase(songId, nyElo) {
    await pool.query(
        "UPDATE tracks SET elo_rating = $1 WHERE id = $2",
        [nyElo, songId]
    );
}

// Gemmer den personlige elo-rating. Dette påvirker KUN brugerens egen "Privat Billboard".
// Ligesom et almindeligt bibliotek vs din egen bogreol derhjemme.
async function gemBrugerEloTilDatabase(username, songId, nyElo) {
    if (!username) return; // Sikkerhed, hvis username ikke er sendt
    
    // Neon PostgreSQL understøtter ON CONFLICT DO UPDATE
    await pool.query(
        `INSERT INTO user_elo (username, track_id, elo_score) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (username, track_id) 
         DO UPDATE SET elo_score = EXCLUDED.elo_score`,
        [username, songId, nyElo]
    );
}

module.exports = {
    updatereElo,
    gemEloTilDatabase,
    gemBrugerEloTilDatabase
};
