const { pool } = require('../../db/connect');

// Hent næste track fra brugerens mixtape baseret på position
async function getNextTrackFromMixtape(username, nummerIndex) {
    const result = await pool.query(
        "SELECT tracks.* FROM user_mixtapes " +
        "JOIN tracks ON tracks.id = user_mixtapes.track_id " +
        "WHERE user_mixtapes.username = $1 " +
        "ORDER BY tracks.elo_rating DESC " +
        "LIMIT 1 OFFSET $2",
        [username, nummerIndex]
    );

    if (result.rows.length > 0) {
        return result.rows[0];
    } else {
        return null; // Ingen flere sange på listen
    }
}

// Hent næste track fra brugerens merge mixtape baseret på position
async function getNextTrackFromMergeMixtape(username, nummerIndex) {
    // Bemærk: merge_mixtape tabellen skal eksistere i databasen hvis denne bruges
    const result = await pool.query(
        "SELECT tracks.* FROM merge_mixtape " +
        "JOIN tracks ON tracks.id = merge_mixtape.track_id " +
        "WHERE merge_mixtape.username = $1 " +
        "ORDER BY merge_mixtape.avgRank ASC " +
        "LIMIT 1 OFFSET $2",
        [username, nummerIndex]
    );

    if (result.rows.length > 0) {
        return result.rows[0];
    } else {
        return null; // Ingen flere sange på listen
    }
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
    getNextTrackFromMixtape,
    getNextTrackFromMergeMixtape,
    getNextTrack
};
