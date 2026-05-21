const express = require('express');
const path = require('path');
const { pool } = require('../db/connect');

// Vi henter vores funktioner fra de separate service-filer
const { opdaterElo, gemEloTilDatabase, gemBrugerEloTilDatabase } = require('./services/eloService');
const { hentPairwiseSange, hentOnboardingSange, hentBillboard } = require('./services/recommendationService');
const { gemBrugerMixtape, hentBrugerMixtape, hentBrugerMixtapeNavne } = require('./services/mixtapeService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ROUTE 1: Hent alle unikke genrer
// Tænk på en "route" (rute) som en tjener på en restaurant. 
// Når frontend beder tjeneren om '/api/genres', går tjeneren ud i køkkenet (databasen),
// og beder om 'DISTINCT genre' (alle unikke genrer).
// Hvis alt går godt, serverer vi dem tilbage (res.json). Hvis det går galt, kaster vi en 500-fejl.
app.get('/api/genres', async function (req, res) {
    console.log("-> [GET /api/genres] Henter alle unikke genrer...");
    try {
        const resultat = await pool.query(
            "SELECT DISTINCT genre FROM tracks WHERE genre IS NOT NULL ORDER BY genre"
        );
        res.json(resultat.rows);
    } catch (err) {
        console.error("Fejl i /api/genres:", err);
        res.status(500).json({ error: "Kunne ikke hente genrer" });
    }
});

// ROUTE 2: Hent to sange til pairwise sammenligning (Onboarding)
// Frontend sender en "query parameter" (?genre=pop). Tjeneren kigger på det (req.query.genre)
// for at vide præcis, hvilken genre brugeren ønsker.
// Vi bruger variablen 'seen' (set) til at huske, hvilke sange vi allerede har vist, 
// så brugeren ikke stemmer på den samme sang to gange.
app.get('/api/pair', async function (req, res) {
    const genre = req.query.genre;
    console.log("-> [GET /api/pair] Henter sange for genre: " + genre);
    try {
        if (!genre) return res.status(400).json({ error: "Genre mangler" });

        const seen = req.query.seen ? req.query.seen.split(',').map(Number) : [];

        const sange = await hentPairwiseSange(genre, seen);
        res.json(sange);
    } catch (err) {
        console.error("Fejl i /api/pair:", err);
        res.status(500).json({ error: "Fejl ved hentning af par" });
    }
});

// ROUTE 3: Modtag stemme og opdater Elo ratings
// Her bruger vi 'app.post'. Forskellen på GET og POST er, at med GET beder vi bare om data.
// Med POST *sender* vi ny data op til serveren for at ændre noget (ligesom at poste et brev).
// req.body indeholder selve brevet: Hvem vandt, hvem tabte, og hvad var deres gamle point?
app.post('/api/vote', async function (req, res) {
    console.log("-> [POST /api/vote] Modtog en ny stemme!");
    try {
        const { winner_id, loser_id, winner_elo, loser_elo, username } = req.body;

        // Simpel validering — alle fire felter skal være til stede
        if (!winner_id || !loser_id || winner_elo === undefined || loser_elo === undefined) {
            return res.status(400).json({ error: "winner_id, loser_id, winner_elo og loser_elo er påkrævet" });
        }

        const nyVinderRating = opdaterElo(winner_elo, loser_elo, 1);
        const nyTaberRating = opdaterElo(loser_elo, winner_elo, 0);

        await gemEloTilDatabase(winner_id, nyVinderRating);
        await gemEloTilDatabase(loser_id, nyTaberRating);

        // Hvis vi har et brugernavn, opdaterer vi også den personlige elo-rating
        if (username) {
            await gemBrugerEloTilDatabase(username, winner_id, nyVinderRating);
            await gemBrugerEloTilDatabase(username, loser_id, nyTaberRating);
        }

        res.json({ success: true, nyVinderRating: nyVinderRating, nyTaberRating: nyTaberRating });
    } catch (err) {
        console.error("Fejl i /api/vote:", err);
        res.status(500).json({ error: "Kunne ikke gemme stemme" });
    }
});

// ROUTE 5: Hent onboarding sange
// Når brugeren har valgt op til 3 genrer, sender de dem ind som et array.
// Vores 'recommendationService' blander derefter en god pulje af sange (både populære og wildcards).
app.get('/api/onboarding', async function (req, res) {
    const genres = req.query.genres ? req.query.genres.split(',') : [];
    console.log("-> [GET /api/onboarding] Starter onboarding for genrer: " + genres.join(', '));
    try {
        const sange = await hentOnboardingSange(genres);
        console.log("<- Fandt " + sange.length + " sange til onboarding");
        res.json(sange);
    } catch (err) {
        console.error("Fejl i /api/onboarding:", err);
        res.status(500).json({ error: "Fejl ved hentning af onboarding sange" });
    }
});

// ROUTE 6: Gem mixtape (POST)
// Her sender brugeren deres færdige, rangerede liste op til serveren.
// Vi gemmer hver enkelt sang i 'user_mixtapes'-tabellen knyttet til brugerens navn.
app.post('/api/mixtape', async function (req, res) {
    console.log("-> [POST /api/mixtape] Gemmer mixtape...");
    try {
        const { username, trackIds, name } = req.body;

        if (!username || !trackIds || trackIds.length === 0) {
            return res.status(400).json({ error: "username og trackIds er påkrævet" });
        }

        console.log("Brugernavn: " + username + " | Mixtape: " + name + " | Sange: " + trackIds.length);
        await gemBrugerMixtape(username, trackIds, name);
        res.json({ success: true, message: "Mixtape gemt!" });
    } catch (err) {
        console.error("Fejl i /api/mixtape (POST):", err);
        res.status(500).json({ error: "Kunne ikke gemme mixtape" });
    }
});

// ROUTE 7: Hent mixtape (GET)
// Frontend beder om at få vist en brugers mixtape. 
// Hvis de beder om et specifikt navn (fx "Fredags Rock"), henter vi dét. 
// Ellers henter vi hele deres "Privat Billboard" (alle sange de nogensinde har gemt).
app.get('/api/mixtape', async function (req, res) {
    const username = req.query.username;
    const mixtapeName = req.query.mixtapeName; // Kan være tom
    console.log("-> [GET /api/mixtape] Henter mixtape for bruger: " + username);
    try {
        const mixtape = await hentBrugerMixtape(username, mixtapeName);
        res.json(mixtape);
    } catch (err) {
        console.error("Fejl i /api/mixtape (GET):", err);
        res.status(500).json({ error: "Kunne ikke hente mixtape" });
    }
});

// ROUTE 7.5: Hent en brugers mixtape-navne (GET)
app.get('/api/mixtapes', async function (req, res) {
    const username = req.query.username;
    console.log("-> [GET /api/mixtapes] Henter liste over mixtapes for: " + username);
    try {
        if (!username) return res.status(400).json({ error: "username er påkrævet" });
        
        const mixtapes = await hentBrugerMixtapeNavne(username);
        res.json(mixtapes);
    } catch (err) {
        console.error("Fejl i /api/mixtapes:", err);
        res.status(500).json({ error: "Kunne ikke hente mixtape-navne" });
    }
});

// ROUTE 9: Hent billboard (GET)
// Henter en global top 20 liste over de bedste sange.
// Kan filtreres på enten en specifik genre eller en bestemt artist.
app.get('/api/billboard', async function (req, res) {
    try {
        const genre = req.query.genre;
        const artist = req.query.artist;
        const resultater = await hentBillboard(genre, artist);
        res.json(resultater);
    } catch (err) {
        res.status(500).json({ error: "Fejl ved hentning af Billboard" });
    }
});

// Catch-all route til SPA (Single Page Application)
// Sørger for at Express sender index.html tilbage, selv hvis man refresher siden
app.use(function (req, res) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start serveren (Express.js)
// Serveren sidder nu og lytter (listen) konstant på port 3000.
// Ligesom en telefon der er tændt og venter på, at nogen ringer til den.
app.listen(PORT, function () {
    console.log('Server kører på http://localhost:' + PORT);
});
