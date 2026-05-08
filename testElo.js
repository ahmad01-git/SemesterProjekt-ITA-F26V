// 1. Hent funktionen fra din player.js (Sørg for stien er rigtig!)

// du kan se listen over de forskellige ting med at blandt andet skrive node backend/server.js og efter hvis du ville se genre: http://localhost:3000/api/genres
// med genre så sad jeg også selv meget fast og det var endelig fordi jeg skrev dem med store bogstaver i stedet for små
//http://localhost:3000/api/pair?genre=pop
//http://localhost:3000/api/vote?winner_id=1&loser_id=2&winner_elo=1000&loser_elo=1000
//http://localhost:3000/api/next-track

// 1. Importer de nødvendige funktioner og database-pool
// Vi henter pool fra din db eller player fil for at kunne teste forbindelsen
const { pool, updateElo, getTwoPairwiseSongs } = require('./backend/player.js');

async function runTests() {
    console.log("=== 🚀 START AF SYSTEM-TEST ===\n");

    // --- TEST 1: Elo-Matematik (Logik-tjek) ---
    console.log("--- TEST 1: Elo Matematik ---");
    let ratingA = 1200;
    let ratingB = 1200;

    // Scenarie: Lige kamp
    let nyA = updateElo(ratingA, ratingB, 1); // A vinder
    let nyB = updateElo(ratingB, ratingA, 0); // B taber

    console.log(`Lige kamp (1200 vs 1200):`);
    console.log(`   Vinder: 1200 -> ${nyA} (+${nyA - 1200})`);
    console.log(`   Taber:  1200 -> ${nyB} (${nyB - 1200})\n`);

    // Scenarie: Underdog vinder over favorit
    ratingA = 1600; // Favorit
    ratingB = 1000; // Underdog
    nyA = updateElo(ratingA, ratingB, 0); // Favorit taber
    nyB = updateElo(ratingB, ratingA, 1); // Underdog vinder

    console.log(`Stor forskel (Favorit 1600 vs Underdog 1000):`);
    console.log(`   Underdog vinder: 1000 -> ${nyB} (+${nyB - 1000}) - Bør stige meget!`);
    console.log(`   Favorit taber:   1600 -> ${nyA} (${nyA - 1600}) - Bør falde meget!\n`);


    // --- TEST 2: Database Forbindelse ---
    console.log("--- TEST 2: Database Forbindelse ---");
    try {
        const res = await pool.query('SELECT NOW()');
        console.log("✅ Database forbindelse virker! Tid fra DB:", res.rows[0].now);

        const countRes = await pool.query('SELECT COUNT(*) FROM tracks');
        console.log(`✅ Antal sange i 'tracks' tabellen: ${countRes.rows[0].count}\n`);
    } catch (err) {
        console.log("❌ Database fejl:", err.message);
    }


    // --- TEST 3: Pairwise Hentning (SQL-tjek) ---
    console.log("--- TEST 3: Pairwise Hentning pr. Genre ---");
    try {
        // Vi finder først en tilfældig genre der rent faktisk findes i jeres data
        const genreRes = await pool.query('SELECT genre FROM tracks WHERE genre IS NOT NULL LIMIT 1');

        if (genreRes.rows.length > 0) {
            const testGenre = genreRes.rows[0].genre;
            console.log(`Prøver at hente par for genren: "${testGenre}"...`);

            const pair = await getTwoPairwiseSongs(testGenre);

            if (pair && pair.length === 2) {
                console.log(`✅ Succes! Hentet 2 sange:`);
                console.log(`   1. ${pair[0].title} (${pair[0].elo_rating} Elo)`);
                console.log(`   2. ${pair[1].title} (${pair[1].elo_rating} Elo)`);
            } else {
                console.log(`⚠️ Advarsel: Hentet ${pair ? pair.length : 0} sange. Tjek om genren har nok sange.`);
            }
        } else {
            console.log("⚠️ Kunne ikke finde nogen genrer i databasen.");
        }
    } catch (err) {
        console.log("❌ Fejl ved hentning af sange:", err.message);
    }


    // --- TEST 4: Billboard Tjek ---
    console.log("\n--- TEST 4: Billboard Topliste ---");
    try {
        const result = await pool.query('SELECT title, elo_rating FROM tracks ORDER BY elo_rating DESC LIMIT 3');
        console.log("Top 3 sange lige nu:");
        result.rows.forEach((song, i) => {
            console.log(`   ${i + 1}. ${song.title} (${song.elo_rating} Elo)`);
        });
        console.log("✅ Billboard query virker.");
    } catch (err) {
        console.log("❌ Fejl ved Billboard test:", err.message);
    }

    console.log("\n=== 🏁 TEST GENNEMFØRT ===");
    process.exit();
}

// Kør hele baduljen
runTests();