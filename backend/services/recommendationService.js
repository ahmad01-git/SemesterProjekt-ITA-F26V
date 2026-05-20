const { pool } = require('../../db/connect');

// Her vælger vi to tilfældige sange fra en given genre.
// 'seen' er en liste over sang-IDs der allerede er vist, så vi undgår gentagelser.
async function hent2PairwiseSange(genre, seen) {
    let forespørgsel = "SELECT * FROM tracks WHERE genre = $1";
    let parametre = [genre];

    if (seen && seen.length > 0) {
        // Byg en liste af placeholders: $2, $3, $4 ...
        let placeholders = [];
        for (let i = 0; i < seen.length; i++) {
            placeholders.push("$" + (i + 2));
            parametre.push(seen[i]);
        }
        forespørgsel += " AND id NOT IN (" + placeholders.join(", ") + ")";
    }

    forespørgsel += " ORDER BY RANDOM() LIMIT 2";

    const resultat = await pool.query(forespørgsel, parametre);
    return resultat.rows;
}

// Her henter vi sange til onboarding baseret på brugerens valgte genrer.
// Logikken fordeler sange jævnt på tværs af genrer og fylder op med wildcards fra SAMME genrer.
async function hentOnboardingSange(genres) {
    let alleSange = [];

    const antalGenrer = genres.length;
    let topPerGenre = 0;

    // Returner tomt array hvis ingen genrer er valgt
    if (antalGenrer === 0) {
        console.log("Ingen genrer valgt");
        return alleSange;

    // 1 genre: tag 7 top tracks
    } else if (antalGenrer === 1) {
        topPerGenre = 7;

    // 2 genrer: tag 4 top tracks fra hver
    } else if (antalGenrer === 2) {
        topPerGenre = 4;

    // 3-5 genrer: tag 2 top tracks fra hver — resten fyldes med wildcards
    } else {
        topPerGenre = 2;
    }

    // Hent top tracks fra hver genre
    for (let i = 0; i < genres.length; i++) {
        const genre = genres[i];
        const resultat = await pool.query(
            "SELECT * FROM tracks WHERE genre = $1 ORDER BY elo_rating DESC LIMIT $2",
            [genre, topPerGenre]
        );

        for (let j = 0; j < resultat.rows.length; j++) {
            alleSange.push(resultat.rows[j]);
        }
    }

    // Fyld op til 10 sange med wildcards — VIGTIG: KUN fra de VALGTE genrer!
    const mangler = 10 - alleSange.length;
    if (mangler > 0) {
        // Vi udelukker de sange, vi allerede har valgt
        let eksisterendeIds = [];
        for (let i = 0; i < alleSange.length; i++) {
            eksisterendeIds.push(alleSange[i].id);
        }

        // Byg WHERE-klausul for valgte genrer
        let genreCondition = "(";
        for (let g = 0; g < genres.length; g++) {
            if (g > 0) genreCondition += " OR ";
            genreCondition += "genre = $" + (g + 1);
        }
        genreCondition += ")";

        let forespørgsel = "SELECT * FROM tracks WHERE " + genreCondition;
        let parametre = genres.slice(); // Kopier genrer som første parametre

        // Tilføj excluded IDs
        if (eksisterendeIds.length > 0) {
            let placeholders = [];
            for (let i = 0; i < eksisterendeIds.length; i++) {
                placeholders.push("$" + (genres.length + i + 1));
                parametre.push(eksisterendeIds[i]);
            }
            forespørgsel += " AND id NOT IN (" + placeholders.join(", ") + ")";
        }

        // Limit sættes som det sidste parameter
        parametre.push(mangler);
        forespørgsel += " ORDER BY RANDOM() LIMIT $" + parametre.length;

        const tilfældigeSange = await pool.query(forespørgsel, parametre);

        for (let i = 0; i < tilfældigeSange.rows.length; i++) {
            const sang = tilfældigeSange.rows[i];
            sang.is_wildcard = true; // Markér som wildcard
            alleSange.push(sang);
        }
    }

    return alleSange;
}

// Her henter vi billboard — en liste over sange sorteret efter global Elo-rating.
// Man kan filtrere på genre eller artist via query-parametre.
async function hentBillboard(genre, artist) {
    let forespørgsel = "SELECT * FROM tracks";
    let parametre = [];

    if (genre) {
        forespørgsel += " WHERE genre ILIKE $1";
        parametre.push(genre);
    } else if (artist) {
        forespørgsel += " WHERE artist ILIKE $1";
        parametre.push('%' + artist + '%');
    }

    forespørgsel += " ORDER BY elo_rating DESC LIMIT 20";

    const resultat = await pool.query(forespørgsel, parametre);
    return resultat.rows;
}

module.exports = {
    hent2PairwiseSange,
    hentOnboardingSange,
    hentBillboard
};
