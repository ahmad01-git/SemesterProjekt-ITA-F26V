const express = require('express');
const path = require('path');
const { pool } = require('../db/connect');

// Vi henter vores funktioner fra de separate service-filer
const { updateElo, saveEloToDatabase } = require('./services/eloService');
const { getTwoPairwiseSongs, getOnboardingSongs, getBillboard } = require('./services/recommendationService');
const { saveUserMixtape, getUserMixtape, resetUser } = require('./services/mixtapeService');
const { mergeMixtapes } = require('./services/mergeService');
const { getNextTrack, getNextTrackFromMixtape, getNextTrackFromMergeMixtape } = require('./services/queueService');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ROUTE 1: Hent alle unikke genrer
// her bruger vi pool.query til at hente alle unikke genrer fra databasen
// og det fungere ved at det returnere en liste over alle unikke genrer i databasen
// fun fact vi har 113 genrer i vores database
app.get('/api/genres', async function (req, res) {
    try {
        const result = await pool.query(
            "SELECT DISTINCT genre FROM tracks WHERE genre IS NOT NULL ORDER BY genre"
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke hente genrer" });
    }
});

// ROUTE 2: Hent to sange til pairwise sammenligning
// her bruger vi getTwoPairwiseSongs fra recommendationService.js til at hente to tilfældige sange fra en given genre
// og det fungere ved at det finder de sang der har den given genre og vælger to tilfældige af dem
// seen er en liste over sange der allerede er vist, så vi ikke viser samme par to gange
app.get('/api/pair', async function (req, res) {
    try {
        const genre = req.query.genre;
        if (!genre) return res.status(400).json({ error: "Genre mangler" });

        const seen = req.query.seen ? req.query.seen.split(',').map(Number) : [];

        const songs = await getTwoPairwiseSongs(genre, seen);
        res.json(songs);
    } catch (err) {
        res.status(500).json({ error: "Fejl ved hentning af par" });
    }
});

// ROUTE 3: Modtag stemme og opdater Elo ratings
// her bruger vi updateElo fra eloService.js til at opdatere elo ratings for de to sange der blev stemt på
// og det fungere ved at det tager elo rating for de to sange og opdaterer dem baseret på resultatet
app.post('/api/vote', async function (req, res) {
    try {
        const { winner_id, loser_id, winner_elo, loser_elo } = req.body;

        const newWinnerRating = updateElo(winner_elo, loser_elo, 1);
        const newLoserRating = updateElo(loser_elo, winner_elo, 0);

        await saveEloToDatabase(winner_id, newWinnerRating);
        await saveEloToDatabase(loser_id, newLoserRating);

        res.json({ success: true, newWinnerRating: newWinnerRating, newLoserRating: newLoserRating });
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke gemme stemme" });
    }
});

// ROUTE 4: Hent næste track
// her bruger vi getNextTrack fra queueService.js til at hente næste track fra databasen
// det fungere ved at det finder det track der har den højeste elo rating
app.get('/api/next-track', async function (req, res) {
    try {
        const track = await getNextTrack();
        res.json(track);
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke hente næste track" });
    }
});

// ROUTE 5: Hent onboarding sange
// her bruger vi getOnboardingSongs fra recommendationService.js til at hente onboarding sange
// det fungere ved at det finder de sang der har den given genre og vælger to tilfældige af dem
app.get('/api/onboarding', async function (req, res) {
    try {
        const genres = req.query.genres ? req.query.genres.split(',') : [];

        const songs = await getOnboardingSongs(genres);
        res.json(songs);
    } catch (err) {
        res.status(500).json({ error: "Fejl ved hentning af onboarding sange" });
    }
});

// ROUTE 6: Gem mixtape (POST)
// her bruger vi saveUserMixtape fra mixtapeService.js til at gemme mixtape
// det fungere ved at det tager en brugernavn og en liste over track id'er og gemmer dem i databasen
app.post('/api/mixtape', async function (req, res) {
    try {
        const { username, trackIds } = req.body;
        await saveUserMixtape(username, trackIds);
        res.json({ success: true, message: "Mixtape gemt!" });
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke gemme mixtape" });
    }
});

// ROUTE 7: Hent mixtape (GET)
// her bruger vi getUserMixtape fra mixtapeService.js til at hente mixtape
// det fungere ved at det tager en brugernavn og returnere en liste over track id'er der er gemt i databasen
app.get('/api/mixtape', async function (req, res) {
    try {
        const username = req.query.username;
        const mixtape = await getUserMixtape(username);
        res.json(mixtape);
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke hente mixtape" });
    }
});

// ROUTE 8: Nulstil bruger (DELETE)
// her bruger vi resetUser fra mixtapeService.js til at nulstille en brugers mixtape og elo ratings
// det fungere ved at det tager en brugernavn og fjerner alle sange fra brugerens mixtape og elo ratings
app.delete('/api/reset', async function (req, res) {
    try {
        const username = req.query.username;
        await resetUser(username);
        res.json({ success: true, message: "Bruger nulstillet" });
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke resette bruger" });
    }
});

// ROUTE 9: Hent billboard (GET)
// her bruger vi getBillboard fra recommendationService.js til at hente billboard
// det fungere ved at det tager en genre og en artist og returnere en liste over de sang der har den given genre og artist
app.get('/api/billboard', async function (req, res) {
    try {
        const genre = req.query.genre;
        const artist = req.query.artist;
        const billboard = await getBillboard(genre, artist);
        res.json(billboard);
    } catch (err) {
        res.status(500).json({ error: "Fejl ved hentning af Billboard" });
    }
});

// ROUTE 10: Flet mixtapes (GET)
// her bruger vi mergeMixtapes fra mergeService.js til at flette to brugeres mixtapes
// det fungere ved at det tager to brugernavne og returnere en samlet liste sorteret efter fælles smag
app.get('/api/merge', async function (req, res) {
    try {
        const userA = req.query.userA;
        const userB = req.query.userB;
        const mergedList = await mergeMixtapes(userA, userB);
        res.json(mergedList);
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke flette mixtapes" });
    }
});

// ROUTE 11: Hent næste track fra mixtape
// her bruger vi getNextTrackFromMixtape fra queueService.js til at hente næste track fra en brugers mixtape
// GET /api/mixtape/next?username=casper&index=0
app.get('/api/mixtape/next', async function (req, res) {
    try {
        const username = req.query.username;
        const index = parseInt(req.query.index) || 0;
        const track = await getNextTrackFromMixtape(username, index);
        res.json(track);
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke hente næste track" });
    }
});

// ROUTE 12: Søgefunktion
// her søger vi på sange der matcher titlen eller artistens navn
// GET /api/search?q=beatles
app.get('/api/search', async function (req, res) {
    try {
        const query = req.query.q;
        const result = await pool.query(
            "SELECT * FROM tracks WHERE title ILIKE $1 OR artist ILIKE $1 LIMIT 20",
            ['%' + query + '%']
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Søgning fejlede" });
    }
});

// Start serveren (Express.js)
// her starter vi serveren og viser en besked i terminalen om at serveren kører
app.listen(PORT, function () {
    console.log('Server kører på http://localhost:' + PORT);
});
