const { pool } = require('../../db/connect');

// Når en bruger har færdiggjort sin afstemning, skal de 15 sange gemmes.
// Vi får et "Array" (en liste) af sang-IDs ('trackIds') og et navn på mixtapet.
async function gemBrugerMixtape(username, trackIds, mixtapeName = 'Mit Mixtape') {
    // Et simpelt 'for...of' loop. 
    // Tænk på det som at tage én bog ad gangen fra en stak og sætte den ind på bogreolen.
    for (const trackId of trackIds) {
        // Bemærk: Hvis der var UNIQUE constraint på (username, track_id), ville DO NOTHING virke.
        // I Neon uden constraint gemmer vi bare rækken.
        await pool.query(
            "INSERT INTO user_mixtapes (username, track_id, mixtape_name) VALUES ($1, $2, $3)",
            [username, trackId, mixtapeName]
        );
    }
}

// Henter enten et specifikt mixtape ("Fredags Rock") ELLER hele brugerens "Privat Billboard".
// For at få alle detaljer (titel, kunstner osv.) bruger vi 'JOIN'.
// SQL JOIN er som at slå op i to kartoteker på samme tid: "Find ID'et i mixtape-kartoteket, og slå så detaljerne op i sang-kartoteket".
async function hentBrugerMixtape(username, mixtapeName) {
    if (mixtapeName) {
        // Hent et specifikt mixtape
        const resultat = await pool.query(
            `SELECT t.*, um.mixtape_name, ue.elo_score as user_elo_rating 
             FROM user_mixtapes um 
             JOIN tracks t ON t.id = um.track_id 
             LEFT JOIN user_elo ue ON ue.track_id = t.id AND ue.username = um.username
             WHERE um.username = $1 AND um.mixtape_name = $2
             ORDER BY COALESCE(ue.elo_score, t.elo_rating) DESC`,
            [username, mixtapeName]
        );
        return resultat.rows;
    } else {
        // Privat Billboard: En samlet oversigt over alle sange i ALLE dine mixtapes.
        // DISTINCT ON (t.id) sikrer, at hvis du har samme sang i to forskellige mixtapes,
        // bliver den kun vist én gang på din private billboard.
        const resultat = await pool.query(
            `SELECT DISTINCT ON (t.id) t.*, ue.elo_score as user_elo_rating 
             FROM user_mixtapes um 
             JOIN tracks t ON t.id = um.track_id 
             LEFT JOIN user_elo ue ON ue.track_id = t.id AND ue.username = um.username
             WHERE um.username = $1 
             ORDER BY t.id, ue.elo_score DESC`,
            [username]
        );
        
        // Når vi bruger DISTINCT ON i Postgres, skal vi sortere efter ID først.
        // Derfor sorterer vi resultatet matematisk her i JavaScript bagefter,
        // så den sang med flest point lander i toppen af listen.
        return resultat.rows.sort((a, b) => {
            const eloA = a.user_elo_rating || a.elo_rating;
            const eloB = b.user_elo_rating || b.elo_rating;
            return eloB - eloA;
        });
    }
}

// Henter en lille liste kun med navnene på dine mixtapes (bruges til dropdown-menuen).
async function hentBrugerMixtapeNavne(username) {
    const resultat = await pool.query(
        "SELECT DISTINCT mixtape_name FROM user_mixtapes WHERE username = $1",
        [username]
    );
    return resultat.rows.map(row => row.mixtape_name);
}

// Sletter ALT data for en specifik bruger.
// Det svarer til at smide deres lånerkort og alle deres bøger ud af biblioteket.
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
