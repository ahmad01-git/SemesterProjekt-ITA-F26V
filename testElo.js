const {
    pool,
    updateElo,
    getTwoPairwiseSongs,
    getBillboard,
    getOnboardingSongs,
    saveUserMixtape,
    getUserMixtape,
    mergeMixtapes
} = require('./backend/player.js');

async function runTests() {
    console.log("=== 🏆 DEN ULTIMATIVE SYSTEM-TEST ===\n");

    // --- TEST 1: Avanceret Elo-Matematik ---
    console.log("--- TEST 1: Elo Scenarier ---");
    const scenarios = [
        { a: 1000, b: 1000, win: 1, desc: "Lige kamp (begge begyndere)" },
        { a: 2000, b: 2000, win: 1, desc: "To mestre i duel" },
        { a: 1800, b: 1000, win: 0, desc: "Kæmpe overraskelse (Underdog vinder)" },
        { a: 1800, b: 1000, win: 1, desc: "Favorit vinder som forventet" }
    ];

    scenarios.forEach(s => {
        const nyA = updateElo(s.a, s.b, s.win);
        const diff = nyA - s.a;
        console.log(`[${s.desc}]: ${s.a} -> ${nyA} (${diff > 0 ? '+' : ''}${diff})`);
    });


    // --- TEST 2: Onboarding (Forskellige antal genrer) ---
    console.log("\n--- TEST 2: Onboarding Logik (Mængde-tjek) ---");
    const testCases = [
        { g: ['pop'], desc: "1 genre (7 top + 3 random)" },
        { g: ['pop', 'rock'], desc: "2 genrer (4+1 pr. genre)" },
        { g: ['pop', 'rock', 'jazz'], desc: "3 genrer (3+1 pr. genre)" }
    ];

    for (const t of testCases) {
        try {
            const songs = await getOnboardingSongs(t.g, 10);
            console.log(`✅ ${t.desc}: Fandt ${songs.length} sange.`);
            // Vis de første par sange for at bekræfte blandingen
            const titler = songs.slice(0, 3).map(s => s.title).join(", ");
            console.log(`   Eksempel: ${titler}...`);
        } catch (e) {
            console.log(`❌ Fejl i ${t.desc}: ${e.message}`);
        }
    }


    // --- TEST 3: User Mixtape & Database Tabeller ---
    console.log("\n--- TEST 3: Database Mixtape (Gem/Hent) ---");
    const testUser = "test_bruger_" + Math.floor(Math.random() * 1000);
    try {
        // Vi henter 3 tilfældige sange fra DB for at få nogle ID'er
        const someSongs = await pool.query("SELECT id FROM tracks LIMIT 3");
        const trackIds = someSongs.rows.map(r => r.id);

        console.log(`Prøver at gemme ID'er [${trackIds}] til bruger: ${testUser}`);
        await saveUserMixtape(testUser, trackIds);

        const mixtape = await getUserMixtape(testUser);
        console.log(`✅ Succes! Hentet ${mixtape.length} sange tilbage for "${testUser}"`);
    } catch (err) {
        if (err.message.includes("user_mixtapes")) {
            console.log("❌ FEJL: Tabellen 'user_mixtapes' mangler i din database!");
            console.log("   LØSNING: Kør 'CREATE TABLE' kommandoen i din Neon Console.");
        } else {
            console.log("❌ Fejl:", err.message);
        }
    }


    // --- TEST 4: Social Merge (X-Faktor) ---
    console.log("\n--- TEST 4: Social Merge ---");
    try {
        const merged = await mergeMixtapes(testUser, testUser); // Vi merger med os selv for at tvinge matches
        console.log(`✅ Merge test ok. Fællesliste størrelse: ${merged.length}`);
        if (merged.length > 0) {
            console.log(`   Top match: ${merged[0].title}`);
        }
    } catch (err) {
        console.log("❌ Fejl i Merge:", err.message);
    }


    // --- TEST 5: Global Billboard ---
    console.log("\n--- TEST 5: Global Billboard Top 5 ---");
    try {
        const top = await getBillboard();
        top.slice(0, 5).forEach((s, i) => {
            console.log(`   ${i + 1}. ${s.title} (${s.elo_rating} Elo)`);
        });
        console.log("✅ Billboard leveret.");
    } catch (err) {
        console.log("❌ Fejl i Billboard:", err.message);
    }

    console.log("\n=== 🏁 ALLE TEST FÆRDIGE ===");
    process.exit();
}

runTests();