import { generateLofi, generateSynthwave, generateAmbient } from './tracks.js';

// ─── Song Catalogue ───────────────────────────────────────────────────────────
// First 3 are real generated tracks. Rest are "browse" cards (like Spotify).
const CATALOGUE = [
  // ── Generated (will have real audio) ──
  {
    id: 0, title: "Midnight Drift",  artist: "GrooveBox Originals",
    genre: "Lo-Fi Hip Hop", duration: "1:30",
    color: "#1a2a3a", emoji: "🌙", generated: true, generator: 'lofi',
  },
  {
    id: 1, title: "Neon Pulse",      artist: "GrooveBox Originals",
    genre: "Synthwave", duration: "1:30",
    color: "#2a0a3a", emoji: "⚡", generated: true, generator: 'synthwave',
  },
  {
    id: 2, title: "Deep Space",      artist: "GrooveBox Originals",
    genre: "Dark Ambient", duration: "1:30",
    color: "#050a1a", emoji: "🚀", generated: true, generator: 'ambient',
  },
  // ── Browse cards (no audio — upload your own) ──
  { id: 3,  title: "Summer Breeze",   artist: "Acoustic Soul",   genre: "Acoustic",    duration: "3:42", color: "#3a1a0a", emoji: "🌊" },
  { id: 4,  title: "Golden Hour",     artist: "Indie Folk",      genre: "Indie",       duration: "4:10", color: "#3a2a0a", emoji: "🌅" },
  { id: 5,  title: "City Lights",     artist: "Urban Jazz",      genre: "Jazz",        duration: "5:02", color: "#0a2a1a", emoji: "🏙️" },
  { id: 6,  title: "Forest Walk",     artist: "Nature Tones",    genre: "Ambient",     duration: "6:15", color: "#0a2a0a", emoji: "🌲" },
  { id: 7,  title: "Chill Vibes",     artist: "Lo-Fi Beats",     genre: "Lo-Fi",       duration: "3:55", color: "#1a3a2a", emoji: "🎵" },
  { id: 8,  title: "Electric Dreams", artist: "Neon Pulse",      genre: "Synthwave",   duration: "4:30", color: "#1a0a3a", emoji: "🎸" },
  { id: 9,  title: "Sunrise Melody",  artist: "Piano Dreams",    genre: "Classical",   duration: "3:20", color: "#3a3a0a", emoji: "🎹" },
  { id: 10, title: "Rainy Day",       artist: "Soft Acoustic",   genre: "Acoustic",    duration: "4:05", color: "#1a1a2a", emoji: "🌧️" },
  { id: 11, title: "Ocean Waves",     artist: "Ambient Sounds",  genre: "Ambient",     duration: "7:00", color: "#0a1a3a", emoji: "🌊" },
];

// ─── State ────────────────────────────────────────────────────────────────────
let songs = CATALOGUE.map(s => ({ ...s, src: null, isLocal: false }));
let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0; // 0=off 1=all 2=one
let isMuted = false;
let likedSongs = new Set();
let shuffleOrder = [];
let tracksReady = false; // true once generated tracks are loaded

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const audio         = document.getElementById('audio-player');
const songGrid      = document.getElementById('song-grid');
const playBtn       = document.getElementById('play-btn');
const prevBtn       = document.getElementById('prev-btn');
const nextBtn       = document.getElementById('next-btn');
const shuffleBtn    = document.getElementById('shuffle-btn');
const repeatBtn     = document.getElementById('repeat-btn');
const likeBtn       = document.getElementById('like-btn');
const muteBtn       = document.getElementById('mute-btn');
const queueBtn      = document.getElementById('queue-btn');
const closeQueue    = document.getElementById('close-queue');
const queuePanel    = document.getElementById('queue-panel');
const queueList     = document.getElementById('queue-list');
const progressBar   = document.getElementById('progress-bar');
const progressFill  = document.getElementById('progress-fill');
const progressThumb = document.getElementById('progress-thumb');
const volumeBar     = document.getElementById('volume-bar');
const volumeFill    = document.getElementById('volume-fill');
const volumeThumb   = document.getElementById('volume-thumb');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl   = document.getElementById('total-time');
const npTitle       = document.getElementById('np-title');
const npArtist      = document.getElementById('np-artist');
const npCover       = document.getElementById('np-cover');
const searchInput   = document.getElementById('search-input');
const localUpload   = document.getElementById('local-upload');
const playlistSidebar = document.getElementById('playlist-sidebar');

// ─── Boot ─────────────────────────────────────────────────────────────────────
audio.volume = 0.7;
setVolumeUI(0.7);
renderGrid(songs);
renderQueue();
renderSidebarPlaylists();
showWelcomeScreen();

