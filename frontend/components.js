// Indsætter header øverst i body. //
// At bygge HTML i JavaScript (DOM Manipulation) er smart, fordi vi kun skal rette koden ét sted,
// og så opdateres headeren automatisk på BÅDE onboarding.html og billboard.html.
function indsætHeader() {
    const header = document.createElement('header')
    header.className = 'sticky top-0 left-0 w-full z-50 flex items-center justify-between border-b border-white/10 bg-zinc-950/80 px-8 py-4 backdrop-blur-xl'
    header.innerHTML =
        '<div class="flex-1 flex justify-start">' +
        '<span class="font-bold text-lg">' +
        '<span class="text-white">Next-</span>' +
        '<span class="text-red-500">track</span>' +
        '</span>' +
        '</div>' +
        '<div class="flex-1 flex justify-center" id="header-søgefelt-container">' +
        '<input type="text" id="søgefelt" placeholder="Søg..."' +
        '   class="w-64 rounded-full border border-white/10 bg-white/10 px-4 py-2' +
        '          text-sm text-white placeholder-zinc-500 outline-none' +
        '          focus:border-white/20 focus:w-72 transition-all" />' +
        '</div>' +
        '<div class="flex-1 flex items-center justify-end gap-4">' +
        '<nav class="flex gap-1">' +
        // Knap 1: Billboard — altid den globale liste
        '<button onclick="gåTilBillboard()"' +
        '        class="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400' +
        '               hover:text-white hover:bg-white/10 transition-colors">' +
        'Billboard' +
        '</button>' +
        // Knap 2: Mit Mixtape — åbner mixtape-view på billboard-siden
        '<button onclick="gåTilMixtape()"' +
        '        class="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400' +
        '               hover:text-white hover:bg-white/10 transition-colors">' +
        'Mit Mixtape' +
        '</button>' +
        '</nav>' +
        '<div class="h-5 w-px bg-white/10"></div>' +
        '<div id="bruger-avatar"' +
        '     class="flex h-9 w-9 flex-shrink-0 items-center justify-center' +
        '            rounded-full bg-red-500 font-semibold text-white text-sm">' +
        '?' +
        '</div>' +
        '</div>'

    document.body.insertBefore(header, document.body.firstChild)

    // Skjul søgefeltet på onboarding-siden (vi vil ikke lade brugeren søge mens de stemmer)
    if (window.location.pathname.includes('onboarding.html')) {
        const soegefelt = document.getElementById('header-søgefelt-container')
        if (soegefelt) {
            soegefelt.classList.add('hidden')
        }
    }
}

// Navigerer til Billboard-viewet
function gåTilBillboard() {
    const user = getCurrentUser()
    // Hvis vi allerede er på index.html — skift bare kassen der vises (SPA logik)
    if (window.location.pathname.includes('index.html')) {
        if (typeof skiftView === 'function') {
            skiftView('billboard')
        }
    } else {
        window.location.href = 'index.html?username=' + user
    }
}

// Navigerer til Mixtape-viewet
function gåTilMixtape() {
    const user = getCurrentUser()
    if (window.location.pathname.includes('index.html')) {
        if (typeof skiftView === 'function') {
            skiftView('mixtape')
        }
    } else {
        window.location.href = 'index.html?username=' + user + '&view=mixtape'
    }
}

// Indsætter afspiller i bunden af siden
function indsætAfspiller() {
    const afspiller = document.createElement('div')
    afspiller.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-[1200px] bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] px-5 py-4 md:px-12 flex flex-col md:flex-row items-center justify-between border border-white/10 shadow-[0_40px_60px_rgba(0,0,0,0.5)] z-[100] gap-4 md:gap-0'
    afspiller.innerHTML =
        '<div class="flex items-center gap-4 md:gap-8 w-full md:w-[30%]">' +
        '<div class="w-16 h-16 md:w-14 md:h-14 rounded-[1.5rem] bg-red-500/20 border border-red-500/30 flex-shrink-0"' +
        '     id="afspillerBillede"></div>' +
        '<div class="truncate">' +
        '<h3 class="text-base font-semibold truncate text-white" id="afspillerTitel">Ingen sang spiller</h3>' +
        '<p class="text-sm text-zinc-400 truncate" id="afspillerKunstner">----</p>' +
        '</div>' +
        '</div>' +
        '<div class="flex items-center gap-4 md:gap-8">' +
        '<button class="bg-white/10 backdrop-blur-sm text-zinc-300 rounded-full px-4 py-2 font-medium text-sm hover:scale-105 hover:text-white transition-transform"' +
        '        id="forrigeKnap">Forrige</button>' +
        '<button class="w-12 h-12 rounded-full bg-white text-zinc-900 flex items-center justify-center text-lg hover:scale-105 transition-transform translate-x-px"' +
        '        id="spilPauseKnap">▶</button>' +
        '<button class="bg-white/10 backdrop-blur-sm text-zinc-300 rounded-full px-4 py-2 font-medium text-sm hover:scale-105 hover:text-white transition-transform"' +
        '        id="næsteKnap">Næste</button>' +
        '</div>' +
        '<div class="flex items-center gap-4 w-full md:w-[30%]">' +
        '<span class="text-xs text-zinc-400 w-10 text-right" id="nuværendeTid">0:00</span>' +
        '<div id="progressBar" class="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer">' +
        '<div class="h-full w-0 bg-red-500 transition-all ease-linear" id="progressFill"></div>' +
        '</div>' +
        '<span class="text-xs text-zinc-400 w-10" id="totalTid">0:00</span>' +
        '</div>'

    document.body.appendChild(afspiller)

    // Tilføj event listeners til afspillerens knapper
    document.getElementById('næsteKnap').addEventListener('click', næsteSang)
    document.getElementById('forrigeKnap').addEventListener('click', forrigeSang)
    document.getElementById('spilPauseKnap').addEventListener('click', togglePlayPause)
    document.getElementById('progressBar').addEventListener('click', spolSang)
}

