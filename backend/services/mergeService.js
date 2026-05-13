const { getUserMixtape } = require('./mixtapeService');

//her bruger vi mergeMixtapes til at flette to brugeres mixtapes og returnere en liste over de sange der er i begge brugeres mixtapes
//også viser de top 10 sange der er i begge brugeres mixtapes og gemmer dem i databasen ved at bruge saveUserMixtape
async function mergeMixtapes(usernameA, usernameB) {
    const listA = await getUserMixtape(usernameA);
    const listB = await getUserMixtape(usernameB);

    // --- FASE 1: Find dubletter og beregn gennemsnit ---
    const matches = [];

    listA.forEach(function (songA, indexA) {
        // Vi leder efter songA i listB
        const indexB = listB.findIndex(function (songB) {
            return songB.id === songA.id;
        });

        if (indexB !== -1) {
            // Vi har et match! Beregn gennemsnitlig position
            const gennemsnit = (indexA + indexB) / 2;

            // Tilføj gennemsnittet til sang-objektet
            songA.avgRank = gennemsnit;
            matches.push(songA);
        }
    });

    // Sorter matches så det laveste gennemsnit (bedste placering) kommer først
    matches.sort(function (a, b) {
        return a.avgRank - b.avgRank;
    });

    // --- FASE 2: Find unikke sange ---
    // Vi tager sange fra A, som ikke er i matches
    const uniqueA = listA.filter(function (songA) {
        const erMatch = matches.some(function (m) {
            return m.id === songA.id;
        });
        return !erMatch;
    });

    // Vi tager sange fra B, som ikke er i matches
    const uniqueB = listB.filter(function (songB) {
        const erMatch = matches.some(function (m) {
            return m.id === songB.id;
        });
        return !erMatch;
    });

    // --- FASE 3: Saml det hele ---
    const alleUnikke = uniqueA.concat(uniqueB);

    // Sorter de unikke sange efter deres globale Elo
    alleUnikke.sort(function (a, b) {
        return b.elo_rating - a.elo_rating;
    });

    // Returner matches først (vores fælles smag) og derefter resten
    return matches.concat(alleUnikke);
}

module.exports = {
    mergeMixtapes
};
