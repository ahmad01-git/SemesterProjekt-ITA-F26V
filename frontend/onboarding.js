// DOMContentLoaded sikrer, at vores JavaScript først kører, NÅR hele HTML-siden er færdig med at loade.
// Hvis vi prøvede at manipulere HTML-knapper før de var tegnet på skærmen, ville programmet crashe.
document.addEventListener('DOMContentLoaded', function () {
    // Vi kalder disse tre funktioner fra vores genbrugelige 'components.js' fil.
    // Det betyder at vi ikke behøver at skrive koden til header og afspiller to gange!
    indsætHeader()
    indsætAfspiller()
    opdaterAvatar()

    // URLSearchParams er en smart funktion i browseren, der lader os læse,
    // hvad der står oppe i adresselinjen efter spørgsmålstegnet (fx ?username=casper)
    const params = new URLSearchParams(window.location.search)
    const urlUser = params.get('username')

    // Hvis der stod et navn i URL'en (fordi brugeren allerede ER logget ind via index.html),
    // så udfylder vi automatisk navnefeltet, låser det (readOnly), og gør det lidt gennemsigtigt.
    if (urlUser) {
        const nameInput = document.getElementById('username-input')
        nameInput.value = urlUser
        nameInput.readOnly = true
        nameInput.classList.add('opacity-50', 'cursor-not-allowed')
    }
})

// ─── STATE (TILSTAND) ───────────────────────────────────────
// Dette er vores "Globale Variabler" for onboarding-spillet.
// Tænk på State som spillets aktuelle tilstand i skak (hvor brikkerne står, hvem der har tur).
// Vi bruger 'let' i stedet for 'const', fordi disse værdier vil ændre sig hele tiden, mens brugeren stemmer.

let valgteGenrer = []     // En liste over de genrer, brugeren klikker på i Trin 1 (fx ['pop', 'rock'])
let username = ''         // Brugerens indtastede navn
let aktueltPar = []       // De to sange, der lige nu vises på skærmen (Sang A og Sang B)
let rundeNummer = 0       // Hvor langt er vi i afstemningen? Starter på runde 0.
let onboardingSange = []  // De 10 sange vi henter fra serveren — vores lokale "kortbunke"
let originaleElos = {}    // Vi gemmer sangenes start-elo her, så vi kan vise præcis hvor meget de steg/faldt til sidst
let sessionSejre = {}     // Tæller hvor mange gange en sang har VUNDET her i spillet. Bruges til at sortere slutlisten.
let seenIds = []          // En huskeseddel over de sange (ID'er), brugeren allerede HAR set, så vi undgår gentagelser.
let stemmerAktiv = false  // 'Debouncing': En sikkerhedslås! Forhindrer at brugeren spam-klikker på en knap mens animationen kører.

// 'const' bruges her, fordi antallet af runder ALDRIG ændrer sig, uanset hvad der sker.
const maxRunder = 15      

// ─── TOGGLE GENRE ────────────────────────────────
// Kaldes hver gang brugeren klikker på en af de store genre-knapper (fx "Pop" eller "Rock").
// 'knap' er selve HTML-elementet, der blev klikket på.
function toggleGenre(knap) {
    // I HTML'en har knappen 'data-genre="pop"' og 'data-farve="bg-pink-500"'. 
    // Vi kan læse disse skjulte variabler direkte ud af HTML'en vha. knap.dataset.
    const genre = knap.dataset.genre       
    const aktivFarve = knap.dataset.farve  

    // Vi tjekker: Har brugeren ALLEREDE valgt denne genre?
    // 'indexOf' leder igennem listen. Hvis den finder genren, får vi placeringen (0, 1, 2).
    // Hvis den IKKE findes i listen, får vi -1.
    const index = valgteGenrer.indexOf(genre)

    if (index !== -1) {
        // Genren VAR i listen! Det betyder, at brugeren prøver at "fravælge" den.
        // 'splice' klipper præcis dette ene (1) element ud af listen.
        valgteGenrer.splice(index, 1)
        
        // Vi fjerner den farvede CSS, og gør knappen grå igen.
        knap.classList.remove(aktivFarve, 'border-white/40')
        knap.classList.add('bg-white/5', 'border-white/10')
    } else if (valgteGenrer.length < 3) {
        // Genren var ikke i listen ENDNU, og listen har færre end 3 ting.
        // Så vi tilføjer den (.push) og giver knappen sin flotte farve!
        valgteGenrer.push(genre)
        knap.classList.remove('bg-white/5', 'border-white/10')
        knap.classList.add(aktivFarve, 'border-white/40')
    } else {
        // Brugeren prøver at vælge en 4. genre. Det tillader vi ikke!
        alert('Du kan højst vælge 3 genrer!')
    }
}

