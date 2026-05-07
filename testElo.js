// 1. Hent funktionen fra din player.js (Sørg for stien er rigtig!)
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