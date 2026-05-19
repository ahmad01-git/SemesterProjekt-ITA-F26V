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
// Logikken fordeler sange jævnt på tværs af genrer og fylder op med wildcards.
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

    // Fyld op til 10 sange med wildcards — fordelt jævnt på tværs af genrer
    const mangler = 10 - alleSange.length;
    if (mangler > 0) {
        // Shuffle genrerne så wildcards ikke altid kommer fra samme genre
        const shuffledeGenrer = genres.slice().sort(function () {
            return Math.random() - 0.5;
        });
        let genreIndex = 0;
        let forsøg = 0;

        while (alleSange.length < 10 && forsøg < 50) {
            forsøg++;
            const genre = shuffledeGenrer[genreIndex % shuffledeGenrer.length];
            genreIndex++;

            const tilfældigSang = await pool.query(
                "SELECT * FROM tracks WHERE genre = $1 ORDER BY RANDOM() LIMIT 1",
                [genre]
            );

            if (tilfældigSang.rows.length > 0) {
                const sang = tilfældigSang.rows[0];

                // Tjek om sangen allerede er i listen — undgå dubletter
                let erDublet = false;
                for (let k = 0; k < alleSange.length; k++) {
                    if (alleSange[k].id === sang.id) {
                        erDublet = true;
                        break;
                    }
                }

                if (!erDublet) {
                    sang.is_wildcard = true; // Markér som wildcard — vises som badge i UI
                    alleSange.push(sang);
                }
            }
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
