const express = require('express');
const path = require('path');
const pool = require('../db/connect');

const {
    updateElo,
    getTwoPairwiseSongs,
    saveEloToDatabase,
    getNextTrack
} = require('./player');

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
// her bruger vi getTwoPairwiseSongs fra player.js til at hente to tilfældige sange fra en given genre
// og det fungere ved at det finder de sang der har den given genre og vælger to tilfældige af dem

app.get('/api/pair', async function (req, res) {
    try {
        const genre = req.query.genre;
        if (!genre) return res.status(400).json({ error: "Genre mangler" });

        const songs = await getTwoPairwiseSongs(genre);
        res.json(songs);
    } catch (err) {
        res.status(500).json({ error: "Fejl ved hentning af par" });
    }
});

// ROUTE 3: Modtag stemme og opdater Elo ratings
// her bruger vi updateElo fra player.js til at opdatere elo ratings for de to sange der blev stemt på
// og det fungere ved at det tager elo rating for de to sange og opdaterer dem baseret på resultatet
app.post('/api/vote', async function (req, res) {
    try {
        const { winner_id, loser_id, winner_elo, loser_elo } = req.body;

        const newWinnerRating = updateElo(winner_elo, loser_elo, 1);
        const newLoserRating = updateElo(loser_elo, winner_elo, 0);

        await saveEloToDatabase(winner_id, newWinnerRating);
        await saveEloToDatabase(loser_id, newLoserRating);

        res.json({ success: true, newWinnerRating, newLoserRating });
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke gemme stemme" });
    }
});

// ROUTE 4: Hent næste track
// her bruger vi getNextTrack fra player.js til at hente næste track fra databasen
// det fungere ved at det finder det track der har den højeste elo rating
app.get('/api/next-track', async function (req, res) {
    try {
        const track = await getNextTrack();
        res.json(track);
    } catch (err) {
        res.status(500).json({ error: "Kunne ikke hente næste track" });
    }
});

app.listen(PORT, function () {
    console.log('Server kører på http://localhost:' + PORT);
});