async function boot() {
  showToast('🎵 Generating tracks… hang tight', 0);
  try {
    const [lofiUrl, synthUrl, ambientUrl] = await Promise.all([
      generateLofi(90),
      generateSynthwave(90),
      generateAmbient(90),
    ]);
    songs[0].src = lofiUrl;
    songs[1].src = synthUrl;
    songs[2].src = ambientUrl;
    tracksReady = true;
    renderGrid(songs);
    renderQueue();
    hideToast();
    // Auto-play first track as welcome
    setTimeout(() => {
      dismissWelcome();
      playSong(0);
    }, 400);
  } catch (e) {
    hideToast();
    showToast('⚠️ Could not generate tracks. Upload your own songs.', 4000);
  }
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────
function showWelcomeScreen() {
  const overlay = document.createElement('div');
  overlay.id = 'welcome-overlay';
  overlay.innerHTML = `
    <div class="welcome-card">
      <div class="welcome-logo"><i class="fa-solid fa-music"></i></div>
      <h1>GrooveBox</h1>
      <p>Your personal music space</p>
      <button id="welcome-enter" class="welcome-btn">
        <i class="fa-solid fa-play"></i> Start Listening
      </button>
      <span class="welcome-sub">3 original tracks ready to play</span>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('welcome-enter').addEventListener('click', () => {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 500);
    boot();
  });
}

function dismissWelcome() {
  const o = document.getElementById('welcome-overlay');
  if (o) { o.classList.add('fade-out'); setTimeout(() => o.remove(), 500); }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, duration = 3000) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg; t.className = 'toast show';
  clearTimeout(toastTimer);
  if (duration > 0) toastTimer = setTimeout(hideToast, duration);
}
function hideToast() {
  const t = document.getElementById('toast');
  if (t) t.className = 'toast';
}

// ─── Render Grid ──────────────────────────────────────────────────────────────
function renderGrid(list) {
  songGrid.innerHTML = '';

  // Section: Your Tracks (generated)
  const generated = list.filter(s => s.generated);
  const browse    = list.filter(s => !s.generated);

  if (generated.length) {
    const sec = document.createElement('div');
    sec.className = 'grid-section';
    sec.innerHTML = `<h3 class="grid-section-title">🎧 GrooveBox Originals</h3>`;
    const grid = document.createElement('div'); grid.className = 'song-grid-inner';
    generated.forEach(song => grid.appendChild(makeSongCard(song)));
    sec.appendChild(grid); songGrid.appendChild(sec);
  }

  if (browse.length) {
    const sec = document.createElement('div');
    sec.className = 'grid-section';
    sec.innerHTML = `<h3 class="grid-section-title">📂 Browse & Add Your Songs</h3>`;
    const grid = document.createElement('div'); grid.className = 'song-grid-inner';
    browse.forEach(song => grid.appendChild(makeSongCard(song)));
    sec.appendChild(grid); songGrid.appendChild(sec);
  }
}

function makeSongCard(song) {
  const isActive  = song.id === currentIndex;
  const hasAudio  = !!song.src;
  const isBrowse  = !song.generated && !song.isLocal;

  const card = document.createElement('div');
  card.className = `song-card${isActive ? ' active' : ''}${isBrowse ? ' browse-card' : ''}`;
  card.dataset.id = song.id;

  const playIcon = isActive && isPlaying ? 'fa-pause' : 'fa-play';
  const overlayIcon = isBrowse
    ? `<i class="fa-solid fa-plus"></i>`
    : `<i class="fa-solid ${playIcon}"></i>`;

  card.innerHTML = `
    <div class="card-cover" style="background:${song.color}">
      <span class="cover-icon">${song.emoji}</span>
      ${isBrowse ? '<div class="browse-badge">Upload to play</div>' : ''}
      <div class="card-play-overlay">${overlayIcon}</div>
    </div>
    <div class="card-title">${song.title}</div>
    <div class="card-artist">${song.artist}</div>
    <div class="card-meta">${song.genre} · ${song.duration}</div>
  `;

  card.addEventListener('click', () => {
    if (isBrowse) {
      showToast(`📁 Upload "${song.title}" via "Add Local Songs" in the sidebar`, 3500);
    } else {
      playSong(song.id);
    }
  });
  return card;
}

// ─── Play ─────────────────────────────────────────────────────────────────────
function playSong(id) {
  const song = songs.find(s => s.id === id);
  if (!song) return;

  if (currentIndex === id) { togglePlay(); return; }

  currentIndex = id;

  if (song.src) {
    audio.src = song.src;
    audio.play().catch(() => {});
    isPlaying = true;
  } else {
    isPlaying = false;
    showToast(`📁 No audio for "${song.title}". Upload via sidebar.`, 3000);
  }

  updateNowPlaying(song);
  updatePlayBtn();
  renderGrid(songs);
  renderQueue();
  updateLikeBtn();
}

function togglePlay() {
  if (currentIndex === -1) return;
  if (isPlaying) {
    audio.pause(); isPlaying = false;
  } else if (audio.src) {
    audio.play().catch(() => {}); isPlaying = true;
  }
  updatePlayBtn();
  renderGrid(songs);
}

function updatePlayBtn() {
  playBtn.innerHTML = isPlaying
    ? '<i class="fa-solid fa-pause"></i>'
    : '<i class="fa-solid fa-play"></i>';
}

// ─── Now Playing ──────────────────────────────────────────────────────────────
function updateNowPlaying(song) {
  npTitle.textContent  = song.title;
  npArtist.textContent = song.artist;
  npCover.innerHTML    = song.emoji;
  npCover.style.background = song.color;
  document.querySelector('.main').style.background =
    `linear-gradient(180deg, ${song.color}cc 0%, var(--bg) 320px)`;
}

// ─── Prev / Next ──────────────────────────────────────────────────────────────
function playNext() {
  if (!songs.length) return;
  const playable = songs.filter(s => s.src);
  if (!playable.length) return;
  let next;
  if (isShuffle) {
    if (!shuffleOrder.length) buildShuffleOrder();
    next = shuffleOrder.shift();
  } else {
    const idx = playable.findIndex(s => s.id === currentIndex);
    next = playable[(idx + 1) % playable.length].id;
  }
  playSong(typeof next === 'number' ? next : next);
}

function playPrev() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  const playable = songs.filter(s => s.src);
  if (!playable.length) return;
  const idx = playable.findIndex(s => s.id === currentIndex);
  playSong(playable[(idx - 1 + playable.length) % playable.length].id);
}

function buildShuffleOrder() {
  const playable = songs.filter(s => s.src && s.id !== currentIndex);
  shuffleOrder = playable.map(s => s.id);
  for (let i = shuffleOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
  }
}

// ─── Audio Events ─────────────────────────────────────────────────────────────
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width  = pct + '%';
  progressThumb.style.left  = pct + '%';
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  totalTimeEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
  if (repeatMode === 2) { audio.currentTime = 0; audio.play(); }
  else if (repeatMode === 1 || isShuffle) { playNext(); }
  else {
    const playable = songs.filter(s => s.src);
    const idx = playable.findIndex(s => s.id === currentIndex);
    if (idx < playable.length - 1) playNext();
    else { isPlaying = false; updatePlayBtn(); renderGrid(songs); }
  }
});

// ─── Seek ─────────────────────────────────────────────────────────────────────
let seekDragging = false;
progressBar.addEventListener('mousedown', e => { seekDragging = true; seek(e); });
document.addEventListener('mousemove',    e => { if (seekDragging) seek(e); });
document.addEventListener('mouseup',      () => { seekDragging = false; });
progressBar.addEventListener('touchstart', e => { seekDragging = true; seek(e.touches[0]); }, { passive: true });
document.addEventListener('touchmove',    e => { if (seekDragging) seek(e.touches[0]); }, { passive: true });
document.addEventListener('touchend',     () => { seekDragging = false; });

function seek(e) {
  const rect = progressBar.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (audio.duration) audio.currentTime = pct * audio.duration;
}

// ─── Volume ───────────────────────────────────────────────────────────────────
let volDragging = false;
volumeBar.addEventListener('mousedown', e => { volDragging = true; applyVolume(e); });
document.addEventListener('mousemove',  e => { if (volDragging) applyVolume(e); });
document.addEventListener('mouseup',    () => { volDragging = false; });

function applyVolume(e) {
  const rect = volumeBar.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.volume = pct;
  setVolumeUI(pct);
  isMuted = pct === 0;
  muteBtn.innerHTML = isMuted
    ? '<i class="fa-solid fa-volume-xmark"></i>'
    : '<i class="fa-solid fa-volume-high"></i>';
}

function setVolumeUI(pct) {
  volumeFill.style.width  = (pct * 100) + '%';
  volumeThumb.style.left  = (pct * 100) + '%';
}

muteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  audio.muted = isMuted;
  muteBtn.innerHTML = isMuted
    ? '<i class="fa-solid fa-volume-xmark"></i>'
    : '<i class="fa-solid fa-volume-high"></i>';
});

// ─── Shuffle / Repeat ─────────────────────────────────────────────────────────
shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);
  if (isShuffle) buildShuffleOrder();
});

repeatBtn.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  repeatBtn.classList.toggle('active', repeatMode > 0);
  repeatBtn.innerHTML = repeatMode === 2
    ? '<i class="fa-solid fa-rotate-right"></i>'
    : '<i class="fa-solid fa-repeat"></i>';
  repeatBtn.title = ['Repeat Off', 'Repeat All', 'Repeat One'][repeatMode];
  if (repeatMode === 2) repeatBtn.style.color = 'var(--accent)';
});

// ─── Like ─────────────────────────────────────────────────────────────────────
likeBtn.addEventListener('click', () => {
  if (currentIndex === -1) return;
  likedSongs.has(currentIndex) ? likedSongs.delete(currentIndex) : likedSongs.add(currentIndex);
  updateLikeBtn();
});

function updateLikeBtn() {
  likeBtn.innerHTML = likedSongs.has(currentIndex)
    ? '<i class="fa-solid fa-heart" style="color:#1db954"></i>'
    : '<i class="fa-regular fa-heart"></i>';
}

// ─── Queue ────────────────────────────────────────────────────────────────────
queueBtn.addEventListener('click',   () => queuePanel.classList.toggle('open'));
closeQueue.addEventListener('click', () => queuePanel.classList.remove('open'));

function renderQueue() {
  queueList.innerHTML = '';
  songs.forEach((song, i) => {
    const li = document.createElement('li');
    li.className = song.id === currentIndex ? 'active' : '';
    const isActive = song.id === currentIndex;
    li.innerHTML = `
      <span class="q-num">${isActive
        ? '<i class="fa-solid fa-volume-high" style="color:#1db954;font-size:0.7rem"></i>'
        : i + 1}</span>
      <div class="q-info">
        <div class="q-title">${song.title}</div>
        <div class="q-artist">${song.artist}</div>
      </div>
      <span class="q-emoji">${song.emoji}</span>
      ${!song.src && !song.isLocal ? '<span class="q-lock"><i class="fa-solid fa-lock"></i></span>' : ''}
    `;
    li.addEventListener('click', () => {
      if (song.src) playSong(song.id);
      else showToast(`📁 Upload "${song.title}" to play it`, 2500);
    });
    queueList.appendChild(li);
  });
}

// ─── Sidebar Playlists ────────────────────────────────────────────────────────
function renderSidebarPlaylists() {
  const playlists = [
    { name: 'Liked Songs', icon: '💚' },
    { name: 'Chill Mix',   icon: '🌙' },
    { name: 'Synthwave',   icon: '⚡' },
    { name: 'Focus',       icon: '🎯' },
  ];
  playlistSidebar.innerHTML = '';
  playlists.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${p.icon}</span> ${p.name}`;
    playlistSidebar.appendChild(li);
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  renderGrid(q
    ? songs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
    : songs
  );
});

