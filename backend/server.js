const express = require('express');
const path = require('path');
const { pool } = require('../db/connect');

// Vi henter vores funktioner fra de separate service-filer
const { updatereElo, gemEloTilDatabase } = require('./services/eloService');
const { hent2PairwiseSange, hentOnboardingSange, hentBillboard } = require('./services/recommendationService');
const { gemBrugerMixtape, hentBrugerMixtape, nulstilBruger } = require('./services/mixtapeService');
const { fletMixtapes } = require('./services/mergeService');
const { hentNæsteSang, hentNæsteSangFraMixtape, hentNæsteSangFraFletning } = require('./services/queueService');

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
        const resultat = await pool.query(
            "SELECT DISTINCT genre FROM tracks WHERE genre IS NOT NULL ORDER BY genre"
        );
        res.json(resultat.rows);
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke hente genrer" });
    }
});

// ROUTE 2: Hent to sange til pairwise sammenligning
// her bruger vi hent2PairwiseSange fra recommendationService.js til at hente to tilfældige sange fra en given genre
// seen er en liste over sange der allerede er vist, så vi ikke viser samme par to gange
app.get('/api/pair', async function (req, res) {
    try {
        const genre = req.query.genre;
        if (!genre) return res.status(400).json({ error: "Genre mangler" });

        const seen = req.query.seen ? req.query.seen.split(',').map(Number) : [];

        const sange = await hent2PairwiseSange(genre, seen);
        res.json(sange);
    } catch (err) {
        res.status(500).json({ error: "Fejl ved hentning af par" });
    }
});

// ROUTE 3: Modtag stemme og opdater Elo ratings
// her bruger vi updatereElo fra eloService.js til at opdatere elo ratings for de to sange der blev stemt på
// og det fungere ved at det tager elo rating for de to sange og opdaterer dem baseret på resultatet
app.post('/api/vote', async function (req, res) {
    try {
        const { winner_id, loser_id, winner_elo, loser_elo } = req.body;

        const nyVinderRating = updatereElo(winner_elo, loser_elo, 1);
        const nyTaberRating = updatereElo(loser_elo, winner_elo, 0);

        await gemEloTilDatabase(winner_id, nyVinderRating);
        await gemEloTilDatabase(loser_id, nyTaberRating);

        res.json({ success: true, nyVinderRating: nyVinderRating, nyTaberRating: nyTaberRating });
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke gemme stemme" });
    }
});

// ROUTE 4: Hent næste sang
// her bruger vi hentNæsteSang fra queueService.js til at hente den sang med den højeste elo rating
app.get('/api/next-track', async function (req, res) {
    try {
        const sang = await hentNæsteSang();
        res.json(sang);
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke hente næste sang" });
    }
});

// ROUTE 5: Hent onboarding sange
// her bruger vi hentOnboardingSange fra recommendationService.js til at hente onboarding sange
// det fungere ved at det finder de sang der har den given genre og vælger dem baseret på elo og tilfældighed
app.get('/api/onboarding', async function (req, res) {
    try {
        const genres = req.query.genres ? req.query.genres.split(',') : [];

        const sange = await hentOnboardingSange(genres);
        res.json(sange);
    } catch (err) {
        res.status(500).json({ error: "Fejl ved hentning af onboarding sange" });
    }
});

// ROUTE 6: Gem mixtape (POST)
// her bruger vi gemBrugerMixtape fra mixtapeService.js til at gemme mixtape
// det fungere ved at det tager et brugernavn og en liste over track id'er og gemmer dem i databasen
app.post('/api/mixtape', async function (req, res) {
    try {
        const { username, trackIds } = req.body;
        await gemBrugerMixtape(username, trackIds);
        res.json({ success: true, message: "Mixtape gemt!" });
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke gemme mixtape" });
    }
});

// ROUTE 7: Hent mixtape (GET)
// her bruger vi hentBrugerMixtape fra mixtapeService.js til at hente mixtape
// det fungere ved at det tager et brugernavn og returnere en liste over track id'er der er gemt i databasen
app.get('/api/mixtape', async function (req, res) {
    try {
        const username = req.query.username;
        const mixtape = await hentBrugerMixtape(username);
        res.json(mixtape);
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke hente mixtape" });
    }
});

// ROUTE 8: Nulstil bruger (DELETE)
// her bruger vi nulstilBruger fra mixtapeService.js til at nulstille en brugers mixtape og elo ratings
// det fungere ved at det tager et brugernavn og fjerner alle sange fra brugerens mixtape og elo ratings
app.delete('/api/reset', async function (req, res) {
    try {
        const username = req.query.username;
        await nulstilBruger(username);
        res.json({ success: true, message: "Bruger nulstillet" });
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke nulstille bruger" });
    }
});

// ROUTE 9: Hent billboard (GET)
// her bruger vi hentBillboard fra recommendationService.js til at hente billboard
// det fungere ved at det tager en genre og en artist og returnere en liste over de sang der har den given genre og artist
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

// ROUTE 10: Flet mixtapes (GET)
// her bruger vi fletMixtapes fra mergeService.js til at flette to brugeres mixtapes
// det fungere ved at det tager to brugernavne og returnere en samlet liste sorteret efter fælles smag
app.get('/api/merge', async function (req, res) {
    try {
        const userA = req.query.userA;
        const userB = req.query.userB;
        const flettetListe = await fletMixtapes(userA, userB);
        res.json(flettetListe);
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke flette mixtapes" });
    }
});

// ROUTE 11: Hent næste sang fra mixtape
// her bruger vi hentNæsteSangFraMixtape fra queueService.js til at hente næste sang fra en brugers mixtape
// GET /api/mixtape/next?username=casper&index=0
app.get('/api/mixtape/next', async function (req, res) {
    try {
        const username = req.query.username;
        const index = parseInt(req.query.index) || 0;
        const sang = await hentNæsteSangFraMixtape(username, index);
        res.json(sang);
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke hente næste sang" });
    }
});

// ROUTE 12: Søgefunktion
// her søger vi på sange der matcher titlen eller artistens navn
// GET /api/search?q=beatles
app.get('/api/search', async function (req, res) {
    try {
        const søgeTekst = req.query.q;
        const resultat = await pool.query(
            "SELECT * FROM tracks WHERE title ILIKE $1 OR artist ILIKE $1 LIMIT 20",
            ['%' + søgeTekst + '%']
        );
        res.json(resultat.rows);
    } catch (err) {
        res.status(500).json({ error: "Søgning fejlede" });
    }
});

// Start serveren (Express.js)
// her starter vi serveren og viser en besked i terminalen om at serveren kører
app.listen(PORT, function () {
    console.log('Server kører på http://localhost:' + PORT);
});
