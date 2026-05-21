document.addEventListener('DOMContentLoaded', function () {
    indsætHeader()
    indsætAfspiller()
    opdaterAvatar()

    // Ligesom backend har req.query, kan vi læse URL'en i browseren via URLSearchParams
    const params = new URLSearchParams(window.location.search)
    const urlUser = params.get('username')

    // Hvis vi allerede kender navnet, låser vi feltet, så brugeren ikke skal skrive det igen
    if (urlUser) {
        const nameInput = document.getElementById('username-input')
        nameInput.value = urlUser
        nameInput.readOnly = true
        nameInput.classList.add('opacity-50', 'cursor-not-allowed')
    }
})

// ─── STATE (TILSTAND) ───────────────────────────────────────
// Dette er vores "Globale Variabler".
// Tænk på State som spillets aktuelle tilstand i Ludo (hvis tur er det, hvor mange brikker er i mål).
// Vi bruger 'let', da værdierne ændrer sig over tid.
let valgteGenrer = []
let username = ''
let aktueltPar = []
let rundeNummer = 0
let onboardingSange = []  // De 10 sange fra API — vores lokale pulje til par-valg
let originaleElos = {}    // Original elo inden afstemning — bruges til at vise ændringen (+12 osv.)
let sessionSejre = {} // Tæller hvor mange gange en sang vinder i DENNE session
let seenIds = []
let stemmerAktiv = false  // Forhindrer dobbeltklik (debouncing) mens vinder-feedback vises
const maxRunder = 15      // const bruges her, fordi antallet af runder aldrig ændrer sig.

// ─── TOGGLE GENRE ────────────────────────────────
// Kaldes når brugeren klikker på en genre (Pop, Rock).
function toggleGenre(knap) {
    const genre = knap.dataset.genre       // Aflæser 'data-genre' fra HTML (fx "pop")
    const aktivFarve = knap.dataset.farve  // Aflæser 'data-farve' fra HTML (fx "bg-pink-500")

    // indexOf leder efter genren i vores liste. Hvis den IKKE findes, returnerer den -1.
    const index = valgteGenrer.indexOf(genre)

    if (index !== -1) {
        // Genre er allerede valgt — fjern den fra arrayet
        valgteGenrer.splice(index, 1)
        knap.classList.remove(aktivFarve, 'border-white/40')
        knap.classList.add('bg-white/5', 'border-white/10')
    } else if (valgteGenrer.length < 3) {
        // Tilføj genre hvis der stadig er plads
        valgteGenrer.push(genre)
        knap.classList.remove('bg-white/5', 'border-white/10')
        knap.classList.add(aktivFarve, 'border-white/40')
    } else {
        alert('Du kan højst vælge 3 genrer!')
    }
}

// ─── UDFYLD ONBOARDING ───────────────────────────
// Kaldes når brugeren klikker "Næste →" i trin 1.
// Ordet 'async' betyder, at denne funktion arbejder asynkront (vi skal vente på et svar fra serveren).
async function udfyldOnboarding() {
    // .trim() fjerner usynlige mellemrum, hvis brugeren har tastet " casper "
    username = document.getElementById('username-input').value.trim()

    if (username === '') {
        alert('Vi skal have dit navn')
        return
    }
    if (valgteGenrer.length === 0) {
        alert('Du skal vælge mindst én genre')
        return
    }

    // JOIN konverterer vores liste ['pop', 'rock'] til en tekststreng "pop,rock"
    const genreParam = valgteGenrer.join(',')

    try {
        // 'await fetch' = Stop koden! Vent til tjeneren (backend) kommer tilbage med maden (sangene).
        const res = await fetch('/api/onboarding?genres=' + genreParam + '&total=10')
        
        if (!res.ok) {
            throw new Error('Netværksfejl eller serverfejl');
        }

        onboardingSange = await res.json() // Konverter maden til et JavaScript array

        // Gem original elo for hver sang inden afstemning begynder
        for (let i = 0; i < onboardingSange.length; i++) {
            originaleElos[onboardingSange[i].id] = onboardingSange[i].elo_rating
            sessionSejre[onboardingSange[i].id] = 0
        }

        // CSS Magi: Vi gemmer trin 1 (skjult) og viser trin 2
        document.getElementById('total-runder').textContent = maxRunder
        document.getElementById('trin-1').classList.add('hidden')
        document.getElementById('trin-2').classList.remove('hidden')

        hentNæstePar()
    } catch (error) {
        console.error("Fejl under hentning af onboarding:", error)
        alert('Der opstod en fejl under indlæsningen af sange. Prøv venligst igen senere.');
    }
}

