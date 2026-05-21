const { pool } = require('../../db/connect');

// Her vælger vi to tilfældige sange fra en given genre til vores Pairwise (1 mod 1) afstemning.
// Vi sender 'seen' med, som er en liste over sang-IDs vi allerede har vist.
// Tænk på det som at trække kort fra en kortbunke: Vi vil ikke trække det samme kort to gange!
async function hentPairwiseSange(genre, seen) {
    // Vi starter med en basis-søgning: "Find alle sange i denne genre"
    let forespørgsel = "SELECT * FROM tracks WHERE genre = $1";
    const parametre = [genre];

    // Hvis brugeren allerede HAR set nogle sange (seen), 
    // skal vi fortælle databasen, at den skal ignorere dem.
    if (seen && seen.length > 0) {
        // I SQL bygger vi en liste af placeholders: $2, $3, $4 ...
        // Dette er super vigtigt for sikkerheden, så ingen kan hacke os med falsk data i 'seen'.
        const placeholders = [];
        for (let i = 0; i < seen.length; i++) {
            placeholders.push("$" + (i + 2)); // Vi starter fra $2, fordi $1 allerede er genren
            parametre.push(seen[i]);
        }
        // Vi bruger 'NOT IN' som betyder: "Find alle sange, UNDTAGEN disse her".
        forespørgsel += " AND id NOT IN (" + placeholders.join(", ") + ")";
    }

    // ORDER BY RANDOM() blander kortbunken fuldstændigt.
    // LIMIT 2 betyder, at vi kun trækker de øverste to kort.
    forespørgsel += " ORDER BY RANDOM() LIMIT 2";

    const resultat = await pool.query(forespørgsel, parametre);
    return resultat.rows;
}

// Denne funktion bygger det "katalog" af sange, som brugeren skal stemme på i Onboarding.
// Tænk på det som en DJ, der forbereder 10 sange til aftenen. 
// DJ'en vil gerne spille nogle af de meste populære hits (for at fange folk), men også
// nogle ukendte sange (wildcards) for at give underdogs en chance.
async function hentOnboardingSange(genres) {
    const alleSange = [];

    const antalGenrer = genres.length;
    let topPerGenre = 0;

    // Vi tjekker, hvor mange genrer brugeren har valgt for at fordele de 10 pladser retfærdigt.
    if (antalGenrer === 0) {
        console.log("Ingen genrer valgt");
        return alleSange;

    // Hvis kun 1 genre: Tag de 7 allerbedste sange, og lad resten være wildcards.
    } else if (antalGenrer === 1) {
        topPerGenre = 7;

    // Hvis 2 genrer: Tag top 4 fra hver (8 i alt)
    } else if (antalGenrer === 2) {
        topPerGenre = 4;

    // Hvis 3 genrer: Tag top 2 fra hver (6 i alt)
    } else {
        topPerGenre = 2;
    }

    // Nu går DJ'en ud og henter de mest populære sange for HVER valgt genre.
    for (let i = 0; i < genres.length; i++) {
        const genre = genres[i];
        
        // Hent de sange med den højeste elo_rating i denne genre.
        const resultat = await pool.query(
            "SELECT * FROM tracks WHERE genre = $1 ORDER BY elo_rating DESC LIMIT $2",
            [genre, topPerGenre]
        );

        // Put de fundne sange over i vores fælles liste.
        for (let j = 0; j < resultat.rows.length; j++) {
            alleSange.push(resultat.rows[j]);
        }
    }

    // WILDCARDS: Vi skal bruge præcis 10 sange. Hvor mange mangler vi?
    const mangler = 10 - alleSange.length;
    if (mangler > 0) {
        // Først gemmer vi ID'erne på de sange, DJ'en allerede har valgt.
        // Så vi undgår at trække den samme sang to gange.
        const eksisterendeIds = [];
        for (let i = 0; i < alleSange.length; i++) {
            eksisterendeIds.push(alleSange[i].id);
        }

        // Vi vil KUN trække wildcards fra de genrer, brugeren valgte i starten.
        let genreCondition = "genre IN (";
        for (let g = 0; g < genres.length; g++) {
            if (g > 0) genreCondition += ", ";
            genreCondition += "$" + (g + 1);
        }
        genreCondition += ")";

        let baseForespørgsel = "SELECT * FROM tracks WHERE " + genreCondition;
        const parametre = genres.slice(); // Kopierer genrerne over i parameter-listen.

        // Fortæl databasen: "Ignorer de sange jeg allerede har lagt i bunken!"
        if (eksisterendeIds.length > 0) {
            const placeholders = [];
            for (let i = 0; i < eksisterendeIds.length; i++) {
                placeholders.push("$" + (genres.length + i + 1));
                parametre.push(eksisterendeIds[i]);
            }
            baseForespørgsel += " AND id NOT IN (" + placeholders.join(", ") + ")";
        }

        // Ægte "Underdogs" / Wildcards:
        // Vi vælger blot fuldstændig tilfældige sange fra den valgte genre.
        // Databasen har allerede fået besked på at ignorere "eksisterendeIds" (vores "seen"-liste).
        parametre.push(mangler);
        const forespørgsel = baseForespørgsel + " ORDER BY RANDOM() LIMIT $" + parametre.length;

        const tilfældigeSange = await pool.query(forespørgsel, parametre);

        for (let i = 0; i < tilfældigeSange.rows.length; i++) {
            const sang = tilfældigeSange.rows[i];
            sang.is_wildcard = true; // Vi giver sangen et mærkat, så vi kan vise den røde bjælke i Frontend
            alleSange.push(sang);
        }
    }

    return alleSange;
}

// Billboard er appens "Top 20" liste.
// Som David Malan ville sige: Dette er bare en 'Sorted Array' læst direkte fra databasen.
// Vi sorterer (ORDER BY) faldende (DESC), så de sange med flest point ligger øverst.
async function hentBillboard(genre, artist) {
    let forespørgsel = "SELECT * FROM tracks";
    const parametre = [];

    // Hvis brugeren leder efter en bestemt genre (fx i en dropdown)
    if (genre) {
        // ILIKE betyder "Ligeglad med store/små bogstaver" (Case-Insensitive)
        forespørgsel += " WHERE genre ILIKE $1";
        parametre.push(genre);
    
    // Hvis brugeren søger på en artist
    } else if (artist) {
        forespørgsel += " WHERE artist ILIKE $1";
        parametre.push('%' + artist + '%'); // % betyder: Hvad som helst før eller efter navnet
    }

    // Uanset hvad de søgte på, skal vi kun vise de 20 bedste.
    forespørgsel += " ORDER BY elo_rating DESC LIMIT 20";

    const resultat = await pool.query(forespørgsel, parametre);
    return resultat.rows;
}

module.exports = {
    hentPairwiseSange,
    hentOnboardingSange,
    hentBillboard
};
