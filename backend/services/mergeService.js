const { hentBrugerMixtape } = require('./mixtapeService');

// her bruger vi fletMixtapes til at flette to brugeres mixtapes og returnere en samlet liste
// fælles sange kommer øverst sorteret efter gennemsnitlig placering
// resten sorteres efter elo rating
async function fletMixtapes(usernameA, usernameB) {
    const listeA = await hentBrugerMixtape(usernameA);
    const listeB = await hentBrugerMixtape(usernameB);

    // --- FASE 1: Find fælles sange og beregn gennemsnit ---
    const fællesSange = [];

    listeA.forEach(function (sangA, indexA) {
        // Vi leder efter sangA i listeB
        const indexB = listeB.findIndex(function (sangB) {
            return sangB.id === sangA.id;
        });

        if (indexB !== -1) {
            // Vi har et match! Beregn gennemsnitlig position
            const gennemsnit = (indexA + indexB) / 2;

            // Tilføj gennemsnittet til sang-objektet
            sangA.avgRank = gennemsnit;
            fællesSange.push(sangA);
        }
    });

    // Sorter fællesSange så det laveste gennemsnit (bedste placering) kommer først
    fællesSange.sort(function (a, b) {
        return a.avgRank - b.avgRank;
    });

    // --- FASE 2: Find unikke sange ---
    // Vi tager sange fra A, som ikke er i fællesSange
    const unikkeFraA = listeA.filter(function (sangA) {
        const erFælles = fællesSange.some(function (m) {
            return m.id === sangA.id;
        });
        return !erFælles;
    });

    // Vi tager sange fra B, som ikke er i fællesSange
    const unikkeFraB = listeB.filter(function (sangB) {
        const erFælles = fællesSange.some(function (m) {
            return m.id === sangB.id;
        });
        return !erFælles;
    });

    // --- FASE 3: Saml det hele ---
    const alleUnikke = unikkeFraA.concat(unikkeFraB);

    // Sorter de unikke sange efter deres globale Elo
    alleUnikke.sort(function (a, b) {
        return b.elo_rating - a.elo_rating;
    });

    // Returner fællesSange først (vores fælles smag) og derefter resten
    return fællesSange.concat(alleUnikke);
}

module.exports = {
    fletMixtapes
};