// ─── ELO BEREGNING (LOKALT) ──────────────────────
// Bruges til at holde elo ajour lokalt i browseren.
// Hvorfor? For at slippe for at kalde serveren HVER gang for bare at se de nye tal.
function udregnNyElo(rating1, rating2, vinderScore) {
    const k = 32
    const forventetScore = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400))
    return Math.round(rating1 + k * (vinderScore - forventetScore))
}

// ─── HENT NÆSTE PAR ──────────────────────────────
// Vælger to sange fra den lokale onboardingSange-pulje — ingen ekstra API-kald
// VIGTIG: Garanterer ALDRIG wildcard VS wildcard
// Wildcard-dueller kun på runde 5, 10, 15
function hentNæstePar() {
    // Find sange der ikke er vist endnu i denne omgang
    let tilgængelige = []
    for (let i = 0; i < onboardingSange.length; i++) {
        if (seenIds.indexOf(onboardingSange[i].id) === -1) {
            tilgængelige.push(onboardingSange[i])
        }
    }

    // Hvis vi løber tør for usete sange, start seenIds forfra
    if (tilgængelige.length < 2) {
        seenIds = []
        tilgængelige = onboardingSange.slice() // Kopiér arrayet
    }

    let sangA
    let sangB

    // Separer normale fra wildcards
    const normaleSange = []
    const wildcards = []

    for (let i = 0; i < tilgængelige.length; i++) {
        if (tilgængelige[i].is_wildcard) {
            wildcards.push(tilgængelige[i])
        } else {
            normaleSange.push(tilgængelige[i])
        }
    }

    // Strategi: Kun på runde 5, 10, 15 skal wildcards være med
    const erWildcardRunde = (rundeNummer === 4 || rundeNummer === 9 || rundeNummer === 14)

    if (erWildcardRunde && wildcards.length > 0 && normaleSange.length > 0) {
        // Wildcard-duel: 1 wildcard + 1 NORMAL sang (ALDRIG wildcard vs wildcard)
        // Math.random() giver et tal mellem 0 og 0.99. Gange med length giver et random array-index.
        const randomWildcardIndex = Math.floor(Math.random() * wildcards.length)
        sangA = wildcards[randomWildcardIndex]

        const randomNormalIndex = Math.floor(Math.random() * normaleSange.length)
        sangB = normaleSange[randomNormalIndex]
    } else {
        // Normal runde: vælg vilkårligt fra tilgængelige
        const indexA = Math.floor(Math.random() * tilgængelige.length)
        sangA = tilgængelige[indexA]
        tilgængelige.splice(indexA, 1) // Fjern A så den ikke bliver valgt igen

        // Tjek om det er muligt at to wildcards møder hinanden
        // Hvis sangA er et wildcard, må sangB KUN være en normal sang
        let muligeSangeTilB = tilgængelige;
        
        if (sangA.is_wildcard) {
            muligeSangeTilB = [];
            for (let i = 0; i < tilgængelige.length; i++) {
                if (!tilgængelige[i].is_wildcard) {
                    muligeSangeTilB.push(tilgængelige[i]);
                }
            }
        }

        // Edge case: Hvis vi trak et wildcard, og der KUN er wildcards tilbage i bunken
        if (muligeSangeTilB.length === 0) {
            seenIds = []; // Nulstil og prøv igen
            return hentNæstePar();
        }

        const indexB = Math.floor(Math.random() * muligeSangeTilB.length)
        sangB = muligeSangeTilB[indexB]
    }

    aktueltPar = [sangA, sangB]
    seenIds.push(sangA.id, sangB.id)

    // Opdater UI (Brugerfladen) ved at manipulere HTML'en (DOM Manipulation)
    document.getElementById('sang-a-titel').textContent = sangA.title
    document.getElementById('sang-a-artist').textContent = sangA.artist
    document.getElementById('sang-a-elo-rating').textContent = 'Elo: ' + sangA.elo_rating

    document.getElementById('sang-b-titel').textContent = sangB.title
    document.getElementById('sang-b-artist').textContent = sangB.artist
    document.getElementById('sang-b-elo-rating').textContent = 'Elo: ' + sangB.elo_rating

    // Et "Dictionary" (Object) til at slå CSS-farver op baseret på genre.
    const farver = {
        pop: 'border-pink-500',
        rock: 'border-red-500',
        'hip-hop': 'border-green-500',
        jazz: 'border-amber-500',
        disco: 'border-purple-500'
    }
    document.getElementById('sang-a-farve').className = 'w-16 h-16 rounded-xl mx-auto mb-4 border-[3px] bg-transparent ' + (farver[sangA.genre] || 'border-zinc-700')
    document.getElementById('sang-b-farve').className = 'w-16 h-16 rounded-xl mx-auto mb-4 border-[3px] bg-transparent ' + (farver[sangB.genre] || 'border-zinc-700')

    // .classList.toggle() tænder eller slukker for en CSS-klasse baseret på om udsagnet (sang.is_wildcard) er true eller false
    document.getElementById('sang-a-wildcard').classList.toggle('hidden', !sangA.is_wildcard)
    document.getElementById('sang-b-wildcard').classList.toggle('hidden', !sangB.is_wildcard)

    // Opdater progress bar og rundenummer
    const procent = (rundeNummer / maxRunder) * 100
    document.getElementById('voting-progress').style.width = procent + '%'
    document.getElementById('runde-nummer').textContent = rundeNummer + 1
}