// Hent username fra URL-parametre (?username=casper)
function getCurrentUser() {
    const params = new URLSearchParams(window.location.search)
    return params.get('username') || ''
}

// Opdater avatar-cirklen (rød cirkel i hjørnet) med brugerens forbogstav
function opdaterAvatar() {
    const user = getCurrentUser()
    const avatar = document.getElementById('bruger-avatar')
    if (avatar && user) {
        avatar.textContent = user.charAt(0).toUpperCase()
    }
}

// ─── AFSPILLER LOGIK ────────────────────────────
// Vores "fake" musikafspiller. Den spiller ikke rigtig lyd, men den simulerer
// fuldstændig hvordan en rigtig Spotify afspiller ville virke visuelt.
let aktivSangIndex = null
let progressInterval = null
let progressProcent = 0
let spiller = false

// Kaldes når brugeren klikker på et sangkort eller spiler
function afspilSang(index) {
    if (typeof sangeListe === 'undefined') return
    const sang = sangeListe[index]
    if (!sang) return

    // Hent farven dynamisk
    const farve = typeof hentGenreFarve === 'function' ? hentGenreFarve(sang.genre) : 'bg-red-500'

    document.getElementById('afspillerTitel').textContent = sang.title
    document.getElementById('afspillerKunstner').textContent = sang.artist

    document.getElementById('afspillerBillede').className =
        'w-16 h-16 md:w-14 md:h-14 rounded-[1.5rem] ' + farve + ' border border-white/20 flex-shrink-0'

    const min = Math.floor(sang.duration_ms / 60000)
    const sek = String(Math.floor((sang.duration_ms % 60000) / 1000)).padStart(2, '0')

    document.getElementById('totalTid').textContent = min + ':' + sek
    document.getElementById('nuværendeTid').textContent = '0:00'
    document.getElementById('progressFill').style.width = '0%'

    document.getElementById('spilPauseKnap').textContent = '⏸'

    aktivSangIndex = index
    spiller = true
    startProgress(sang)
}

// Starter den røde progressbar og opdaterer tiden
// Bruger setInterval til at køre koden hver 300 millisekund, så stregen bevæger sig glidende.
function startProgress(sang) {
    clearInterval(progressInterval)
    progressProcent = 0

    progressInterval = setInterval(function () {
        if (spiller === false) return

        progressProcent += 100 / (sang.duration_ms / 300)
        document.getElementById('progressFill').style.width = progressProcent + '%'

        const nuTid = sang.duration_ms * progressProcent / 100
        const min = Math.floor(nuTid / 60000)
        let sek = Math.floor((nuTid % 60000) / 1000)

        if (sek < 10) {
            sek = '0' + sek
        }

        document.getElementById('nuværendeTid').textContent = min + ':' + sek

        if (progressProcent >= 100) {
            clearInterval(progressInterval)
            næsteSang()
        }
    }, 300)
}

function næsteSang() {
    if (aktivSangIndex === null || typeof sangeListe === 'undefined') return

    aktivSangIndex++
    if (aktivSangIndex >= sangeListe.length) {
        aktivSangIndex = 0
    }
    afspilSang(aktivSangIndex)
}

function forrigeSang() {
    if (aktivSangIndex === null || typeof sangeListe === 'undefined') return

    aktivSangIndex--
    if (aktivSangIndex < 0) {
        aktivSangIndex = sangeListe.length - 1
    }
    afspilSang(aktivSangIndex)
}

function togglePlayPause() {
    if (aktivSangIndex === null) return

    if (spiller === true) {
        spiller = false
        document.getElementById('spilPauseKnap').textContent = '▶'
    } else {
        spiller = true
        document.getElementById('spilPauseKnap').textContent = '⏸'
    }
}

function spolSang(event) {
    if (aktivSangIndex === null) return

    const bar = document.getElementById('progressBar')
    progressProcent = event.offsetX / bar.offsetWidth * 100
    document.getElementById('progressFill').style.width = progressProcent + '%'
}