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
// Hvis mixtapeName er angivet, henter den kun det ene mixtape.
// Ellers returnerer den en samlet unik liste over ALLE sange i brugerens mixtapes, sorteret efter deres personlige elo (Privat Billboard)
async function hentBrugerMixtape(username, mixtapeName) {
    if (mixtapeName) {
        // Hent et specifikt mixtape
        const resultat = await pool.query(
            `SELECT t.*, um.mixtape_name, ue.elo_score as user_elo_rating 
             FROM user_mixtapes um 
             JOIN tracks t ON t.id = um.track_id 
             LEFT JOIN user_elo ue ON ue.track_id = t.id AND ue.username = um.username
             WHERE um.username = $1 AND um.mixtape_name = $2`,
            [username, mixtapeName]
        );
        return resultat.rows;
    } else {
        // Privat Billboard: Alle unikke sange fra brugerens mixtapes, sorteret efter personlig elo
        const resultat = await pool.query(
            `SELECT DISTINCT ON (t.id) t.*, ue.elo_score as user_elo_rating 
             FROM user_mixtapes um 
             JOIN tracks t ON t.id = um.track_id 
             LEFT JOIN user_elo ue ON ue.track_id = t.id AND ue.username = um.username
             WHERE um.username = $1 
             ORDER BY t.id, ue.elo_score DESC`,
            [username]
        );
        
        // PostgreSQL's DISTINCT ON kræver at man sorterer efter det unikke felt først.
        // Derfor sorterer vi resultatet efter elo i JavaScript bagefter:
        return resultat.rows.sort((a, b) => {
            const eloA = a.user_elo_rating || a.elo_rating;
            const eloB = b.user_elo_rating || b.elo_rating;
            return eloB - eloA;
        });
    }
}

// Henter en liste af alle unikke mixtape-navne for en bruger
async function hentBrugerMixtapeNavne(username) {
    const resultat = await pool.query(
        "SELECT DISTINCT mixtape_name FROM user_mixtapes WHERE username = $1",
        [username]
    );
    return resultat.rows.map(row => row.mixtape_name);
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
    hentBrugerMixtapeNavne,
    nulstilBruger
};