// ─── UDFYLD ONBOARDING (Gå til Trin 2) ───────────
// Kaldes når brugeren klikker "Næste →" i trin 1.
// Ordet 'async' betyder, at denne funktion arbejder asynkront. Vi lader simpelthen 
// JavaScript sætte sig på ventebænken, indtil vores server har svaret os!
async function udfyldOnboarding() {
    // .trim() fjerner usynlige mellemrum foran og bagved navnet (hvis de tastede " casper ").
    username = document.getElementById('username-input').value.trim()

    // Sikkerhedstjek (Validation): Har de overhovedet skrevet noget?
    if (username === '') {
        alert('Vi skal have dit navn')
        return // Return stopper funktionen her. Vi går IKKE videre.
    }
    if (valgteGenrer.length === 0) {
        alert('Du skal vælge mindst én genre')
        return
    }

    // Vi har brug for at sende genrerne til serveren i URL'en. 
    // .join(',') laver vores liste ['pop', 'rock'] om til én lang tekststreng: "pop,rock"
    const genreParam = valgteGenrer.join(',')

    try {
        // 'await fetch' betyder: Stop koden her! Spørg serveren, og VENT indtil vi får et svar.
        // Vi spørger vores egen server (`/api/onboarding`) om 10 sange fra de valgte genrer.
        const res = await fetch('/api/onboarding?genres=' + genreParam + '&total=10')
        
        // Hvis serveren crashede eller vi mistede internettet, kaster vi en 'Error', 
        // som med det samme teleporterer os ned i 'catch'-blokken i bunden.
        if (!res.ok) {
            throw new Error('Netværksfejl eller serverfejl');
        }

        // Serveren taler JSON (JavaScript Object Notation). 
        // Vi omdanner svaret til en rigtig JavaScript liste med sange.
        onboardingSange = await res.json() 

        // Nu skal vi gøre klar til kamp! Vi sætter alle sange ind i vores lokale "huskebøger".
        for (let i = 0; i < onboardingSange.length; i++) {
            // Gemmer sangens start-ELO under dens unikke ID (fx originaleElos[45] = 1500)
            originaleElos[onboardingSange[i].id] = onboardingSange[i].elo_rating
            // Nulstiller win-count, da spillet lige er begyndt.
            sessionSejre[onboardingSange[i].id] = 0
        }

        // --- CSS Magi (Skift skærm) ---
        // Vi fortæller HTML'en, hvor mange runder vi skal spille.
        document.getElementById('total-runder').textContent = maxRunder
        
        // Vi slukker for Trin 1 (hidden) og tænder for Trin 2!
        document.getElementById('trin-1').classList.add('hidden')
        document.getElementById('trin-2').classList.remove('hidden')

        // Start spillet ved at hente de to første sange til skærmen.
        hentNæstePar()
    } catch (error) {
        console.error("Fejl under hentning af onboarding:", error)
        alert('Der opstod en fejl under indlæsningen af sange. Prøv venligst igen senere.');
    }
}