// ─── STEM PÅ EN SANG ─────────────────────────────
// valg = 0 for sang A, 1 for sang B
function stemPå(valg) {
    // Forhindrer dobbeltklik mens vinder-feedback vises
    if (stemmerAktiv) return
    stemmerAktiv = true

    const vinder = aktueltPar[valg]
    const taber = aktueltPar[valg === 0 ? 1 : 0]

    // GEM de gamle elo-værdier FØR vi opdaterer lokalt.
    // Det er vigtigt — ellers sender vi de nye værdier til backend,
    // som så beregner elo igen og ender med et forkert resultat.
    const gammelVinderElo = vinder.elo_rating
    const gammelTaberElo = taber.elo_rating

    // Beregn nye elo-værdier lokalt (til at vise i UI med det samme)
    const nyVinderElo = udregnNyElo(gammelVinderElo, gammelTaberElo, 1)
    const nyTaberElo = udregnNyElo(gammelTaberElo, gammelVinderElo, 0)

    // 🎓 DEBUGGING: Pædagogisk udskrift af, hvad der sker under motorhjelmen
    console.log("====================================")
    console.log("Runde: " + (rundeNummer + 1))
    console.log("VINDER: " + vinder.title + " (Elo: " + gammelVinderElo + " -> " + nyVinderElo + ")")
    console.log("TABER:  " + taber.title + " (Elo: " + gammelTaberElo + " -> " + nyTaberElo + ")")
    console.log("Sender Elo-opdatering til serveren...")
    console.log("====================================")

    // Tæl en session-vinding til vinderen
    sessionSejre[vinder.id] += 1

    // Opdater elo lokalt i onboardingSange-arrayet
    for (let i = 0; i < onboardingSange.length; i++) {
        if (onboardingSange[i].id === vinder.id) {
            onboardingSange[i].elo_rating = nyVinderElo
        }
        if (onboardingSange[i].id === taber.id) {
            onboardingSange[i].elo_rating = nyTaberElo
        }
    }

    // Send de GAMLE elo-værdier til backend — backend beregner selv de nye
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
        console.error('Fejl ved vote i baggrunden:', err)
    })

    // Beregn delta for UI feedback (hvor meget gik man op eller ned?)
    const vinderDelta = nyVinderElo - gammelVinderElo
    const taberDelta = nyTaberElo - gammelTaberElo

    // Find feedback elementer i HTML
    const aFloating = document.getElementById('sang-a-floating-elo')
    const bFloating = document.getElementById('sang-b-floating-elo')

    const vinderFloating = valg === 0 ? aFloating : bFloating
    const taberFloating = valg === 0 ? bFloating : aFloating

    // Opsæt vinder feedback
    vinderFloating.textContent = '+' + vinderDelta
    vinderFloating.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-black text-green-400 z-20 drop-shadow-[0_0_15px_rgba(74,222,128,0.8)] pointer-events-none transition-all duration-300 scale-125'

    // Opsæt taber feedback
    taberFloating.textContent = taberDelta
    taberFloating.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-red-500 z-20 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)] pointer-events-none transition-all duration-300 scale-90 opacity-80'

    // Viser vinder-feedback: vinderkortet lyser grønt, taberkortet fader ud
    const vinderKort = document.getElementById(valg === 0 ? 'sang-a' : 'sang-b')
    const taberKort = document.getElementById(valg === 0 ? 'sang-b' : 'sang-a')

    vinderKort.classList.add('border-green-500', 'border-2', 'bg-green-500/10')
    taberKort.classList.add('opacity-30')

    // Efter 800ms: fjern feedback og vis næste par (eller resultater)
    setTimeout(function () {
        vinderFloating.className = 'hidden'
        taberFloating.className = 'hidden'
        vinderKort.classList.remove('border-green-500', 'border-2', 'bg-green-500/10')
        taberKort.classList.remove('opacity-30')
        stemmerAktiv = false

        rundeNummer++

        if (rundeNummer >= maxRunder) {
            visResultater()
        } else {
            hentNæstePar()
        }
    }, 800)
}

