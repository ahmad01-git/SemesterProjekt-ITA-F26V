const { pool } = require('../../db/connect');

// Hent næste sang fra brugerens mixtape baseret på position
// username: hvem er det
// nummerIndex: hvilken sang er vi nået til (0, 1, 2...)
async function hentNæsteSangFraMixtape(username, nummerIndex) {
    const resultat = await pool.query(
        "SELECT tracks.* FROM user_mixtapes " +
        "JOIN tracks ON tracks.id = user_mixtapes.track_id " +
        "WHERE user_mixtapes.username = $1 " +
        "ORDER BY tracks.elo_rating DESC " +
        "LIMIT 1 OFFSET $2",
        [username, nummerIndex]
    );

    if (resultat.rows.length > 0) {
        return resultat.rows[0];
    } else {
        return null; // Ingen flere sange på listen
    }
}

// Hent næste sang fra brugerens flettede mixtape baseret på position
// username: hvem er det
// nummerIndex: hvilken sang er vi nået til (0, 1, 2...)
async function hentNæsteSangFraFletning(username, nummerIndex) {
    const resultat = await pool.query(
        "SELECT tracks.* FROM merge_mixtape " +
        "JOIN tracks ON tracks.id = merge_mixtape.track_id " +
        "WHERE merge_mixtape.username = $1 " +
        "ORDER BY merge_mixtape.avgRank ASC " +
        "LIMIT 1 OFFSET $2",
        [username, nummerIndex]
    );

    if (resultat.rows.length > 0) {
        return resultat.rows[0];
    } else {
        return null; // Ingen flere sange på listen
    }
}

// her vælger vi den sang der har den højeste elo rating i hele databasen
// og returnerer den som den næste sang der skal spilles
async function hentNæsteSang() {
    const resultat = await pool.query(
        "SELECT * FROM tracks ORDER BY elo_rating DESC LIMIT 1"
    );
    return resultat.rows[0];
}

module.exports = {
    hentNæsteSangFraMixtape,
    hentNæsteSangFraFletning,
    hentNæsteSang
};
