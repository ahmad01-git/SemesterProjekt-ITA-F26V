const pool = require('../db/connect');

const K = 32;

function updateElo(rating1, rating2, actualScore) {
    const p1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
    const nyRating = rating1 + K * (actualScore - p1);
    return Math.round(nyRating);
}

async function getTwoPairwiseSongs(genre) {
    const result = await pool.query(
        "SELECT * FROM tracks WHERE genre = $1 ORDER BY RANDOM() LIMIT 2",
        [genre]
    );
    return result.rows;
}

async function saveEloToDatabase(songId, newElo) {
    await pool.query(
        "UPDATE tracks SET elo_rating = $1 WHERE id = $2",
        [newElo, songId]
    );
}

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