const { pool } = require('../../db/connect');

//her bruger vi saveUserMixtape til at gemme en brugers mixtape
//den fungere ved at den tager et brugernavn og en liste over track id'er og gemmer dem i databasen
//den bruger on conflict do nothing til at undgå dubletter
async function saveUserMixtape(username, trackIds) {
    // loop og gem
    for (const trackId of trackIds) {
        await pool.query(
            "INSERT INTO user_mixtapes (username, track_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [username, trackId]
        );
    }
}

// her bruger vi getUserMixtape til at hente en brugers mixtape
// den fungere ved at den tager et brugernavn og returnere en liste over de sang der er i brugerens mixtape
async function getUserMixtape(username) {
    // hent og returner
    const result = await pool.query(
        "SELECT tracks.* FROM user_mixtapes JOIN tracks ON tracks.id = user_mixtapes.track_id WHERE user_mixtapes.username = $1",
        [username]
    );
    return result.rows;
}

// her kan man nulstille en brugers mixtape og elo ratings
// det fungere ved at det tager en brugernavn og fjerner alle sange fra brugerens mixtape og elo ratings
async function resetUser(username) {
    // slet begge tabeller for brugeren
    await pool.query("DELETE FROM user_mixtapes WHERE username = $1", [username]);

    // user_elo tabellen er valgfri - den sletter vi kun hvis den eksisterer
    const tableCheck = await pool.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'user_elo'"
    );
    if (tableCheck.rows.length > 0) {
        await pool.query("DELETE FROM user_elo WHERE username = $1", [username]);
    }
}

module.exports = {
    saveUserMixtape,
    getUserMixtape,
    resetUser
};
