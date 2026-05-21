// ─── GLOBAL SANGELISTE ──────────────────────────
// Vi gemmer de sange der aktuelt vises på skærmen (enten Billboard eller Mixtape) i denne variabel.
// Hvorfor? Så vores afspiller ('components.js') kan slå sangene op og vide, hvad der skal spilles.
let sangeListe = []


// ─── GENREFARVE ─────────────────────────────────
// En lille sjov hjælpefunktion, der giver hver genre sin egen farve.
// David Malan ville elske dette: Det er et klassisk 'Hash Function' trick!
function hentGenreFarve(genre) {
    if (!genre) return 'bg-zinc-500' // Default farve

    // Et "Dictionary" til de mest kendte genrer
    const kendte = {
        'rock': 'bg-red-500',
        'pop': 'bg-pink-500',
        'hip-hop': 'bg-green-500',
        'disco': 'bg-purple-500',
        'jazz': 'bg-amber-500'
    }

    const genreLower = genre.toLowerCase()
    if (kendte[genreLower]) return kendte[genreLower]

    // Hash Function Trick: 
    // Hvis vi får en "ukendt" genre (fx 'classical'), vil vi stadig gerne have at den 
    // KONSEKVENT får den samme farve hver gang vi ser den.
    // Vi lægger bogstavernes talværdier (ASCII) sammen og bruger 'modulo' (%).
    const ekstraFarver = ['bg-cyan-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-400', 'bg-lime-500']
    let sum = 0
    for (let i = 0; i < genre.length; i++) {
        sum += genre.charCodeAt(i)
    }
    return ekstraFarver[sum % ekstraFarver.length]
}

// ─── VIEW NAVIGATION (SPA LOGIK) ────────────────────────────
// Dette er hjertet af en "Single Page Application" (SPA).
// I stedet for at reloade siden, gemmer vi bare en kasse (Billboard) og viser en anden (Mixtape).
function skiftView(viewNavn) {
    const alleViews = document.querySelectorAll('.view')
    for (let i = 0; i < alleViews.length; i++) {
        alleViews[i].classList.add('hidden')
    }
    document.getElementById('view-' + viewNavn).classList.remove('hidden')

    // Hvis brugeren åbner Mixtape-viewet, skal vi bede backend om data.
    if (viewNavn === 'mixtape') {
        hentMixtape()
    }
}

// ─── SANGKORT COMPONENT ───────────────────────────────────
// Bygger HTML for ét enkelt "Sangkort". Tænk på det som en fabrik (Factory).
// Returnerer en gigantisk tekst-streng fyldt med HTML og CSS.
function sangKort(sang, nummer) {
    // Matematik: Omregn millisekunder til minutter og sekunder
    const min = Math.floor(sang.duration_ms / 60000)
    const sek = String(Math.floor((sang.duration_ms % 60000) / 1000)).padStart(2, '0')

    const farve = hentGenreFarve(sang.genre)
    const index = nummer - 1  // Computer starter på 0 (index), mennesker starter på 1 (nummer)

    // VIGTIGT: onclick="afspilSang(index)" forbinder knappen med vores globale afspiller!
    return '<div onclick="afspilSang(' + index + ')" class="flex items-center gap-6 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">' +
        '<span class="text-white text-center w-6 font-medium">' + nummer + '</span>' +
        '<div class="w-12 h-12 rounded-xl ' + farve + ' flex-shrink-0 opacity-80"></div>' +
        '<div class="flex-1 min-w-0">' +
            '<p class="text-sm font-medium text-white truncate">' + sang.title + '</p>' +
            '<p class="text-zinc-400 text-xs mt-0.5">' + sang.artist + '</p>' +
        '</div>' +
        '<span class="text-xs font-mono ' + farve + ' text-white px-2 py-0.5 rounded-full">' + (sang.user_elo_rating || sang.elo_rating) + '</span>' +
        '<span class="text-xs text-zinc-400">' + min + ':' + sek + '</span>' +
        '</div>'
}


// ─── BILLBOARD ──────────────────────────────────
// Henter og viser den globale top 20 liste
async function hentBillboard() {
    try {
        const genre = document.getElementById('billboard-genre-filter').value
        const url = genre ? '/api/billboard?genre=' + genre : '/api/billboard'

        console.log("====================================")
        console.log("-> Henter global billboard liste...")
        console.log("-> Filter valgt: " + (genre || 'Alle genrer'))
        
        const response = await fetch(url)
        const sange = await response.json()
        
        console.log("<- Fandt " + sange.length + " sange til billboardet")
        console.log("====================================")

        sangeListe = sange  // Gem så afspilSang() ved hvad der er på skærmen nu

        const container = document.getElementById('billboard-liste')
        container.innerHTML = '' // Tøm listen før vi bygger den op igen (forhindrer duplikater)

        for (let i = 0; i < sange.length; i++) {
            container.innerHTML += sangKort(sange[i], i + 1)
        }
    } catch (error) {
        console.error("Fejl ved hentning af billboard:", error)
        alert("Kunne ikke forbinde til databasen. Er serveren tændt?")
    }
}

