// ─── GLOBAL SANGELISTE ──────────────────────────
// Vi gemmer de sange der aktuelt vises på skærmen (enten Billboard eller Mixtape) i denne variabel.
// Hvorfor? Fordi når brugeren trykker på "Afspil", har vi brug for en liste over alle sange
// for at kunne vide, hvilken sang der kommer næste gang (Næste/Forrige funktionalitet).
// Dette kaldes "State Management" – vi gemmer sidens tilstand her.
let sangeListe = []


// ─── GENREFARVE ─────────────────────────────────
// En lille sjov hjælpefunktion, der giver hver genre sin egen farve i UI'et.
// Vi bruger parameteren (genre), som er en tekststreng, fx "Pop" eller "Rock".
function hentGenreFarve(genre) {
    // Hvis sangen mangler en genre (hvis den f.eks. er null eller undefined i databasen), 
    // giver vi den en kedelig grå farve (bg-zinc-500) for at forhindre fejl i koden.
    if (!genre) return 'bg-zinc-500'

    // Et "Dictionary" (et JavaScript Objekt) til at oversætte de mest kendte genrer til farver.
    // Vi bruger TailwindCSS klasser som "bg-red-500" for at farve vores HTML-bokse.
    const kendte = {
        'rock': 'bg-red-500',
        'pop': 'bg-pink-500',
        'hip-hop': 'bg-green-500',
        'disco': 'bg-purple-500',
        'jazz': 'bg-amber-500'
    }

    // Vi laver genren om til små bogstaver ("Rock" bliver til "rock") for at undgå problemer
    // med stort/småt, når vi slår op i vores 'kendte' dictionary.
    const genreLower = genre.toLowerCase()
    
    // Hvis vi finder genren i vores dictionary, returnerer vi farven med det samme!
    if (kendte[genreLower]) return kendte[genreLower]

    // --- Hash Function Trick ---
    // Hvis vi får en "ukendt" genre fra databasen (fx 'classical' eller 'metal'), 
    // vil vi stadig gerne have at den KONSEKVENT får den samme farve hver gang.
    // Løsningen? En "Hash funktion". Vi omdanner tekst til et tal!
    const ekstraFarver = ['bg-cyan-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-400', 'bg-lime-500']
    let sum = 0
    
    // Vi løber igennem hvert bogstav i genren...
    for (let i = 0; i < genre.length; i++) {
        // ... og lægger bogstavets ASCII-talværdi (fx 'A' = 65) til vores sum.
        sum += genre.charCodeAt(i)
    }
    
    // Ved hjælp af "modulo" (%) sikrer vi os, at summen altid bliver et tal mellem 
    // 0 og længden på vores ekstraFarver-liste. Fx `35 % 6` giver en valid placering!
    return ekstraFarver[sum % ekstraFarver.length]
}

// ─── VIEW NAVIGATION (SPA LOGIK) ────────────────────────────
// Dette er hjertet af vores "Single Page Application" (SPA).
// I stedet for at bede browseren om at reloade siden, gemmer vi bare en kasse (Billboard) 
// og viser en anden kasse (Mixtape) ved at slå en "hidden" CSS-klasse til og fra.
function skiftView(viewNavn) {
    // 1. Find alle de HTML-elementer der har klassen "view".
    const alleViews = document.querySelectorAll('.view')
    
    // 2. Kør et loop igennem dem alle, og gem dem ved at tilføje CSS-klassen "hidden".
    for (let i = 0; i < alleViews.length; i++) {
        alleViews[i].classList.add('hidden')
    }
    
    // 3. Find præcis dét view, som brugeren bad om (fx "view-mixtape"), 
    // og vis det ved at FJERNE "hidden" klassen.
    document.getElementById('view-' + viewNavn).classList.remove('hidden')

    // 4. Hvis brugeren netop åbnede "mixtape"-viewet, skal vi bede vores server
    // om at hente brugerens sange fra databasen. (Dette kaldes asynkron data-fetching).
    if (viewNavn === 'mixtape') {
        hentMixtape()
    }
}

