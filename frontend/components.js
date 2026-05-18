// Indsætter header øverst i body
function indsætHeader() {
    const header = document.createElement('header')
    header.className = 'sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/80 px-8 py-4 backdrop-blur-xl'
    header.innerHTML = `
        <div class="flex-1 flex justify-start">
            <span class="font-bold text-lg">
                <span class="text-white">Next-</span>
                <span class="text-red-500">track</span>
            </span>
        </div>
        <div class="flex-1 flex justify-center">
            <input type="text" id="søgefelt" placeholder="Søg..."
                   class="w-64 rounded-full border border-white/10 bg-white/10 px-4 py-2
                          text-sm text-white placeholder-zinc-500 outline-none
                          focus:border-white/20 focus:w-72 transition-all" />
        </div>
        <div class="flex-1 flex items-center justify-end gap-4">
            <nav class="flex gap-1">
                <button onclick="window.location.href='app.html?username='+getCurrentUser()"
                        class="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400
                               hover:text-white hover:bg-white/10 transition-colors">
                    Billboard
                </button>
                <button onclick="window.location.href='app.html?username='+getCurrentUser()"
                        class="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400
                               hover:text-white hover:bg-white/10 transition-colors">
                    Mit mixtape
                </button>
                <button onclick="window.location.href='app.html?username='+getCurrentUser()"
                        class="px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-400
                               hover:text-white hover:bg-white/10 transition-colors">
                    Gruppe Mix
                </button>
            </nav>
            <div class="h-5 w-px bg-white/10"></div>
            <div id="bruger-avatar"
                 class="flex h-9 w-9 flex-shrink-0 items-center justify-center
                        rounded-full bg-red-500 font-semibold text-white text-sm">
                ?
            </div>
        </div>
    `
    document.body.insertBefore(header, document.body.firstChild)
}

// Indsætter afspiller i bunden
function indsætAfspiller() {
    const afspiller = document.createElement('div')
    afspiller.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-[1200px] bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] px-5 py-4 md:px-12 flex flex-col md:flex-row items-center justify-between border border-white/10 shadow-[0_40px_60px_rgba(0,0,0,0.5)] z-[100] gap-4 md:gap-0'
    afspiller.innerHTML = `
        <div class="flex items-center gap-4 md:gap-8 w-full md:w-[30%]">
            <div class="w-16 h-16 md:w-14 md:h-14 rounded-[1.5rem] bg-red-500/20 border border-red-500/30 flex-shrink-0"
                 id="afspillerBillede"></div>
            <div class="truncate">
                <h3 class="text-base font-semibold truncate text-white" id="afspillerTitel">Ingen sang spiller</h3>
                <p class="text-sm text-zinc-400 truncate" id="afspillerKunstner">----</p>
            </div>
        </div>
        <div class="flex items-center gap-4 md:gap-8">
            <button class="bg-white/10 backdrop-blur-sm text-zinc-300 rounded-full px-4 py-2 font-medium text-sm hover:scale-105 hover:text-white transition-transform"
                    id="forrigeKnap">Forrige</button>
            <button class="w-12 h-12 rounded-full bg-white text-zinc-900 flex items-center justify-center text-lg hover:scale-105 transition-transform translate-x-px"
                    id="spilPauseKnap">▶</button>
            <button class="bg-white/10 backdrop-blur-sm text-zinc-300 rounded-full px-4 py-2 font-medium text-sm hover:scale-105 hover:text-white transition-transform"
                    id="næsteKnap">Næste</button>
        </div>
        <div class="flex items-center gap-4 w-full md:w-[30%]">
            <span class="text-xs text-zinc-400 w-10 text-right" id="nuværendeTid">0:00</span>
            <div class="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div class="h-full w-0 bg-red-500 transition-all ease-linear" id="progressFill"></div>
            </div>
            <span class="text-xs text-zinc-400 w-10" id="totalTid">0:00</span>
        </div>
    `
    document.body.appendChild(afspiller)
}

// Hent username fra URL
function getCurrentUser() {
    const params = new URLSearchParams(window.location.search)
    return params.get('username') || ''
}

// Opdater avatar med brugerens forbogstav
function opdaterAvatar() {
    const user = getCurrentUser()
    const avatar = document.getElementById('bruger-avatar')
    if (avatar && user) {
        avatar.textContent = user.charAt(0).toUpperCase()
    }
}