// ─── VIS RESULTATER ──────────────────────────────
// Trukket ud i sin egen funktion så både stemPå() og hopOver() kan bruge den
function visResultater() {
    // .sort() er en indbygget Javascript funktion der kan sortere arrays.
    // Sorter efter antal session-vindinger — brugerens præference vægtes over global elo.
    onboardingSange.sort(function (a, b) {
        return sessionSejre[b.id] - sessionSejre[a.id]
    })

    // Byg resultatlisten
    const container = document.getElementById('resultat-liste')
    container.innerHTML = ''

    for (let i = 0; i < onboardingSange.length; i++) {
        const sang = onboardingSange[i]
        const gammelElo = originaleElos[sang.id] || sang.elo_rating
        const nyElo = sang.elo_rating
        const delta = nyElo - gammelElo
        const wins = sessionSejre[sang.id]

        const deltaTekst = delta > 0 ? '+' + delta : '' + delta
        let deltaFarve = 'text-zinc-500' // let, fordi den ændrer sig på næste linje
        if (delta > 0) { deltaFarve = 'text-green-400' }
        if (delta < 0) { deltaFarve = 'text-red-400' }

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

    document.getElementById('trin-2').classList.add('hidden')
    document.getElementById('trin-3').classList.remove('hidden')
}

// ─── GEM MIXTAPE OG GÅ VIDERE ────────────────────
async function gemMixtapeOgGåVidere() {
    const mixtapeNavn = document.getElementById('mixtape-name-input').value.trim()

    if (mixtapeNavn === '') {
        alert('Du skal give dit mixtape et navn!')
        return
    }

    // Saml alle sang-IDs fra den rangerede liste
    const gemteIds = []
    for (let i = 0; i < onboardingSange.length; i++) {
        gemteIds.push(onboardingSange[i].id)
    }

    try {
        await fetch('/api/mixtape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                trackIds: gemteIds,
                name: mixtapeNavn
            })
        })
        // Redirect til billboard og åbn mixtape-view automatisk med det nye mixtape valgt
        window.location.href = 'billboard.html?username=' + encodeURIComponent(username) + '&view=mixtape&mixtapeName=' + encodeURIComponent(mixtapeNavn)
    } catch (error) {
        console.error('Fejl ved gem:', error)
        alert('Der skete en fejl. Prøv igen senere.')
    }
}

// ─── SKIP ────────────────────────────────────────
// Skip tæller som en runde — ingen sang straffes, men vi bevæger os fremad
function hopOver() {
    // 🎓 DEBUGGING:
    console.log("------------------------------------")
    console.log("Brugere valgte SKIP i runde " + (rundeNummer + 1))
    console.log("Ingen sange får ændret Elo-score.")
    console.log("------------------------------------")

    rundeNummer++
    if (rundeNummer >= maxRunder) {
        visResultater()
        return
    }
    hentNæstePar()
}
