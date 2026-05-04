// Dette er et lille test-script for at se, hvordan Elo-ratingen fungerer i praksis.
// Du kan køre det ved at skrive: node testElo.js

// Konstanten K bestemmer, hvor store udsving der er per "kamp". Skak bruger ofte 32.
const K = 32;

// Funktionen der beregner den nye Elo-rating efter et opgør (en Pairwise Comparison)
// rating1: Den sang der VANDT (eller tabte, afhængig af actualScore)
// rating2: Den sang der TABTE
// actualScore: 1 hvis sang 1 vandt, 0 hvis sang 1 tabte
function updateElo(rating1, rating2, actualScore) {
    // Beregn forventet sandsynlighed for at sang 1 vinder
    const p1 = 1.0 / (1.0 + Math.pow(10, (rating2 - rating1) / 400));

    // Beregn den nye rating
    const nyRating1 = rating1 + K * (actualScore - p1);

    return Math.round(nyRating1);
}

// Lad os lave to fiktive sange til vores test
let justinBieber = {
    navn: "Justin Bieber - Baby",
    popularity: 90,
    // Vi bruger formel: 1000 + (popularity * 5)
    elo: 1000 + (90 * 5) // 1450
};

let ukendtIndieSang = {
    navn: "Ukendt Indie Band - Regnvejr",
    popularity: 10,
    elo: 1000 + (10 * 5) // 1050
};

console.log("=== START ELO RATINGS ===");
console.log(`${justinBieber.navn}: ${justinBieber.elo} Elo`);
console.log(`${ukendtIndieSang.navn}: ${ukendtIndieSang.elo} Elo\n`);

// SCENARIE 1: Justin Bieber vinder (som forventet, fordi han er mest populær)
console.log("=== KAMP 1: Justin Bieber VINDER over Ukendt Indie Sang ===");
let nyBieberElo = updateElo(justinBieber.elo, ukendtIndieSang.elo, 1);
let nyIndieElo = updateElo(ukendtIndieSang.elo, justinBieber.elo, 0);

console.log(`${justinBieber.navn} går fra ${justinBieber.elo} -> ${nyBieberElo} Elo`);
console.log(`${ukendtIndieSang.navn} går fra ${ukendtIndieSang.elo} -> ${nyIndieElo} Elo`);
console.log("(Som du kan se, er ændringen meget lille, fordi algoritmen FORVENTEDE at Bieber ville vinde)\n");

// Opdater deres ratings
justinBieber.elo = nyBieberElo;
ukendtIndieSang.elo = nyIndieElo;

// SCENARIE 2: Ukendt Indie Sang vinder (En overraskelse!)
console.log("=== KAMP 2: Ukendt Indie Sang VINDER pludselig over Justin Bieber! ===");
// Indie sangen (parameter 1) vinder (actualScore = 1)
nyIndieElo = updateElo(ukendtIndieSang.elo, justinBieber.elo, 1);
nyBieberElo = updateElo(justinBieber.elo, ukendtIndieSang.elo, 0);

console.log(`${ukendtIndieSang.navn} går fra ${ukendtIndieSang.elo} -> ${nyIndieElo} Elo`);
console.log(`${justinBieber.navn} går fra ${justinBieber.elo} -> ${nyBieberElo} Elo`);
console.log("(Her er ændringen MEGET stor, fordi the underdog vandt!)\n");
