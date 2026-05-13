const { pool } = require('../../db/connect');

// her vælger vi to tilfældige sange fra en given genre ved at sortere dem tilfældigt
// og returnere de to første sange der har den given genre
async function getTwoPairwiseSongs(genre, seen) {
    let query = "SELECT * FROM tracks WHERE genre = $1";
    let params = [genre];

    if (seen && seen.length > 0) {
        // Lav et array af placeholders: $2, $3, $4...
        let placeholders = [];
        for (let i = 0; i < seen.length; i++) {
            placeholders.push("$" + (i + 2));
            params.push(seen[i]);
        }
        query += " AND id NOT IN (" + placeholders.join(", ") + ")";
    }

    query += " ORDER BY RANDOM() LIMIT 2";

    const result = await pool.query(query, params);
    return result.rows;
}

// her vælger vi de to sange der har den højeste elo rating ved at sortere dem efter elo rating
// og returnere de to første sange
async function topGetTwoTopPairwiseSongs() {
    const result = await pool.query(
        "SELECT * FROM tracks ORDER BY elo_rating DESC LIMIT 2"
    );
    return result.rows;
}


async function getTop10Tracks() {
    const result = await pool.query(
        "SELECT * FROM tracks ORDER BY elo_rating DESC LIMIT 10"
    );
    return result.rows;
}

async function getOnboardingSongs(genres) {
    // Vi laver en tom liste som skal indeholde alle de sange brugeren får anbefalet
    let alleSange = [];

    // Her finder vi ud af hvor mange genrer brugeren har valgt
    const nGenre = genres.length;

    // Denne variabel bestemmer hvor mange top tracks vi tager fra hver genre
    let topPerGenre = 0;

    // Hvis brugeren ikke har valgt nogen genrer
    // stopper funktionen og returnerer en tom liste
    if (nGenre === 0) {
        console.log("Ingen genrer valgt");
        return alleSange;
    } else if (nGenre === 1) {
        topPerGenre = 7;
    } else if (nGenre === 2) {
        topPerGenre = 4;
    } else if (nGenre === 3) {
        topPerGenre = 3;
    } else if (nGenre === 4) {
        topPerGenre = 2;
    } else if (nGenre === 5) {
        topPerGenre = 2;
    }

    // Her henter vi top tracks fra hver genre
    for (const genre of genres) {
        const result = await pool.query(
            "SELECT * FROM tracks WHERE genre = $1 ORDER BY elo_rating DESC LIMIT $2",
            [genre, topPerGenre]
        );

        for (let i = 0; i < result.rows.length; i++) {
            alleSange.push(result.rows[i]);
        }
    }

    // Hvis vi stadig ikke har 10 tracks endnu
    // fylder vi resten op med tilfældige tracks
    while (alleSange.length < 10) {
        const randomGenre = genres[Math.floor(Math.random() * genres.length)];
        const randomSong = await pool.query(
            "SELECT * FROM tracks WHERE genre = $1 ORDER BY RANDOM() LIMIT 1",
            [randomGenre]
        );

        if (randomSong.rows.length > 0) {
            const sang = randomSong.rows[0];

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

    return alleSange;
}

// here bruge getbillboard til at hente billboard med de givne genre og artist
async function getBillboard(genre, artist) {
    let query = "SELECT * FROM tracks";
    let params = [];

    if (genre) {
        query += " WHERE genre ILIKE $1";
        params.push(genre);
    } else if (artist) {
        query += " WHERE artist ILIKE $1";
        params.push('%' + artist + '%'); // % gør at man kan søge på dele af navnet
    }

    query += " ORDER BY elo_rating DESC LIMIT 20";

    const result = await pool.query(query, params);
    return result.rows;
}

module.exports = {
    getTwoPairwiseSongs,
    topGetTwoTopPairwiseSongs,
    getTop10Tracks,
    getOnboardingSongs,
    getBillboard
};
