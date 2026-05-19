const { pool } = require('../../db/connect');

// her bruger vi gemBrugerMixtape til at gemme en brugers mixtape
// den fungere ved at den tager et brugernavn og en liste over track id'er og gemmer dem i databasen
// den bruger on conflict do nothing til at undgå dubletter
async function gemBrugerMixtape(username, trackIds, mixtapeName = 'Mit Mixtape') {
    // loop og gem
    for (const trackId of trackIds) {
        // Bemærk: Hvis der var UNIQUE constraint på (username, track_id), ville DO NOTHING virke.
        // I Neon uden constraint gemmer vi bare rækken.
        await pool.query(
            "INSERT INTO user_mixtapes (username, track_id, mixtape_name) VALUES ($1, $2, $3)",
            [username, trackId, mixtapeName]
        );
    }
}

// her bruger vi hentBrugerMixtape til at hente en brugers mixtape
// den fungere ved at den tager et brugernavn og returnere en liste over de sang der er i brugerens mixtape
async function hentBrugerMixtape(username) {
    const resultat = await pool.query(
        "SELECT tracks.*, user_mixtapes.mixtape_name FROM user_mixtapes JOIN tracks ON tracks.id = user_mixtapes.track_id WHERE user_mixtapes.username = $1",
        [username]
    );
    return resultat.rows;
}

// her kan man nulstille en brugers mixtape og elo ratings
// det fungere ved at det tager et brugernavn og fjerner alle sange fra brugerens mixtape og elo ratings
async function nulstilBruger(username) {
    // slet mixtape for brugeren
    await pool.query("DELETE FROM user_mixtapes WHERE username = $1", [username]);

    // user_elo tabellen er valgfri - den sletter vi kun hvis den eksisterer
    const tabelTjek = await pool.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'user_elo'"
    );
    if (tabelTjek.rows.length > 0) {
        await pool.query("DELETE FROM user_elo WHERE username = $1", [username]);
    }
}

module.exports = {
    gemBrugerMixtape,
    hentBrugerMixtape,
    nulstilBruger
};
