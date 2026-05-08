// 1. Hent funktionen fra din player.js (Sørg for stien er rigtig!)

// du kan se listen over de forskellige ting med at blandt andet skrive node backend/server.js og efter hvis du ville se genre: http://localhost:3000/api/genres
// med genre så sad jeg også selv meget fast og det var endelig fordi jeg skrev dem med store bogstaver i stedet for små
//http://localhost:3000/api/pair?genre=pop
//http://localhost:3000/api/vote?winner_id=1&loser_id=2&winner_elo=1000&loser_elo=1000
//http://localhost:3000/api/next-track

const { updateElo } = require('./backend/player.js');
// 2. Setup test data
let justinBieber = {
    navn: "Justin Bieber - Baby",
    elo: 1450 // 1000 + (90 * 5)
};

let ukendtIndieSang = {
    navn: "Ukendt Indie Band - Regnvejr",
    elo: 1050 // 1000 + (10 * 5)
};

console.log("=== START ELO RATINGS ===");
console.log(`${justinBieber.navn}: ${justinBieber.elo} Elo`);
console.log(`${ukendtIndieSang.navn}: ${ukendtIndieSang.elo} Elo\n`);

// --- TEST SCENARIE ---
console.log("=== KAMP: Ukendt Indie Sang VINDER over Justin Bieber! ===");

// Vi beregner nye tal ved hjælp af funktionen fra player.js
const nyIndieElo = updateElo(ukendtIndieSang.elo, justinBieber.elo, 1);
const nyBieberElo = updateElo(justinBieber.elo, ukendtIndieSang.elo, 0);

console.log(`${ukendtIndieSang.navn}: ${ukendtIndieSang.elo} -> ${nyIndieElo} (Stigning: ${nyIndieElo - ukendtIndieSang.elo})`);
console.log(`${justinBieber.navn}: ${justinBieber.elo} -> ${nyBieberElo} (Fald: ${nyBieberElo - justinBieber.elo})`);