// ─── SANGKORT COMPONENT ───────────────────────────────────
// Dette er en "Factory" (fabrik). Den tager et sang-objekt (fra databasen) 
// og et nummer (dens placering på listen), og returnerer en lang tekst-streng med HTML.
// Vi bruger denne streng til at skabe visuelle kort på skærmen (DOM manipulation).
function sangKort(sang, nummer) {
    // Matematik: Sange i databasen er gemt i millisekunder (fx 180000 ms).
    // Vi dividerer med 60.000 for at finde de fulde minutter.
    const min = Math.floor(sang.duration_ms / 60000)
    // Vi bruger "modulo" (%) til at finde rest-sekunderne. 
    // `padStart(2, '0')` sikrer at 5 sekunder skrives som "05" og ikke bare "5".
    const sek = String(Math.floor((sang.duration_ms % 60000) / 1000)).padStart(2, '0')

    // Kald vores hash-funktion for at få den rigtige farve
    const farve = hentGenreFarve(sang.genre)
    
    // I JavaScript (og datalogi) starter lister på 0. Men mennesker starter på 1.
    // Derfor trækker vi 1 fra det viste `nummer`, når vi skal fortælle afspilleren, 
    // hvilket 'index' den skal spille fra `sangeListe` arrayet.
    const index = nummer - 1  

    // Returnerer HTML'en. Læg mærke til `onclick="afspilSang(index)"`. 
    // Dette knytter en hændelse (Event Listener) direkte til kassen, så musikken 
    // starter, når brugeren klikker på den!
    return '<div onclick="afspilSang(' + index + ')" class="flex items-center gap-6 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">' +
        '<span class="text-white text-center w-6 font-medium">' + nummer + '</span>' +
        '<div class="w-12 h-12 rounded-xl ' + farve + ' flex-shrink-0 opacity-80"></div>' +
        '<div class="flex-1 min-w-0">' +
            '<p class="text-sm font-medium text-white truncate">' + sang.title + '</p>' +
            '<p class="text-zinc-400 text-xs mt-0.5">' + sang.artist + '</p>' +
        '</div>' +
        // Viser enten brugerens personlige elo_rating ELLER den globale elo_rating (hvis personlig mangler).
        // Dette gøres via en "Logical OR" (||).
        '<span class="text-xs font-mono ' + farve + ' text-white px-2 py-0.5 rounded-full">' + (sang.user_elo_rating || sang.elo_rating) + '</span>' +
        '<span class="text-xs text-zinc-400">' + min + ':' + sek + '</span>' +
        '</div>'
}