// ─── MIXTAPE ────────────────────────────────────
// Henter brugerens mixtape. Lidt mere kompliceret end Billboard,
// fordi vi også skal hente dropdown-menuen (alle brugerens mixtapes).
async function hentMixtape() {
    const username = getCurrentUser()

    // Hvis ingen er logget ind (mangler ?username i URL), vis en fejlbesked
    if (!username) {
        document.getElementById('ingen-mixtape').classList.remove('hidden')
        document.getElementById('mixtape-liste').innerHTML = ''
        document.getElementById('nyt-mixtape-sektion').classList.add('hidden')
        return
    }

    try {
        // 1. Byg Dropdown-menuen over alle brugerens mixtapes
        const filterSelect = document.getElementById('mixtape-filter')
        const nuværendeValg = filterSelect.value
        
        filterSelect.innerHTML = '<option value="">Privat Billboard (Alle)</option>'

        const namesRes = await fetch('/api/mixtapes?username=' + username)
        const names = await namesRes.json()
        for (let i = 0; i < names.length; i++) {
            const opt = document.createElement('option')
            opt.value = names[i]
            opt.textContent = names[i]
            filterSelect.appendChild(opt)
        }

        // 2. Auto-vælg mixtape, hvis brugeren lige kommer direkte fra Onboarding siden (via URL)
        const params = new URLSearchParams(window.location.search)
        const urlMixtape = params.get('mixtapeName')
        
        if (urlMixtape && !nuværendeValg) {
            filterSelect.value = urlMixtape
            // Clean-up: Fjern parameret fra URL'en, så den ikke bliver hængende
            window.history.replaceState({}, document.title, window.location.pathname + '?username=' + username + '&view=mixtape')
        } else if (nuværendeValg) {
            filterSelect.value = nuværendeValg
        }

        // 3. Hvilket mixtape valgte brugeren? (tom = Privat Billboard)
        const valgtMixtape = filterSelect.value
        let url = '/api/mixtape?username=' + username
        if (valgtMixtape) {
            url += '&mixtapeName=' + encodeURIComponent(valgtMixtape) // encodeURIComponent sikrer at navne med mellemrum (fx "Rock 1") ikke ødelægger URL'en.
        }

        // 4. Hent sangene!
        console.log("====================================")
        console.log("-> Henter mixtape fra databasen...")
        console.log("-> Bruger: " + username)
        console.log("-> Mixtape: " + (valgtMixtape || 'Privat Billboard (Alle)'))

        const res = await fetch(url)
        const sange = await res.json()

        console.log("<- Fandt " + (sange ? sange.length : 0) + " sange til mixtapet")
        console.log("====================================")

        // Hvis brugeren aldrig har lavet et mixtape, viser vi "Start Onboarding" kassen.
        if (!sange || sange.length === 0) {
            document.getElementById('ingen-mixtape').classList.remove('hidden')
            document.getElementById('mixtape-liste').innerHTML = ''
            document.getElementById('nyt-mixtape-sektion').classList.add('hidden')
            return
        }

        // Skjul "ingen mixtape" kassen og vis sang-sektionen
        document.getElementById('ingen-mixtape').classList.add('hidden')
        document.getElementById('nyt-mixtape-sektion').classList.remove('hidden')

        // Opdater den store titeltekst øverst oppe
        if (valgtMixtape) {
            document.getElementById('mixtape-titel').textContent = valgtMixtape
        } else {
            document.getElementById('mixtape-titel').textContent = 'Privat Billboard'
        }

        sangeListe = sange  // Gem til den globale afspiller

        const container = document.getElementById('mixtape-liste')
        container.innerHTML = ''
        for (let i = 0; i < sange.length; i++) {
            container.innerHTML += sangKort(sange[i], i + 1)
        }
    } catch (error) {
        console.error("Fejl ved hentning af mixtape:", error)
    }
}

// ─── START APPLIKATIONEN (ENTRY POINT) ────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    indsætHeader()
    indsætAfspiller()
    opdaterAvatar()
    // Hent og vis billboard som standard
    hentBillboard()

    // Tjek om URL har ?view=mixtape — bruges når man redirectes fra onboarding
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'mixtape') {
        skiftView('mixtape')
    }
})

// Opdater listen hvis brugeren skifter genre i dropdown-menuen
document.getElementById('billboard-genre-filter').addEventListener('change', function () {
    hentBillboard()
})

// Opdater listen hvis brugeren skifter mixtape i dropdown-menuen
document.getElementById('mixtape-filter').addEventListener('change', function () {
    hentMixtape()
})