// ─── ELO BEREGNING (LOKALT) ──────────────────────
// Et matematisk formel-vidunder opfundet af Arpad Elo.
// I stedet for at bede serveren om at udregne det for os HVER gang brugeren trykker på en sang,
// gør vi det direkte her i browseren. Det får hjemmesiden til at føles lynhurtig!
function udregnNyElo(rating1, rating2, vinderScore) {
    const k = 32 // K-faktoren bestemmer, hvor voldsomt rating svinger. 32 er standard i skak.
    
    // Sandsynligheden for at spiller 1 vinder over spiller 2 (Et tal mellem 0 og 1)
    const forventetScore = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400))
    
    // Hvis man vandt, er vinderScore 1. Hvis man tabte er den 0.
    // Så den udregner: Ny Rating = Gammel Rating + 32 * (VandtJegFaktisk - ForventedeJegAtVinde)
    return Math.round(rating1 + k * (vinderScore - forventetScore))
}

// ─── HENT NÆSTE PAR ──────────────────────────────
// Hjernen bag "hvilke to sange skal slås nu?"
// Den tager to sange fra vores lokale bunke (`onboardingSange`) og viser dem.
// Den sørger især for, at to ukendte sange (Wildcards) ALDRIG møder hinanden.
function hentNæstePar() {
    // 1. Vi finder ud af, hvilke sange vi IKKE har set i denne "omgang" endnu.
    let tilgængelige = []
    for (let i = 0; i < onboardingSange.length; i++) {
        // Hvis sangens ID IKKE findes i vores 'seenIds' huskeseddel (-1), så er den ledig!
        if (seenIds.indexOf(onboardingSange[i].id) === -1) {
            tilgængelige.push(onboardingSange[i])
        }
    }

    // 2. Hvis vi er løbet tør for "nye" sange at vise, så starter vi forfra!
    // Vi tømmer huskesedlen og laver en frisk kopi af alle 10 sange.
    if (tilgængelige.length < 2) {
        seenIds = []
        tilgængelige = onboardingSange.slice() // .slice() uden parametre betyder "Kopier hele listen"
    }

    let sangA
    let sangB

    // 3. Vi deler de tilgængelige sange op i to stakke: Normale sange og Wildcards (ukendte nye sange)
    const normaleSange = []
    const wildcards = []

    for (let i = 0; i < tilgængelige.length; i++) {
        if (tilgængelige[i].is_wildcard) {
            wildcards.push(tilgængelige[i])
        } else {
            normaleSange.push(tilgængelige[i])
        }
    }

    // 4. STRATEGI: Wildcards må kun fremvises på runde 5, 10 og 15.
    // Læg mærke til at runder i JavaScript starter fra 0. (Runde 1 er indeks 0).
    // Derfor er runde 5 indeks 4!
    const erWildcardRunde = (rundeNummer === 4 || rundeNummer === 9 || rundeNummer === 14)

    if (erWildcardRunde && wildcards.length > 0 && normaleSange.length > 0) {
        // WILDCARD DUEL! (Vi tvinger 1 Wildcard til at slås mod 1 Normal Sang).
        // Math.random() giver et decimaltal, fx 0.5. 
        // Vi ganger det med antallet af wildcards, og runder ned (Math.floor) 
        // for at få et tilfældigt, gyldigt nummer (Index) vi kan trække fra bunken.
        const randomWildcardIndex = Math.floor(Math.random() * wildcards.length)
        sangA = wildcards[randomWildcardIndex]

        const randomNormalIndex = Math.floor(Math.random() * normaleSange.length)
        sangB = normaleSange[randomNormalIndex]
    } else {
        // NORMAL RUNDE! 
        // Vi trækker en helt tilfældig sang fra hele bunken.
        const indexA = Math.floor(Math.random() * tilgængelige.length)
        sangA = tilgængelige[indexA]
        
        // VIGTIGT: Vi fjerner sangA fra listen, så vi ikke risikerer at trække den SAMME sang igen som sangB!
        tilgængelige.splice(indexA, 1) 

        // For at sikre at to wildcards ikke møder hinanden (fordi det ikke giver mening),
        // skal vi tjekke: HVIS sangA var et wildcard, må sangB KUN trækkes fra puljen af normale sange!
        let muligeSangeTilB = tilgængelige;
        
        if (sangA.is_wildcard) {
            muligeSangeTilB = []; // Tøm puljen!
            for (let i = 0; i < tilgængelige.length; i++) {
                if (!tilgængelige[i].is_wildcard) {
                    muligeSangeTilB.push(tilgængelige[i]); // Fyld kun normale sange i!
                }
            }
        }

        // Ekstremt sjælden Edge case: Hvad nu hvis der kun var wildcards tilbage i hele spillet?
        if (muligeSangeTilB.length === 0) {
            seenIds = []; // Nulstil alt og start forfra med dette træk.
            return hentNæstePar();
        }

        // Træk til sidst sangB tilfældigt!
        const indexB = Math.floor(Math.random() * muligeSangeTilB.length)
        sangB = muligeSangeTilB[indexB]
    }

    aktueltPar = [sangA, sangB]
    seenIds.push(sangA.id, sangB.id)

    // Opdater UI (Brugerfladen) ved at manipulere HTML'en (DOM Manipulation).
    // Her overskriver vi bare den gamle tekst med de nye sangtitler.
    document.getElementById('sang-a-titel').textContent = sangA.title
    document.getElementById('sang-a-artist').textContent = sangA.artist
    document.getElementById('sang-a-elo-rating').textContent = 'Elo: ' + sangA.elo_rating

    document.getElementById('sang-b-titel').textContent = sangB.title
    document.getElementById('sang-b-artist').textContent = sangB.artist
    document.getElementById('sang-b-elo-rating').textContent = 'Elo: ' + sangB.elo_rating

    // Et "Dictionary" (Object) til at slå CSS-farver op baseret på genre.
    // Ligesom vi gjorde i index.js, bare uden hash-funktionen (for at holde det mere simpelt her).
    const farver = {
        pop: 'border-pink-500',
        rock: 'border-red-500',
        'hip-hop': 'border-green-500',
        jazz: 'border-amber-500',
        disco: 'border-purple-500'
    }
    
    // Vi giver kassens kant en farve, der passer til genren (eller mørkegrå 'border-zinc-700', hvis ukendt).
    document.getElementById('sang-a-farve').className = 'w-16 h-16 rounded-xl mx-auto mb-4 border-[3px] bg-transparent ' + (farver[sangA.genre] || 'border-zinc-700')
    document.getElementById('sang-b-farve').className = 'w-16 h-16 rounded-xl mx-auto mb-4 border-[3px] bg-transparent ' + (farver[sangB.genre] || 'border-zinc-700')

    // .classList.toggle() tænder eller slukker for en CSS-klasse baseret på om udsagnet (sang.is_wildcard) er true eller false
    // Hvis en sang er et wildcard, fjerner vi 'hidden' og viser et cool stjerne-ikon.
    document.getElementById('sang-a-wildcard').classList.toggle('hidden', !sangA.is_wildcard)
    document.getElementById('sang-b-wildcard').classList.toggle('hidden', !sangB.is_wildcard)

    // Opdater progress bar og rundenummer (Baren nede i bunden, der viser fx "3 ud af 15")
    const procent = (rundeNummer / maxRunder) * 100
    document.getElementById('voting-progress').style.width = procent + '%'
    document.getElementById('runde-nummer').textContent = rundeNummer + 1
}