// ─── BILLBOARD (Hovedsiden) ──────────────────────────────────
// `async` betyder, at denne funktion tager tid (den skal vente på internettet/serveren).
// Den henter og viser den globale top 20 liste.
async function hentBillboard() {
    try {
        // 1. Hvilken genre vil brugeren se? Aflæs det fra HTML <select> dropdown-menuen.
        const genre = document.getElementById('billboard-genre-filter').value
        
        // 2. Byg URL'en. Hvis de valgte "pop", bliver URL'en '/api/billboard?genre=pop'.
        // Ellers bare '/api/billboard' (som giver alle sange).
        const url = genre ? '/api/billboard?genre=' + genre : '/api/billboard'

        // Logning til konsollen (F12) for at gøre det nemt at "fejlfinde" (debugge).
        console.log("====================================")
        console.log("-> Henter global billboard liste...")
        console.log("-> Filter valgt: " + (genre || 'Alle genrer'))
        
        // 3. Brug 'await fetch(url)' til at stille et spørgsmål over netværket til serveren.
        const response = await fetch(url)
        // 4. Serveren svarer i JSON (JavaScript Object Notation), som vi omdanner til en rigtig JS liste.
        const sange = await response.json()
        
        console.log("<- Fandt " + sange.length + " sange til billboardet")
        console.log("====================================")

        // 5. Opdater den globale `sangeListe` så vores musikafspiller ved, hvad der er på skærmen.
        sangeListe = sange  

        // 6. Find HTML-boksen, hvor sangene skal bo.
        const container = document.getElementById('billboard-liste')
        
        // Tøm listen HELT før vi bygger den op igen (ellers bygger vi bare nye sange oven på de gamle).
        container.innerHTML = '' 

        // 7. Loop igennem alle sangene fra databasen.
        // Hver gang kører vi sangKort() fabrikken og tilføjer resultatet (+=) til containeren.
        for (let i = 0; i < sange.length; i++) {
            container.innerHTML += sangKort(sange[i], i + 1)
        }
    } catch (error) {
        // Hvis noget går galt (fx serveren er nede, eller databasen crasher) fanger vi fejlen her i 'catch',
        // så hele hjemmesiden ikke går i sort for brugeren.
        console.error("Fejl ved hentning af billboard:", error)
        alert("Kunne ikke forbinde til databasen. Er serveren tændt?")
    }
}

