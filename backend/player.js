const { pool } = require('../db/connect.js');

const K = 32;
// her bruger vi elo rating systemet til at beregne den nye elo rating for to sange
// den tager elo rating for de to sange og opdatere dem baseret på resultatet
// det fungere ved at det beregner den forventede score for hver sang
// og opdatere elo rating baseret på den forventede score og resultatet
function updateElo(rating1, rating2, actualScore) {
    const p1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
    const nyRating = rating1 + K * (actualScore - p1);
    return Math.round(nyRating);
}
// her vælger vi to tilfældige sange fra en given genre ved at sortere dem tilfældigt
// og returnere de to første sange der har den given genre
async function getTwoPairwiseSongs(genre) {
    const result = await pool.query(
        "SELECT * FROM tracks WHERE genre = $1 ORDER BY RANDOM() LIMIT 2",
        [genre]
    );
    return result.rows;
}

// her vælger vi de to sange der har den højeste elo rating ved at sortere dem efter elo rating
// og returnere de to første sange
async function topGetTwoPairwiseSongs() {
    const result = await pool.query(
        "SELECT * FROM tracks ORDER BY elo_rating DESC LIMIT 2"
    );
    return result.rows;
}
// her gemmer vi elo rating for en given sang i databasen ved at bruge update elo funktionen
// den tager songId og newElo som argumenter og opdatere elo rating for den givne sang
async function saveEloToDatabase(songId, newElo) {
    await pool.query(
        "UPDATE tracks SET elo_rating = $1 WHERE id = $2",
        [newElo, songId]
    );
}
// her vælger vi det næste track ved at sortere alle sange i databasen efter elo rating
// og returnere den sang der har den højeste elo rating
async function getNextTrack() {
    const result = await pool.query(
        "SELECT * FROM tracks ORDER BY elo_rating DESC LIMIT 1"
    );
    return result.rows[0];
}
//----------------Det er måske nogen andre vi kan bruge så de er ikke sat ind i server.js -----------------


async function getTop10Tracks() {
    const result = await pool.query(
        "SELECT * FROM tracks ORDER BY elo_rating DESC LIMIT 10"
    );
    return result.rows;
}


// here bruger vi getOnboardingSongs til at hente onboarding sange
// den fungere ved at den tager en liste over genrer og en liste over sange
// og returnere en liste over de sang der er i begge lister
async function getOnboardingSongs(genres, totalSongs) {
    // beregn topPerGenre og randomPerGenre ud fra genres.length
    // loop igennem genres
    // hent topPerGenre sange med høj elo fra den genre
    // hent randomPerGenre sange tilfældigt fra den genre
    // tilføj dem til resultat-arrayet
    // returner alle sange

    /* let alleSange = [];
    const nGenre = genres.length;

    let topPerGenre = 0;
    let randomPerGenre = 0;

    if (nGenre === 0) {
        console.log("Ingen genrer valgt");
        return alleSange;
    } else if (nGenre === 1) {
        topPerGenre = 7;
        randomPerGenre = 3;
    } else if (nGenre === 2) {
        topPerGenre = 4;
        randomPerGenre = 1;
    } else if (nGenre === 3) {
        topPerGenre = 3;
        randomPerGenre = 1;
    }

    for (let i = 0; i < genres.length; i++) {
        const topResult = await pool.query(
            "SELECT * FROM tracks WHERE genre = $1 ORDER BY elo_rating DESC LIMIT $2",
            [genres[i], topPerGenre]
        );

        const randomResult = await pool.query(
            "SELECT * FROM tracks WHERE genre = $1 AND elo_rating > 1100 ORDER BY RANDOM() LIMIT $2",
            [genres[i], randomPerGenre]
        );

        alleSange.push(...topResult.rows);
        alleSange.push(...randomResult.rows);
    }

    return alleSange;
}
*/


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


// Hvis brugeren kun vælger 1 genre
// tager vi 7 top tracks fra den genre
} else if (nGenre === 1) {

    topPerGenre = 7;


// Hvis brugeren vælger 2 genrer
// tager vi 4 top tracks fra hver genre
} else if (nGenre === 2) {

    topPerGenre = 4;


// Hvis brugeren vælger 3 genrer
// tager vi 3 top tracks fra hver genre
} else if (nGenre === 3) {

    topPerGenre = 3;


// Hvis brugeren vælger 4 genrer
// tager vi 2 top tracks fra hver genre
} else if (nGenre === 4) {

    topPerGenre = 2;


// Hvis brugeren vælger 5 genrer
// tager vi også 2 top tracks fra hver genre
} else if (nGenre === 5) {

    topPerGenre = 2;
}