// ─── STEM PÅ EN SANG ─────────────────────────────
// Dette kaldes direkte fra HTML, når brugeren klikker på enten Sang A eller Sang B.
// valg = 0 betyder at de klikkede på sang A, valg = 1 betyder sang B.
function stemPå(valg) {
    // Forhindrer dobbeltklik mens vinder-feedback vises (Den lille 800ms animation).
    if (stemmerAktiv) return
    stemmerAktiv = true

    // Vi finder ud af, hvem der vandt og hvem der tabte.
    const vinder = aktueltPar[valg]
    // Smart trick: 'valg === 0 ? 1 : 0' er en "Ternary Operator" (en mini if/else statement).
    // Den læses: "Hvis valg er 0, så sæt taber til 1. Ellers sæt den til 0."
    const taber = aktueltPar[valg === 0 ? 1 : 0]

    // GEM de gamle elo-værdier FØR vi opdaterer lokalt.
    // Det er kritisk vigtigt — ellers sender vi de NYE (allerede udregnede) værdier til backend,
    // som så beregner elo igen, og sangen stiger dobbelt så meget, som den burde!
    const gammelVinderElo = vinder.elo_rating
    const gammelTaberElo = taber.elo_rating

    // Beregn nye elo-værdier lokalt, så vi kan vise dem i UI'et med det samme (uden forsinkelse).
    const nyVinderElo = udregnNyElo(gammelVinderElo, gammelTaberElo, 1)
    const nyTaberElo = udregnNyElo(gammelTaberElo, gammelVinderElo, 0)

    // 🎓 DEBUGGING: Pædagogisk udskrift i konsollen (F12) af, hvad der sker under motorhjelmen.
    console.log("====================================")
    console.log("Runde: " + (rundeNummer + 1))
    console.log("VINDER: " + vinder.title + " (Elo: " + gammelVinderElo + " -> " + nyVinderElo + ")")
    console.log("TABER:  " + taber.title + " (Elo: " + gammelTaberElo + " -> " + nyTaberElo + ")")
    console.log("Sender Elo-opdatering til serveren...")
    console.log("====================================")

    // Tæl en session-vinding til vinderen (Bruges i Trin 3, når vi skal sortere mixtapet).
    sessionSejre[vinder.id] += 1

    // Opdater elo lokalt i vores `onboardingSange` "kortbunke".
    for (let i = 0; i < onboardingSange.length; i++) {
        if (onboardingSange[i].id === vinder.id) {
            onboardingSange[i].elo_rating = nyVinderElo
        }
        if (onboardingSange[i].id === taber.id) {
            onboardingSange[i].elo_rating = nyTaberElo
        }
    }

    // Send de GAMLE elo-værdier til backend — serveren skal nok selv regne de nye ud i databasen.
    // Læg mærke til, at vi her IKKE skriver 'await' foran fetch. Det betyder, at vi 
    // bare kaster forespørgslen (POST request) afsted i baggrunden uden at vente på svar!
    fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            winner_id: vinder.id,
            loser_id: taber.id,
            winner_elo: gammelVinderElo,
            loser_elo: gammelTaberElo,
            username: username
        })
    }).catch(function (err) {
        // Hvis serveren er nede, fanger vi fejlen her i stilhed, så spillet ikke afbrydes for brugeren.
        console.error('Fejl ved vote i baggrunden:', err)
    })

    // Beregn "delta" (forskellen) for UI feedback (Hvor meget gik man op eller ned?)
    // Fx 1515 - 1500 = 15. Delta = 15.
    const vinderDelta = nyVinderElo - gammelVinderElo
    const taberDelta = nyTaberElo - gammelTaberElo

    // Vi finder de "flyvende" HTML-elementer, som skal bruges til animationen (+15 / -12)
    const aFloating = document.getElementById('sang-a-floating-elo')
    const bFloating = document.getElementById('sang-b-floating-elo')

    const vinderFloating = valg === 0 ? aFloating : bFloating
    const taberFloating = valg === 0 ? bFloating : aFloating

    // Opsæt vinder feedback (+15 i lysegrøn)
    vinderFloating.textContent = '+' + vinderDelta
    vinderFloating.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-green-400 z-20 drop-shadow-[0_0_15px_rgba(74,222,128,0.8)] pointer-events-none transition-all duration-300 scale-125'

    // Opsæt taber feedback (-12 i rød)
    taberFloating.textContent = taberDelta
    taberFloating.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-red-500 z-20 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)] pointer-events-none transition-all duration-300 scale-90 opacity-80'

    // Viser vinder-feedback på selve kortene: vinderkortet lyser grønt, taberkortet fader ud (bliver gennemsigtigt).
    const vinderKort = document.getElementById(valg === 0 ? 'sang-a' : 'sang-b')
    const taberKort = document.getElementById(valg === 0 ? 'sang-b' : 'sang-a')

    vinderKort.classList.add('border-green-500', 'border-2', 'bg-green-500/10')
    taberKort.classList.add('opacity-30')

    // setTimeout er en indbygget "Timer". 
    // Vi beder JavaScript om at vente i 800 millisekunder (0.8 sekunder) før den kører funktionen indeni.
    setTimeout(function () {
        // Nulstil al feedback
        vinderFloating.className = 'hidden'
        taberFloating.className = 'hidden'
        vinderKort.classList.remove('border-green-500', 'border-2', 'bg-green-500/10')
        taberKort.classList.remove('opacity-30')
        
        // Åbn sikkerhedslåsen op igen, så brugeren kan stemme igen.
        stemmerAktiv = false

        rundeNummer++

        // Har vi nået 15 runder? Hvis ja, gå til resultaterne (Trin 3).
        // Hvis nej, hent et nyt par!
        if (rundeNummer >= maxRunder) {
            visResultater()
        } else {
            hentNæstePar()
        }
    }, 800)
}