// ─── Local Upload ─────────────────────────────────────────────────────────────
localUpload.addEventListener('change', e => {
  const files = Array.from(e.target.files);
  const colors = ['#2a1a3a','#1a3a2a','#3a1a1a','#1a1a3a','#3a2a1a','#0a2a2a'];
  const emojis = ['🎵','🎶','🎸','🎹','🎺','🎻','🥁','🎤'];
  files.forEach(file => {
    const url  = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^/.]+$/, '');
    const parts = name.split(' - ');
    songs.push({
      id: songs.length,
      title:   parts.length > 1 ? parts.slice(1).join(' - ') : name,
      artist:  parts.length > 1 ? parts[0] : 'Unknown Artist',
      genre:   'Local', duration: '—',
      src:     url, isLocal: true, generated: false,
      color:   colors[Math.floor(Math.random() * colors.length)],
      emoji:   emojis[Math.floor(Math.random() * emojis.length)],
    });
  });
  renderGrid(songs);
  renderQueue();
  showToast(`✅ Added ${files.length} song${files.length > 1 ? 's' : ''}`, 2500);
  e.target.value = '';
});

// ─── Controls ─────────────────────────────────────────────────────────────────
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  switch (e.code) {
    case 'Space':      e.preventDefault(); togglePlay(); break;
    case 'ArrowRight': audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); break;
    case 'ArrowLeft':  audio.currentTime = Math.max(0, audio.currentTime - 10); break;
    case 'ArrowUp':    audio.volume = Math.min(1, audio.volume + 0.1); setVolumeUI(audio.volume); break;
    case 'ArrowDown':  audio.volume = Math.max(0, audio.volume - 0.1); setVolumeUI(audio.volume); break;
    case 'KeyN':       playNext(); break;
    case 'KeyP':       playPrev(); break;
    case 'KeyM':       muteBtn.click(); break;
    case 'KeyL':       likeBtn.click(); break;
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}
