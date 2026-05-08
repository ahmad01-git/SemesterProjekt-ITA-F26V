const pool = require('../db/connect');

const K = 32;
// her bruger vi elo rating systemet til at beregne den nye elo rating for to sange
// den tager elo rating for de to sange og opdatere dem baseret på resultatet
// det fungere ved at det beregner den forventede score for hver sang
// og opdatere elo rating baseret på den forventede score og resultatet
function updateElo(rating1, rating2, actualScore) {
    const p1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
    const nyRating = rating1 + K * (actualScore - p1);
    return Math.round(nyRating);
}
// her vælger vi to tilfældige sange fra en given genre ved at sortere dem tilfældigt
// og returnere de to første sange der har den given genre
async function getTwoPairwiseSongs(genre) {
    const result = await pool.query(
        "SELECT * FROM tracks WHERE genre = $1 ORDER BY RANDOM() LIMIT 2",
        [genre]
    );
    return result.rows;
}
// her gemmer vi elo rating for en given sang i databasen ved at bruge update elo funktionen
// den tager songId og newElo som argumenter og opdatere elo rating for den givne sang
async function saveEloToDatabase(songId, newElo) {
    await pool.query(
        "UPDATE tracks SET elo_rating = $1 WHERE id = $2",
        [newElo, songId]
    );
}
// her vælger vi det næste track ved at sortere alle sange i databasen efter elo rating
// og returnere den sang der har den højeste elo rating
async function getNextTrack() {
    const result = await pool.query(
        "SELECT * FROM tracks ORDER BY elo_rating DESC LIMIT 1"
    );
    return result.rows[0];
}

module.exports = {
    updateElo,
    getTwoPairwiseSongs,
    saveEloToDatabase,
    getNextTrack
};