// ─── VIS RESULTATER ──────────────────────────────
// Trukket ud i sin egen funktion, så BÅDE stemPå() og hopOver() kan bruge den.
// Dette kaldes DRY (Don't Repeat Yourself) i programmering.
function visResultater() {
    // 🎓 DEBUGGING: Trin 3 - Resultater
    console.log("====================================")
    console.log("VISER RESULTATER: Sorterer listen...")
    console.log("Antal sange i puljen: " + onboardingSange.length)
    console.log("====================================")

    // .sort() er en indbygget Javascript funktion der kan sortere lister.
    // Vi sorterer udelukkende efter antallet af "sessionSejre".
    // Det betyder, at brugerens subjektive valg vægtes højere end sangenes globale Elo.
    onboardingSange.sort(function (a, b) {
        return sessionSejre[b.id] - sessionSejre[a.id]
    })

    // Find html-boksen til resultatlisten og tøm den først.
    const container = document.getElementById('resultat-liste')
    container.innerHTML = ''

    // Loop igennem den sorterede kortbunke
    for (let i = 0; i < onboardingSange.length; i++) {
        const sang = onboardingSange[i]
        
        // Find den oprindelige ELO (før vi overhovedet begyndte spillet).
        const gammelElo = originaleElos[sang.id] || sang.elo_rating
        const nyElo = sang.elo_rating
        
        // Beregn hvor meget sangen er steget eller faldet totalt set!
        const delta = nyElo - gammelElo
        const wins = sessionSejre[sang.id]

        // Kosmetik: Tilføj et '+' foran positive tal
        const deltaTekst = delta > 0 ? '+' + delta : '' + delta
        
        let deltaFarve = 'text-zinc-500' // 'let', fordi vi gerne vil overskrive den afhængigt af fortegn
        if (delta > 0) { deltaFarve = 'text-green-400' } // Positiv = Grøn
        if (delta < 0) { deltaFarve = 'text-red-400' }   // Negativ = Rød

        // Spytter en massiv blok HTML ud i containeren for hver sang.
        container.innerHTML +=
            '<div class="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/10 bg-white/5">' +
            '<span class="text-zinc-500 w-5 text-sm font-bold">' + (i + 1) + '</span>' +
            '<div class="flex-1 min-w-0">' +
            '<p class="text-sm font-medium text-white truncate">' + sang.title + '</p>' +
            '<p class="text-zinc-400 text-xs mt-0.5">' + sang.artist + '</p>' +
            '</div>' +
            '<span class="text-xs font-semibold text-zinc-300 bg-white/5 px-2 py-1 rounded-md mr-2">' + wins + ' wins</span>' +
            '<span class="text-xs font-semibold ' + deltaFarve + ' bg-white/5 px-2 py-1 rounded-md">' + deltaTekst + '</span>' +
            '</div>'
    }

    // Skjul afstemningsskærmen (Trin 2) og vis resultatlisten (Trin 3)
    document.getElementById('trin-2').classList.add('hidden')
    document.getElementById('trin-3').classList.remove('hidden')
}

