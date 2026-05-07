const searchInput = document.getElementById("searchInput");
const songList = document.getElementById("songList");
const nowPlaying = document.getElementById("nowPlaying");
const queueList = document.getElementById("queueList");
const nextBtn = document.getElementById("nextBtn");

let queue = [];

// 🔥 Hent sange fra backend
async function getSongs() {
  const res = await fetch("http://localhost:3000/api/songs");
  const songs = await res.json();

  showSongs(songs);
}

// 🎵 Vis sange
function showSongs(songs) {
  songList.innerHTML = "";

  songs.forEach(song => {
    const div = document.createElement("div");

    div.className = "bg-zinc-100 rounded-2xl p-5 flex justify-between";

    div.innerHTML = `
      <div>
        <h4 class="font-bold">${song.title}</h4>
        <p>${song.artist} · ${song.genre}</p>
      </div>

      <div class="flex gap-2">
        <button class="playBtn bg-green-500 text-white px-3 py-1 rounded">
          Afspil
        </button>

        <button class="queueBtn bg-orange-500 text-white px-3 py-1 rounded">
          Tilføj
        </button>
      </div>
    `;

    div.querySelector(".playBtn").addEventListener("click", () => {
      playSong(song);
    });

    div.querySelector(".queueBtn").addEventListener("click", () => {
      addToQueue(song);
    });

    songList.appendChild(div);
  });
}

// ▶ Afspil
async function playSong(song) {
  nowPlaying.innerText = `${song.title} - ${song.artist}`;

  await fetch(`http://localhost:3000/api/play/${song.id}`, {
    method: "POST"
  });
}

// ➕ Tilføj til kø
function addToQueue(song) {
  queue.push(song);
  showQueue();
}

// 📋 Vis kø
function showQueue() {
  queueList.innerHTML = "";

  if (queue.length === 0) {
    queueList.innerText = "Køen er tom.";
    return;
  }

  queue.forEach(song => {
    const item = document.createElement("div");
    item.className = "bg-zinc-100 p-2 mb-2 rounded";
    item.innerText = `${song.title} - ${song.artist}`;
    queueList.appendChild(item);
  });
}

// ⏭ Næste sang
function playNextSong() {
  if (queue.length === 0) {
  alert("Køen er tom");
  return;
}

  const nextSong = queue.shift();

  playSong(nextSong);
  showQueue();
}

nextBtn.addEventListener("click", playNextSong);

// 🔍 Søg
searchInput.addEventListener("input", () => {
  const text = searchInput.value.toLowerCase();

  const cards = songList.querySelectorAll("div");

  cards.forEach(card => {
    if (card.innerText.toLowerCase().includes(text)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  });
});

// 🚀 Start
getSongs();