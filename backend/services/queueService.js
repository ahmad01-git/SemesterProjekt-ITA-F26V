const { pool } = require('../../db/connect');

/**
 *  VELKOMMEN TIL KØ-SERVICES (queueService.js) 
 * 
 * Denne fil styrer, hvilken sang der skal spilles som den NÆSTE i vores musikafspiller.
 * Tænk på det som en digital pladespiller, der rækker ned i databasen og fisker den næste plade op.
 * 
 * Vi bruger tre avancerede SQL-koncepter her:
 * 1. JOIN: Forestil dig to stakke papirer. Den ene stak har brugernes mixtape-valg (hvilket track_id de har valgt),
 *          og den anden stak har alle sangenes detaljer (titel, artist, elo_rating). 
 *          En 'JOIN' klistrer de to stakke sammen på det fælles 'track_id', så vi får én samlet oversigt!
 * 2. LIMIT 1: Vi vil kun have ÉN sang ad gangen til vores afspiller.
 * 3. OFFSET: Dette fungerer som at bladre i en bog. Hvis 'nummerIndex' er 0, starter vi på side 0 (den første sang).
 *            Hvis 'nummerIndex' er 5, hopper (skipper) vi de første 5 sange over og tager sang nr. 6.
 */

/**
 * Hent næste sang fra en specifik brugers gemte mixtape baseret på positionen (nummerIndex).
 * @param {string} username - Hvem er brugeren? (F.eks. "Casper")
 * @param {number} nummerIndex - Hvilken sang er vi nået til? (0 = første, 1 = anden, osv.)
 */
async function hentNæsteSangFraMixtape(username, nummerIndex) {
    // Vi udfører en asynkron forespørgsel til databasen.
    // Vi forbinder ('JOIN') tabellen 'user_mixtapes' med 'tracks', så vi kan se sangens detaljer.
    // Vi sorterer efter den globale 'elo_rating' i faldende rækkefølge (højeste rating først).
    const resultat = await pool.query(
        "SELECT tracks.* FROM user_mixtapes " +
        "JOIN tracks ON tracks.id = user_mixtapes.track_id " +
        "WHERE user_mixtapes.username = $1 " +
        "ORDER BY tracks.elo_rating DESC " +
        "LIMIT 1 OFFSET $2",
        [username, nummerIndex]
    );

    // Fandt vi en sang?
    if (resultat.rows.length > 0) {
        return resultat.rows[0]; // Ja, returner den!
    } else {
        return null; // Nej, vi har spillet alle sange på listen!
    }
}

/**
 * Hent næste sang fra et FLETTE-mixtape (når to venner hører musik sammen).
 * @param {string} username - Navnet på flette-playlisten (F.eks. "Casper&Mads")
 * @param {number} nummerIndex - Hvilken sang er vi nået til? (0, 1, 2...)
 */
async function hentNæsteSangFraFletning(username, nummerIndex) {
    // Her fletter vi 'merge_mixtape' tabellen med 'tracks'.
    // Læg mærke til sorteringen: Vi sorterer efter 'avgRank' i STIGENDE orden (ASC).
    // Hvorfor? Fordi de bedste fælles sange har det laveste gennemsnit (f.eks. 0 eller 1).
    const resultat = await pool.query(
        "SELECT tracks.* FROM merge_mixtape " +
        "JOIN tracks ON tracks.id = merge_mixtape.track_id " +
        "WHERE merge_mixtape.username = $1 " +
        "ORDER BY merge_mixtape.avgRank ASC " +
        "LIMIT 1 OFFSET $2",
        [username, nummerIndex]
    );

    if (resultat.rows.length > 0) {
        return resultat.rows[0];
    } else {
        return null; // Ingen flere sange på flette-listen
    }
}

/**
 * BACKUP-FUNKTION: Hvis alt andet fejler, eller playlisten er tom.
 * Vælger simpelthen den sang, der har den absolut højeste globale Elo-rating i hele systemet.
 */
async function hentNæsteSang() {
    const resultat = await pool.query(
        "SELECT * FROM tracks ORDER BY elo_rating DESC LIMIT 1"
    );
    return resultat.rows[0];
}

module.exports = {
    hentNæsteSangFraMixtape,
    hentNæsteSangFraFletning,
    hentNæsteSang
};
