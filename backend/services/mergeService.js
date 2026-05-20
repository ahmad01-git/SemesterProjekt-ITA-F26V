const { hentBrugerMixtape } = require('./mixtapeService');

/**
 *  VELKOMMEN TIL ALGORITMENS HJERTE: Fletting af to mixtapes! 
 * 
 * Forestil dig, at du og en ven skal holde en fest. I har hver især jeres egen afspilningsliste (mixtape).
 * Hvordan laver vi den ULTIMATIVE playliste til festen?
 * 
 * Vores algoritme gør tre ting (i tre faser):
 * 1. FASE 1: Find de sange, som I BEGGE har på jeres liste (fælles smag). De skal spilles FØRST!
 *            Hvis I begge elsker en sang, skal vi placere den højt. Vi tager gennemsnittet af sangens
 *            placering på jeres individuelle lister. (Jo lavere gennemsnit, jo bedre placering!)
 * 2. FASE 2: Find de sange, som kun den ene af jer har (unik smag).
 * 3. FASE 3: Bland de unikke sange sammen og sorter dem efter deres globale Elo-rating,
 *            så de mest populære sange spilles først.
 * 
 * Lad os se på, hvordan vi gør dette i ren JavaScript!
 */
async function fletMixtapes(usernameA, usernameB) {
    // Først henter vi mixtapet for begge brugere asynkront (vi venter på, at databasen svarer).
    // Husk: 'await' betyder, at koden stopper her et øjeblik, indtil databasen har leveret listen.
    const listeA = await hentBrugerMixtape(usernameA);
    const listeB = await hentBrugerMixtape(usernameB);

    // --- FASE 1: FIND FÆLLES SANGE & BEREGN GENNEMSNIT ---
    // Vi opretter en tom spand (et array) til at holde de sange, begge brugere har valgt.
    const fællesSange = [];

    // Vi tager hver sang fra bruger A's liste (listeA) én efter én.
    // .forEach() er som en maskine, der tager fat i hver enkelt sang (sangA) og dens placering (indexA).
    listeA.forEach(function (sangA, indexA) {

        // Nu kigger vi i bruger B's liste for at se, om præcis den samme sang findes der.
        // .findIndex() går igennem listeB og returnerer pladsnummeret (indekset), hvis den finder et match.
        // Hvis den IKKE finder sangen, returnerer den -1.
        const indexB = listeB.findIndex(function (sangB) {
            // Vi sammenligner sangenes ID. Hvis de matcher, har vi fundet den fælles sang!
            return sangB.id === sangA.id;
        });

        // Hvis indexB ikke er -1, betyder det, at sangen OGSÅ findes på bruger B's liste!
        if (indexB !== -1) {
            // KÆMPE MATCH! 
            // Nu beregner vi sangens gennemsnitlige placering på de to lister.
            // Hvis Casper har den som nr. 0 (førsteplads) og hans ven som nr. 4 (femteplads),
            // bliver gennemsnittet: (0 + 4) / 2 = 2.
            const gennemsnit = (indexA + indexB) / 2;

            // Vi hæfter dette gennemsnit direkte på sang-objektet, så vi kan huske det.
            sangA.avgRank = gennemsnit;

            // Put den fælles sang i vores fælles-spand!
            fællesSange.push(sangA);
        }
    });

    // Vi vil have de absolut bedste fælles sange øverst.
    // .sort() sorterer listen. Vi giver den en funktion, der sammenligner to sange (a og b).
    // Hvis (a.avgRank - b.avgRank) er negativt, kommer 'a' før 'b'.
    // Det betyder: Jo lavere gennemsnit (tættere på 0), jo højere (tidligere) kommer sangen på listen!
    fællesSange.sort(function (a, b) {
        return a.avgRank - b.avgRank;
    });

    // --- FASE 2: FIND DE UNIKKE SANGE ---
    // Nu skal vi finde de sange, som kun A har, og kun B har.

    // Vi tager listeA og filtrerer (.filter()) den.
    // filter() beholder kun de elementer, der returnerer 'true' i vores test-funktion.
    const unikkeFraA = listeA.filter(function (sangA) {
        // Vi tjekker om sangA findes i vores fællesSange.
        // .some() returnerer true, hvis mindst én sang i fællesSange har samme ID.
        const erFælles = fællesSange.some(function (m) {
            return m.id === sangA.id;
        });
        // Hvis sangen er fælles, vil vi IKKE have den med under unikke sange (så vi returnerer !true -> false).
        return !erFælles;
    });

    // Vi gør præcis det samme for listeB for at finde bruger B's helt unikke sange.
    const unikkeFraB = listeB.filter(function (sangB) {
        const erFælles = fællesSange.some(function (m) {
            return m.id === sangB.id;
        });
        return !erFælles;
    });

    // --- FASE 3: SAML DET HELE OG SORTÉR DE UNIKKE ---
    // Vi tager alle unikke sange fra både A og B og klasker dem sammen til én stor liste med .concat()
    const alleUnikke = unikkeFraA.concat(unikkeFraB);

    // De unikke sange har ikke en fælles placering (da kun den ene bruger kan lide dem).
    // Så hvordan finder vi ud af, hvilke af de unikke sange der er mest værd at høre?
    // Vi sorterer dem efter deres globale 'elo_rating'!
    // Her bruger vi (b.elo_rating - a.elo_rating), hvilket sorterer i faldende rækkefølge (højeste rating først).
    alleUnikke.sort(function (a, b) {
        return b.elo_rating - a.elo_rating;
    });

    // Helt til sidst returnerer vi den ultimative playliste:
    // Først de sange, I begge er enige om (fællesSange), og derefter alle de unikke sange (alleUnikke).
    // Vi bruger igen .concat() til at klistre de to lister sammen!
    return fællesSange.concat(alleUnikke);
}

module.exports = {
    fletMixtapes
};
