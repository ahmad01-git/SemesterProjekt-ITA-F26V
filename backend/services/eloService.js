const { pool } = require('../../db/connect');

const K = 32;

// her bruger vi elo rating systemet til at beregne den nye elo rating for to sange
// den tager elo rating for de to sange og opdatere dem baseret på resultatet
// det fungere ved at det beregner den forventede score for hver sang
// og opdatere elo rating baseret på den forventede score og resultatet
function updatereElo(rating1, rating2, actualScore) {
    const p1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
    const nyRating = rating1 + K * (actualScore - p1);
    return Math.round(nyRating);
}

// her gemmer vi elo rating for en given sang i databasen
// den tager songId og nyElo som argumenter og opdatere elo rating for den givne sang
async function gemEloTilDatabase(songId, nyElo) {
    await pool.query(
        "UPDATE tracks SET elo_rating = $1 WHERE id = $2",
        [nyElo, songId]
    );
}

// her gemmer vi en specifik brugers personlige elo rating for en sang
// hvis brugeren allerede har en elo for sangen, opdateres den
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