// Her henter vi top tracks fra hver genre
// Vi går igennem alle valgte genrer én efter én
for (const genre of genres) {

    // Vi henter tracks fra databasen
    // sorteret efter elo_rating fra højest til lavest
    // og tager kun det antal vi har bestemt ovenfor
    const result = await pool.query(`
        SELECT *
        FROM tracks
        WHERE genre = $1
        ORDER BY elo_rating DESC
        LIMIT $2
    `, [genre, topPerGenre]);

    // Her tilføjer vi de fundne tracks til vores liste
    alleSange.push(...result.rows);
}


// Hvis vi stadig ikke har 10 tracks endnu
// fylder vi resten op med tilfældige tracks
while (alleSange.length < 10) {

    // Her vælger vi en tilfældig genre
    const randomGenre =
        genres[Math.floor(Math.random() * genres.length)];

    // Her vælger vi en tilfældig sang fra den genre
    const randomSong = await pool.query(`
        SELECT *
        FROM tracks
        WHERE genre = $1
        ORDER BY RANDOM()
        LIMIT 1
    `, [randomGenre]);

    // Vi tilføjer den tilfældige sang til listen
    alleSange.push(randomSong.rows[0]);
}


// Til sidst returnerer vi listen med alle sangene
return alleSange;

}




//her bruger vi saveUserMixtape til at gemme en brugers mixtape
//den fungere ved at den tager et brugernavn og en liste over track id'er og gemmer dem i databasen
//den bruger on conflict do nothing til at undgå dubletter
async function saveUserMixtape(username, trackIds) {
    // loop og gem
    for (const trackId of trackIds) {
        const result = await pool.query(
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

// OPGAVE: Reset brugerens mixtape og personlige Elo
// TIP: DELETE FROM user_mixtapes WHERE username = $1
// TIP: DELETE FROM user_elo WHERE username = $1
async function resetUser(username) {
    // slet begge tabeller for brugeren

    await pool.query("DELETE FROM user_mixtapes WHERE username = $1", [username]);
    await pool.query("DELETE FROM user_elo WHERE username = $1", [username]);
}

// here bruge getbillboard til at hente billboard med de givne genre og artist
// den fungere ved at den tager en genre og en artist og returnere en liste over de sang der har den given genre og artist 
// man kan ændre limit til 20 for at se top 20 sange der har den given genre og artist, så man kan fx ændre det til 50 hvis man vil se top 50 sange
// Bonus: tag genre eller artist som valgfri parameter til filtrering
async function getBillboard(genre, artist) {
    // hvis genre er givet: tilføj WHERE genre = $1
    // hvis artist er givet: tilføj WHERE artist ILIKE $1
    // returner result.rows
    let query = "SELECT * FROM tracks";
    let params = [];

    if (genre) {
        query += " WHERE genre ILIKE $1";
        params.push(genre);
    } else if (artist) {
        query += " WHERE artist ILIKE $1";
        params.push(`%${artist}%`); // % gør at man kan søge på dele af navnet
    }

    query += " ORDER BY elo_rating DESC LIMIT 20";

    const result = await pool.query(query, params);
    return result.rows;
}

//her bruger vi mergeMixtapes til at flette to brugeres mixtapes og returnere en liste over de sange der er i begge brugeres mixtapes
//også viser de top 10 sange der er i begge brugeres mixtapes og gemmer dem i databasen ved at bruge saveUserMixtape
async function mergeMixtapes(usernameA, usernameB) {
    // hent liste A og liste B
    // find dubletter (samme track_id på begge lister)
    // dubletter går øverst
    // resten sorteres efter elo
    // returner samlet liste
    const listA = await getUserMixtape(usernameA);
    const listB = await getUserMixtape(usernameB);

    // Find sange der er i begge lister (Perfect Match)
    const matches = listA.filter(songA => listB.some(songB => songB.id === songA.id));

    // Find sange der kun er i den ene eller den anden
    const uniqueA = listA.filter(songA => !matches.some(m => m.id === songA.id));
    const uniqueB = listB.filter(songB => !matches.some(m => m.id === songB.id));

    // Saml alle de unikke og sorter dem efter elo_rating
    const combinedUnique = [...uniqueA, ...uniqueB].sort(function (a, b) {
        return b.elo_rating - a.elo_rating;
    });

    // Returner matches først, derefter resten
    return [...matches, ...combinedUnique];
}

module.exports = {
    pool,
    updateElo,
    getTwoPairwiseSongs,
    saveEloToDatabase,
    getNextTrack,
    getOnboardingSongs,
    saveUserMixtape,
    getUserMixtape,
    resetUser,
    getBillboard,
    mergeMixtapes
}