// ─── GEM MIXTAPE OG GÅ VIDERE ────────────────────
// Kaldes i bunden af Trin 3, når brugeren er glad for sit mixtape.
async function gemMixtapeOgGåVidere() {
    const mixtapeNavn = document.getElementById('mixtape-name-input').value.trim()

    if (mixtapeNavn === '') {
        alert('Du skal give dit mixtape et navn!')
        return
    }

    // Serveren har KUN brug for at kende sangenes ID'er. 
    // Så vi trækker alle ID'erne ud af listen og putter dem i en ny lille liste (`gemteIds`).
    const gemteIds = []
    for (let i = 0; i < onboardingSange.length; i++) {
        gemteIds.push(onboardingSange[i].id)
    }

    // 🎓 DEBUGGING: Trin 4 - Gemmer
    console.log("====================================")
    console.log("GEMMER MIXTAPE: " + mixtapeNavn)
    console.log("Sender følgende " + gemteIds.length + " sang-IDs til databasen:")
    console.log(gemteIds) // Viser et array med numre, fx [14, 2, 85, 10...] i konsollen.
    console.log("====================================")

    try {
        // Vi beder serveren (via et POST request) om at gemme mixtape-navnet 
        // og listen med sang-ID'er under brugerens navn i databasen.
        await fetch('/api/mixtape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                trackIds: gemteIds,
                name: mixtapeNavn
            })
        })
        
        // Når serveren siger "Alt gik godt!", kaster vi brugeren over på forsiden (`index.html`).
        // Vi sender 3 parametre med i URL'en:
        // 1. Deres navn
        // 2. view=mixtape (Så `index.html` VED, at den skal starte i "Mit Mixtape" skærmen)
        // 3. mixtapeName=xxx (Så den automatisk åbner det mixtape, de LIGE har lavet!)
        window.location.href = 'index.html?username=' + encodeURIComponent(username) + '&view=mixtape&mixtapeName=' + encodeURIComponent(mixtapeNavn)
    } catch (error) {
        console.error('Fejl ved gem:', error)
        alert('Der skete en fejl. Prøv igen senere.')
    }
}

// ─── SKIP ────────────────────────────────────────
// Kaldes hvis brugeren ikke kender nogen af de to sange og trykker "Skip".
// Skip tæller som en runde — ingen sang straffes eller belønnes i Elo, 
// men vi rykker én runde fremad og undgår at køre fast.
function hopOver() {
    // 🎓 DEBUGGING:
    console.log("------------------------------------")
    console.log("Brugere valgte SKIP i runde " + (rundeNummer + 1))
    console.log("Ingen sange får ændret Elo-score.")
    console.log("------------------------------------")

    rundeNummer++ // Øg rundenummer med 1.
    
    // Er vi færdige?
    if (rundeNummer >= maxRunder) {
        visResultater()
        return
    }
    
    // Hent to nye sange.
    hentNæstePar()
}