// ─── MIXTAPE ────────────────────────────────────
// Henter brugerens personlige mixtape. Dette er lidt mere kompliceret, 
// fordi vi skal hente to ting: 1) Listen over DERES mixtapes (til dropdown menuen), 
// og 2) Selve sangene i det valgte mixtape.
async function hentMixtape() {
    // `getCurrentUser()` er defineret i `components.js`. Den læser brugerens navn fra URL'en.
    const username = getCurrentUser()

    // Har vi ikke et brugernavn (fx hvis nogen bare skriver "next-track.com" uden at logge ind),
    // viser vi en fejlskærm ("Du har ikke lavet et mixtape endnu"), og stopper koden her med `return`.
    if (!username) {
        document.getElementById('ingen-mixtape').classList.remove('hidden')
        document.getElementById('mixtape-liste').innerHTML = ''
        document.getElementById('nyt-mixtape-sektion').classList.add('hidden')
        return
    }

    try {
        // --- 1. BYG DROPDOWN MENUEN ---
        const filterSelect = document.getElementById('mixtape-filter')
        const nuværendeValg = filterSelect.value // Hvad peger dropdownen på lige nu?
        
        // Vi nulstiller menuen med standard-muligheden: "Privat Billboard"
        filterSelect.innerHTML = '<option value="">Privat Billboard (Alle)</option>'

        // Vi spørger vores API: "Giv mig alle de forskellige mixtape-navne, som 'username' ejer."
        const namesRes = await fetch('/api/mixtapes?username=' + username)
        const names = await namesRes.json()
        
        // For hvert navn, bygger vi et HTML <option> tag og sætter ind i menuen.
        for (let i = 0; i < names.length; i++) {
            const opt = document.createElement('option')
            opt.value = names[i]
            opt.textContent = names[i]
            filterSelect.appendChild(opt) // appendChild tilføjer elementet i bunden af listen.
        }

        // --- 2. HÅNDTER URL-PARAMETRE (Redirect fra onboarding) ---
        // Hvis brugeren lige har lavet et nyt mixtape i 'onboarding.js', sender den os herhen 
        // med url'en '?mixtapeName=MitNyesteMixtape'.
        const params = new URLSearchParams(window.location.search)
        const urlMixtape = params.get('mixtapeName')
        
        // Hvis der står et mixtape i URL'en, og vi ikke allerede har valgt et selv:
        if (urlMixtape && !nuværendeValg) {
            filterSelect.value = urlMixtape // Vælg det automatisk i menuen!
            
            // "Clean-up": Vi fjerner `&mixtapeName=...` fra browselinjen, 
            // så det ikke bliver hængende og skaber forvirring, hvis brugeren genindlæser siden.
            // window.history.replaceState snyder browserens historik og overskriver URL'en uden at reloade.
            window.history.replaceState({}, document.title, window.location.pathname + '?username=' + username + '&view=mixtape')
        } else if (nuværendeValg) {
            // Hvis vi allerede havde valgt et, så sørg for, at dropdown menuen stadig husker det.
            filterSelect.value = nuværendeValg
        }

        // --- 3. BYG URL'en TIL DATABASEN ---
        const valgtMixtape = filterSelect.value
        let url = '/api/mixtape?username=' + username
        if (valgtMixtape) {
            // encodeURIComponent sørger for, at "Mit Fede Mixtape" bliver lavet om til 
            // "Mit%20Fede%20Mixtape", fordi mellemrum ødelægger URL'er på nettet.
            url += '&mixtapeName=' + encodeURIComponent(valgtMixtape) 
        }

        // --- 4. HENT SANGENE! ---
        console.log("====================================")
        console.log("-> Henter mixtape fra databasen...")
        console.log("-> Bruger: " + username)
        console.log("-> Mixtape: " + (valgtMixtape || 'Privat Billboard (Alle)'))

        const res = await fetch(url)
        const sange = await res.json()

        console.log("<- Fandt " + (sange ? sange.length : 0) + " sange til mixtapet")
        console.log("====================================")

        // Hvis brugeren aldrig har gemt nogen sange (listen er tom eller findes slet ikke):
        if (!sange || sange.length === 0) {
            // Vis en pæn besked med et link til at starte Onboarding.
            document.getElementById('ingen-mixtape').classList.remove('hidden')
            document.getElementById('mixtape-liste').innerHTML = ''
            document.getElementById('nyt-mixtape-sektion').classList.add('hidden')
            return // Stop koden her, der er ikke mere at gøre.
        }

        // Succes! Vi skjuler fejlbeskeden og viser den knap i bunden, der kan lave "Et Nyt Mixtape".
        document.getElementById('ingen-mixtape').classList.add('hidden')
        document.getElementById('nyt-mixtape-sektion').classList.remove('hidden')

        // Opdater den store H1 overskrift øverst på siden.
        if (valgtMixtape) {
            document.getElementById('mixtape-titel').textContent = valgtMixtape
        } else {
            document.getElementById('mixtape-titel').textContent = 'Privat Billboard'
        }

        // Gør sangene klar til afspilleren (fra components.js)
        sangeListe = sange  

        // Tøm og genopbyg selve listen på skærmen
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
// DOMContentLoaded betyder: "Kør først denne kode, når browseren har indlæst al HTML'en."
// Dette forhindrer JavaScript i at prøve at ændre på knapper, der ikke eksisterer endnu.
document.addEventListener('DOMContentLoaded', function () {
    // Disse tre funktioner bor over i `components.js`.
    // Vi kalder dem for at injicere vores genbrugelige "Komponenter" i siden.
    indsætHeader()
    indsætAfspiller()
    opdaterAvatar()
    
    // Hent og vis billboardet med det samme brugeren åbner `index.html`.
    hentBillboard()

    // Kigger på URL'en (hvis der står `?view=mixtape`, skal vi lade som om brugeren trykkede på "Mixtape" fanen).
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'mixtape') {
        skiftView('mixtape')
    }
})

// ─── EVENT LISTENERS (Brugerinteraktion) ──────────────────────
// "Lyt" efter hvornår brugeren ændrer noget i dropdown menuerne (når 'change' sker).
// Hver gang de skifter genre, kører vi `hentBillboard()` igen!
document.getElementById('billboard-genre-filter').addEventListener('change', function () {
    hentBillboard()
})

// Hver gang de skifter mixtape i dropdownen, kører vi `hentMixtape()` igen!
document.getElementById('mixtape-filter').addEventListener('change', function () {
    hentMixtape()
})
