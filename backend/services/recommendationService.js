const { pool } = require('../../db/connect');

// her vælger vi to tilfældige sange fra en given genre ved at sortere dem tilfældigt
// og returnere de to første sange der har den given genre
// seen er en liste over sange der allerede er vist, så vi ikke viser samme par to gange
async function hent2PairwiseSange(genre, seen) {
    let forespørgsel = "SELECT * FROM tracks WHERE genre = $1";
    let parametre = [genre];

    if (seen && seen.length > 0) {
        // Lav et array af placeholders: $2, $3, $4...
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

// her vælger vi de to sange der har den højeste elo rating ved at sortere dem efter elo rating
// og returnere de to første sange
async function hentTopToPairwiseSange() {
    const resultat = await pool.query(
        "SELECT * FROM tracks ORDER BY elo_rating DESC LIMIT 2"
    );
    return resultat.rows;
}

async function hentTop10Sange() {
    const resultat = await pool.query(
        "SELECT * FROM tracks ORDER BY elo_rating DESC LIMIT 10"
    );
    return resultat.rows;
}

// her bruger vi hentOnboardingSange til at hente sange til onboarding
// den fungere ved at den tager en liste over genrer
// og returnere en liste over de sange der passer bedst til de valgte genrer
async function hentOnboardingSange(genres) {
    // Vi laver en tom liste som skal indeholde alle de sange brugeren får anbefalet
    let alleSange = [];

    // Her finder vi ud af hvor mange genrer brugeren har valgt
    const antalGenrer = genres.length;

    // Denne variabel bestemmer hvor mange top tracks vi tager fra hver genre
    let topPerGenre = 0;

    // Hvis brugeren ikke har valgt nogen genrer
    // stopper funktionen og returnerer en tom liste
    if (antalGenrer === 0) {
        console.log("Ingen genrer valgt");
        return alleSange;

    // Hvis brugeren kun vælger 1 genre
    // tager vi 7 top tracks fra den genre
    } else if (antalGenrer === 1) {
        topPerGenre = 7;

    // Hvis brugeren vælger 2 genrer
    // tager vi 4 top tracks fra hver genre
    } else if (antalGenrer === 2) {
        topPerGenre = 4;

    // Hvis brugeren vælger 3 genrer
    // tager vi 3 top tracks fra hver genre
    } else if (antalGenrer === 3) {
        topPerGenre = 3;

    // Hvis brugeren vælger 4 genrer
    // tager vi 2 top tracks fra hver genre
    } else if (antalGenrer === 4) {
        topPerGenre = 2;

    // Hvis brugeren vælger 5 genrer
    // tager vi også 2 top tracks fra hver genre
    } else if (antalGenrer === 5) {
        topPerGenre = 2;
    }

    // Her henter vi top tracks fra hver genre
    // Vi går igennem alle valgte genrer én efter én
    for (const genre of genres) {
        const resultat = await pool.query(
            "SELECT * FROM tracks WHERE genre = $1 ORDER BY elo_rating DESC LIMIT $2",
            [genre, topPerGenre]
        );

        for (let i = 0; i < resultat.rows.length; i++) {
            alleSange.push(resultat.rows[i]);
        }
    }

    // Hvis vi stadig ikke har 10 tracks endnu
    // fylder vi resten op med tilfældige tracks
    while (alleSange.length < 10) {
        const tilfældigGenre = genres[Math.floor(Math.random() * genres.length)];
        const tilfældigSang = await pool.query(
            "SELECT * FROM tracks WHERE genre = $1 ORDER BY RANDOM() LIMIT 1",
            [tilfældigGenre]
        );

        if (tilfældigSang.rows.length > 0) {
            const sang = tilfældigSang.rows[0];

            // Tjek om sangen allerede er i listen
            let erDublet = false;
            for (let i = 0; i < alleSange.length; i++) {
                if (alleSange[i].id === sang.id) {
                    erDublet = true;
                }
            }

            if (!erDublet) {
                alleSange.push(sang);
            }
        }
    }

    // Til sidst returnerer vi listen med alle sangene
    return alleSange;
}

// her bruger vi hentBillboard til at hente billboard med de givne genre og artist
// den fungere ved at den tager en genre og en artist og returnere en liste over de sang der har den given genre og artist
// man kan ændre limit til 20 for at se top 20 sange
async function hentBillboard(genre, artist) {
    let forespørgsel = "SELECT * FROM tracks";
    let parametre = [];

    if (genre) {
        forespørgsel += " WHERE genre ILIKE $1";
        parametre.push(genre);
    } else if (artist) {
        forespørgsel += " WHERE artist ILIKE $1";
        parametre.push('%' + artist + '%'); // % gør at man kan søge på dele af navnet
    }

    forespørgsel += " ORDER BY elo_rating DESC LIMIT 20";

    const resultat = await pool.query(forespørgsel, parametre);
    return resultat.rows;
}

module.exports = {
    hent2PairwiseSange,
    hentTopToPairwiseSange,
    hentTop10Sange,
    hentOnboardingSange,
    hentBillboard
};
