/** app.js - GrooveBox | synth tracks + local upload + playlists + search */

// ── Catalogue ─────────────────────────────────────────────────────────────────
const CATALOGUE = [
  { id:'s1', title:'Midnight Drift', artist:'GrooveBox', genre:'Lo-Fi',     synthStyle:'lofi',      color:'#ff6b9d', emoji:'🌙' },
  { id:'s2', title:'Neon Pulse',     artist:'GrooveBox', genre:'Synthwave', synthStyle:'synthwave', color:'#c471ed', emoji:'🌆' },
  { id:'s3', title:'Deep Space',     artist:'GrooveBox', genre:'Ambient',   synthStyle:'ambient',   color:'#12c2e9', emoji:'🌌' },
];

// ── State ──────────────────────────────────────────────────────────────────────
let allSongs   = [...CATALOGUE];
let playlists  = [];   // [{ id, name, songIds[] }]
let activePl   = null; // playlist id currently viewed, null = all songs
let currentId  = null;
let isPlaying  = false;
let isShuffle  = false;
let repeatMode = 'off'; // 'off' | 'all' | 'one'
let volume     = 0.7;
let isMuted    = false;
let likedIds   = new Set();
let searchQuery = '';

const audioEl = document.getElementById('audio-player');

// ── Synth Engine ───────────────────────────────────────────────────────────────
let actx = null, masterGain = null;
let synthNodes = [], synthTimer = null, synthTick = null;
const SYNTH_DUR = 120;
const CHORDS = {
  lofi:      [[220,261.63,329.63,392],[196,246.94,293.66,369.99],[174.61,220,261.63,329.63]],
  synthwave: [[164.81,207.65,246.94,329.63],[146.83,185,220,293.66],[130.81,164.81,196,261.63]],
  ambient:   [[130.81,164.81,196,261.63],[146.83,174.61,220,293.66],[116.54,155.56,185,233.08]],
};
let chordIdx = 0;

function getActx() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = actx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(actx.destination);
  }
  return actx;
}

function createPad(freq, style) {
  const ac = getActx();
  const o1 = ac.createOscillator(), o2 = ac.createOscillator();
  const g = ac.createGain(), f = ac.createBiquadFilter();
  o1.type = style === 'synthwave' ? 'sawtooth' : style === 'lofi' ? 'triangle' : 'sine';
  o2.type = 'triangle';
  o1.frequency.value = freq;
  o2.frequency.value = freq * 1.008;
  f.type = 'lowpass';
  f.frequency.value = style === 'lofi' ? 600 : style === 'synthwave' ? 1200 : 900;
  g.gain.setValueAtTime(0, ac.currentTime);
  g.gain.linearRampToValueAtTime(0.05, ac.currentTime + 1.5);
  o1.connect(f); o2.connect(f); f.connect(g); g.connect(masterGain);
  o1.start(); o2.start();
  return { o1, o2, g };
}

function playChord(style) {
  const ac = getActx();
  const chords = CHORDS[style] || CHORDS.ambient;
  const freqs = chords[chordIdx % chords.length];
  chordIdx++;
  synthNodes.forEach(n => {
    n.g.gain.linearRampToValueAtTime(0, ac.currentTime + 2);
    setTimeout(() => { try { n.o1.stop(); n.o2.stop(); } catch(e) {} }, 2500);
  });
  synthNodes = freqs.map(f => createPad(f, style));
  synthTimer = setTimeout(() => playChord(style), 5000);
}

function startSynth(style) {
  const ac = getActx();
  if (ac.state === 'suspended') ac.resume();
  masterGain.gain.cancelScheduledValues(ac.currentTime);
  masterGain.gain.linearRampToValueAtTime(isMuted ? 0 : volume, ac.currentTime + 1);
  chordIdx = 0;
  playChord(style);
  const t0 = Date.now();
  synthTick = setInterval(() => {
    const elapsed = (Date.now() - t0) / 1000;
    setProgress(elapsed, SYNTH_DUR);
    if (elapsed >= SYNTH_DUR) {
      clearInterval(synthTick);
      repeatMode === 'one' ? playSong(currentId) : playNext();
    }
  }, 250);
}

function stopSynth() {
  clearTimeout(synthTimer);
  clearInterval(synthTick);
  if (!actx) return;
  masterGain.gain.cancelScheduledValues(actx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.8);
  setTimeout(() => {
    synthNodes.forEach(n => { try { n.o1.stop(); n.o2.stop(); } catch(e) {} });
    synthNodes = [];
  }, 900);
}


// ── Playback ───────────────────────────────────────────────────────────────────
function getSong(id) { return allSongs.find(s => s.id === id) || null; }

function getQueue() {
  if (activePl) {
    const pl = playlists.find(p => p.id === activePl);
    if (pl) return allSongs.filter(s => pl.songIds.includes(s.id));
  }
  return allSongs;
}

function playSong(id) {
  const song = getSong(id);
  if (!song) return;
  audioEl.pause(); audioEl.src = '';
  stopSynth();
  currentId = id;
  isPlaying = true;
  if (song.synthStyle) {
    startSynth(song.synthStyle);
  } else {
    audioEl.src = song.src;
    audioEl.volume = isMuted ? 0 : volume;
    audioEl.play().catch(err => { console.error(err); showToast('Cannot play this file'); isPlaying = false; });
  }
  refreshUI();
}

function togglePlay() {
  if (!currentId) { const q = getQueue(); if (q.length) playSong(q[0].id); return; }
  const song = getSong(currentId);
  if (isPlaying) {
    if (song.synthStyle) stopSynth(); else audioEl.pause();
    isPlaying = false;
  } else {
    if (song.synthStyle) startSynth(song.synthStyle); else audioEl.play();
    isPlaying = true;
  }
  refreshUI();
}

function playNext() {
  const q = getQueue();
  if (!q.length) return;
  const idx = q.findIndex(s => s.id === currentId);
  const next = isShuffle ? Math.floor(Math.random() * q.length) : (idx + 1) % q.length;
  playSong(q[next].id);
}

function playPrev() {
  const q = getQueue();
  if (!q.length) return;
  const idx = q.findIndex(s => s.id === currentId);
  const prev = isShuffle ? Math.floor(Math.random() * q.length) : (idx - 1 + q.length) % q.length;
  playSong(q[prev].id);
}

// ── UI helpers ─────────────────────────────────────────────────────────────────
function fmt(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function setProgress(cur, tot) {
  const pct = Math.min((cur / tot) * 100, 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-thumb').style.left = pct + '%';
  document.getElementById('current-time').textContent  = fmt(cur);
  document.getElementById('total-time').textContent    = fmt(tot);
}

function setVolume(val) {
  volume = Math.max(0, Math.min(1, val));
  document.getElementById('volume-fill').style.width  = (volume * 100) + '%';
  document.getElementById('volume-thumb').style.left  = (volume * 100) + '%';
  audioEl.volume = isMuted ? 0 : volume;
  if (masterGain && actx) masterGain.gain.setValueAtTime(isMuted ? 0 : volume, actx.currentTime);
  updateVolIcon();
}

function toggleMute() {
  isMuted = !isMuted;
  audioEl.volume = isMuted ? 0 : volume;
  if (masterGain && actx) masterGain.gain.setValueAtTime(isMuted ? 0 : volume, actx.currentTime);
  updateVolIcon();
}

function updateVolIcon() {
  const i = document.getElementById('mute-btn').querySelector('i');
  i.className = (isMuted || volume === 0) ? 'fa-solid fa-volume-xmark'
    : volume < 0.5 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high';
}

function refreshUI() {
  document.getElementById('play-btn').querySelector('i').className =
    isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';

  const song = getSong(currentId);
  if (song) {
    document.getElementById('np-title').textContent  = song.title;
    document.getElementById('np-artist').textContent = song.artist;
    const cover = document.getElementById('np-cover');
    cover.style.background = song.color;
    cover.innerHTML = '<span style="font-size:1.4rem">' + song.emoji + '</span>';
    document.querySelector('.main').style.background =
      'linear-gradient(180deg,' + song.color + '22 0%,var(--bg) 340px)';
    document.getElementById('like-btn').querySelector('i').className =
      likedIds.has(song.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
  }

  document.querySelectorAll('.song-card').forEach(card => {
    const active = card.dataset.songId === currentId && isPlaying;
    card.classList.toggle('active', active);
    card.querySelector('.card-play-overlay i').className = 'fa-solid ' + (active ? 'fa-pause' : 'fa-play');
    const lb = card.querySelector('.card-like-btn');
    if (lb) {
      const liked = likedIds.has(card.dataset.songId);
      lb.classList.toggle('liked', liked);
      lb.querySelector('i').className = 'fa-' + (liked ? 'solid' : 'regular') + ' fa-heart';
    }
  });

  document.querySelectorAll('#queue-list li').forEach(li => {
    li.classList.toggle('active', li.dataset.songId === currentId);
  });

  // repeat btn visual
  const rb = document.getElementById('repeat-btn');
  rb.classList.toggle('active', repeatMode !== 'off');
  rb.dataset.mode = repeatMode;
}


// ── Render ─────────────────────────────────────────────────────────────────────
function getFilteredSongs(pool) {
  if (!searchQuery) return pool;
  const q = searchQuery.toLowerCase();
  return pool.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.artist.toLowerCase().includes(q) ||
    s.genre.toLowerCase().includes(q)
  );
}

function renderAll() {
  const grid = document.getElementById('song-grid');
  let pool = activePl
    ? (() => { const pl = playlists.find(p => p.id === activePl); return pl ? allSongs.filter(s => pl.songIds.includes(s.id)) : []; })()
    : allSongs;
  pool = getFilteredSongs(pool);

  if (!pool.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-music"></i>'
      + '<p>' + (searchQuery ? 'No results for "' + searchQuery + '"' : activePl ? 'Playlist is empty. Add songs with the + button.' : 'No songs yet.') + '</p></div>';
    renderQueue(); return;
  }

  const synth = pool.filter(s => s.synthStyle);
  const local = pool.filter(s => s.isLocal);
  let html = '';
  if (synth.length) html += section('Synth Tracks', synth);
  if (local.length) html += section('My Uploads', local);
  grid.innerHTML = html;
  renderQueue();
}

function section(title, songs) {
  return '<div class="grid-section"><div class="grid-section-title">' + title + '</div>'
    + '<div class="song-grid-inner">' + songs.map(cardHTML).join('') + '</div></div>';
}

function cardHTML(song) {
  const active = song.id === currentId && isPlaying;
  const liked  = likedIds.has(song.id);
  const inPl   = playlists.some(p => p.songIds.includes(song.id));
  return '<div class="song-card' + (active ? ' active' : '') + '" data-song-id="' + song.id + '">'
    + '<div class="card-cover" style="background:' + song.color + '">'
    + '<span class="cover-icon">' + song.emoji + '</span>'
    + '<div class="card-play-overlay"><i class="fa-solid ' + (active ? 'fa-pause' : 'fa-play') + '"></i></div>'
    + '</div>'
    + '<div class="card-title">' + song.title + '</div>'
    + '<div class="card-artist">' + song.artist + '</div>'
    + '<div class="card-meta">' + song.genre + '</div>'
    + '<div class="card-actions">'
    + '<button class="card-like-btn' + (liked ? ' liked' : '') + '" data-id="' + song.id + '" title="Like">'
    + '<i class="fa-' + (liked ? 'solid' : 'regular') + ' fa-heart"></i></button>'
    + '<button class="card-pl-btn" data-id="' + song.id + '" title="Add to playlist">'
    + '<i class="fa-solid fa-' + (inPl ? 'circle-check' : 'circle-plus') + '"></i></button>'
    + (song.isLocal ? '<button class="delete-btn" data-id="' + song.id + '" title="Delete"><i class="fa-solid fa-trash"></i></button>' : '')
    + '</div></div>';
}

function renderQueue() {
  const q = getQueue();
  document.getElementById('queue-list').innerHTML = q.map((s, i) =>
    '<li data-song-id="' + s.id + '" class="' + (s.id === currentId ? 'active' : '') + '">'
    + '<span class="q-num">' + (i + 1) + '</span>'
    + '<div class="q-info"><div class="q-title">' + s.title + '</div>'
    + '<div class="q-artist">' + s.artist + '</div></div>'
    + '<span class="q-emoji">' + s.emoji + '</span></li>'
  ).join('');
}

function renderPlaylists() {
  const ul = document.getElementById('playlist-sidebar');
  if (!playlists.length) { ul.innerHTML = '<li class="pl-empty-hint">No playlists yet</li>'; return; }
  ul.innerHTML = playlists.map(pl =>
    '<li data-pl-id="' + pl.id + '" class="' + (pl.id === activePl ? 'active' : '') + '">'
    + '<span class="pl-icon"><i class="fa-solid fa-music"></i></span>'
    + '<span class="pl-name">' + pl.name + '</span>'
    + '<button class="pl-del-btn" data-pl-id="' + pl.id + '" title="Delete playlist">'
    + '<i class="fa-solid fa-xmark"></i></button></li>'
  ).join('');
}


// ── Playlist modal ─────────────────────────────────────────────────────────────
function openPlaylistModal(songId) {
  let modal = document.getElementById('pl-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'pl-modal';
    modal.innerHTML =
      '<div class="pl-modal-inner">'
      + '<div class="pl-modal-header"><h3>Add to Playlist</h3>'
      + '<button class="icon-btn" id="pl-modal-close"><i class="fa-solid fa-xmark"></i></button></div>'
      + '<ul id="pl-modal-list"></ul>'
      + '<div class="pl-modal-new">'
      + '<input id="pl-modal-input" type="text" placeholder="New playlist name…" maxlength="40"/>'
      + '<button class="upload-btn" id="pl-modal-create"><i class="fa-solid fa-plus"></i> Create</button>'
      + '</div></div>';
    document.body.appendChild(modal);

    document.getElementById('pl-modal-close').addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

    document.getElementById('pl-modal-create').addEventListener('click', () => {
      const name = document.getElementById('pl-modal-input').value.trim();
      if (!name) return;
      const pl = { id: 'pl' + Date.now(), name, songIds: [] };
      playlists.push(pl);
      savePlaylists();
      document.getElementById('pl-modal-input').value = '';
      renderPlModalList(modal.dataset.songId);
      renderPlaylists();
      showToast('Playlist created: ' + pl.name);
    });
  }
  modal.dataset.songId = songId;
  renderPlModalList(songId);
  modal.classList.add('open');
}

function renderPlModalList(songId) {
  const list = document.getElementById('pl-modal-list');
  if (!playlists.length) {
    list.innerHTML = '<li class="pl-modal-empty">No playlists yet — create one below</li>';
    return;
  }
  list.innerHTML = playlists.map(pl => {
    const has = pl.songIds.includes(songId);
    return '<li class="pl-modal-item' + (has ? ' in-pl' : '') + '" data-pl-id="' + pl.id + '">'
      + '<i class="fa-solid fa-' + (has ? 'circle-check' : 'circle-plus') + '"></i> ' + pl.name + '</li>';
  }).join('');

  list.querySelectorAll('.pl-modal-item').forEach(li => {
    li.addEventListener('click', () => {
      const pl = playlists.find(p => p.id === li.dataset.plId);
      if (!pl) return;
      const idx = pl.songIds.indexOf(songId);
      if (idx === -1) pl.songIds.push(songId); else pl.songIds.splice(idx, 1);
      savePlaylists();
      renderPlModalList(songId);
      renderPlaylists();
      renderAll();
      showToast(idx === -1 ? 'Added to ' + pl.name : 'Removed from ' + pl.name);
    });
  });
}

function savePlaylists() {
  localStorage.setItem('playlists', JSON.stringify(playlists));
}

function loadPlaylists() {
  try { playlists = JSON.parse(localStorage.getItem('playlists') || '[]'); } catch(e) { playlists = []; }
}


// ── Upload / Delete ────────────────────────────────────────────────────────────
const COLORS = ['#ff6b9d','#c471ed','#12c2e9','#f093fb','#4facfe','#43e97b','#fa709a','#fee140'];
const EMOJIS = ['🎵','🎶','🎸','🎹','🎺','🎻','🥁','🎤'];

async function handleUpload(files) {
  for (const file of files) {
    if (!file.type.startsWith('audio/')) continue;
    const title = file.name.replace(/\.[^/.]+$/, '');
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    try {
      const id = await saveSong({ title, artist: 'Local', genre: 'Uploaded', blob: file, color, emoji });
      allSongs.push({ id, title, artist: 'Local', genre: 'Uploaded',
        src: URL.createObjectURL(file), color, emoji, isLocal: true });
      showToast('Added: ' + title);
    } catch(e) { showToast('Upload failed: ' + e.message); }
  }
  renderAll();
}

async function handleDelete(id) {
  const song = getSong(id);
  if (!song || !confirm('Delete "' + song.title + '"?')) return;
  try {
    await deleteSong(id);
    if (currentId === id) { stopSynth(); audioEl.pause(); isPlaying = false; currentId = null; }
    allSongs = allSongs.filter(s => s.id !== id);
    playlists.forEach(pl => { pl.songIds = pl.songIds.filter(sid => sid !== id); });
    savePlaylists();
    renderAll(); renderPlaylists(); refreshUI(); showToast('Deleted');
  } catch(e) { showToast('Delete failed'); }
}

// ── Init ───────────────────────────────────────────────────────────────────────
async function init() {
  try { likedIds = new Set(JSON.parse(localStorage.getItem('liked') || '[]')); } catch(e) {}
  loadPlaylists();
  try {
    const local = await loadSongs();
    local.forEach(s => { s.isLocal = true; allSongs.push(s); });
  } catch(e) { console.warn('IndexedDB load failed', e); }

  setVolume(volume);
  renderAll();
  renderPlaylists();
  setupEvents();
  showWelcome();
}

function showWelcome() {
  const ov = document.createElement('div');
  ov.id = 'welcome-overlay';
  ov.innerHTML = '<div class="welcome-card">'
    + '<div class="welcome-logo"><i class="fa-solid fa-music"></i></div>'
    + '<h1>GrooveBox</h1><p>Your personal music player</p>'
    + '<button class="welcome-btn" id="start-btn"><i class="fa-solid fa-play"></i> Start Listening</button>'
    + '<p class="welcome-sub">3 synth tracks ready • add your own songs</p>'
    + '</div>';
  document.body.appendChild(ov);
  document.getElementById('start-btn').addEventListener('click', () => {
    ov.classList.add('fade-out');
    setTimeout(() => ov.remove(), 500);
    playSong(allSongs[0].id);
  });
}


// ── Events ─────────────────────────────────────────────────────────────────────
function setupEvents() {
  document.getElementById('play-btn').addEventListener('click', togglePlay);
  document.getElementById('prev-btn').addEventListener('click', playPrev);
  document.getElementById('next-btn').addEventListener('click', playNext);

  document.getElementById('shuffle-btn').addEventListener('click', () => {
    isShuffle = !isShuffle;
    document.getElementById('shuffle-btn').classList.toggle('active', isShuffle);
    showToast(isShuffle ? 'Shuffle on' : 'Shuffle off');
  });

  document.getElementById('repeat-btn').addEventListener('click', () => {
    const modes = ['off','all','one'];
    repeatMode = modes[(modes.indexOf(repeatMode) + 1) % 3];
    refreshUI();
    showToast('Repeat: ' + repeatMode);
  });

  document.getElementById('like-btn').addEventListener('click', () => {
    if (!currentId) return;
    likedIds.has(currentId) ? likedIds.delete(currentId) : likedIds.add(currentId);
    localStorage.setItem('liked', JSON.stringify([...likedIds]));
    refreshUI();
    showToast(likedIds.has(currentId) ? 'Liked!' : 'Unliked');
  });

  document.getElementById('mute-btn').addEventListener('click', toggleMute);

  document.getElementById('queue-btn').addEventListener('click', () => {
    document.getElementById('queue-panel').classList.toggle('open');
  });
  document.getElementById('close-queue').addEventListener('click', () => {
    document.getElementById('queue-panel').classList.remove('open');
  });

  document.getElementById('progress-bar').addEventListener('click', e => {
    const song = getSong(currentId);
    if (!song || song.synthStyle || !audioEl.duration) return;
    const r = document.getElementById('progress-bar').getBoundingClientRect();
    audioEl.currentTime = ((e.clientX - r.left) / r.width) * audioEl.duration;
  });

  document.getElementById('volume-bar').addEventListener('click', e => {
    const r = document.getElementById('volume-bar').getBoundingClientRect();
    setVolume((e.clientX - r.left) / r.width);
  });

  // song grid — delegated clicks
  document.getElementById('song-grid').addEventListener('click', e => {
    if (e.target.closest('.card-like-btn')) {
      const id = e.target.closest('.card-like-btn').dataset.id;
      likedIds.has(id) ? likedIds.delete(id) : likedIds.add(id);
      localStorage.setItem('liked', JSON.stringify([...likedIds]));
      refreshUI(); return;
    }
    if (e.target.closest('.card-pl-btn')) {
      openPlaylistModal(e.target.closest('.card-pl-btn').dataset.id); return;
    }
    if (e.target.closest('.delete-btn')) {
      handleDelete(e.target.closest('.delete-btn').dataset.id); return;
    }
    const card = e.target.closest('.song-card');
    if (!card) return;
    const sid = card.dataset.songId;
    if (sid === currentId && isPlaying) togglePlay(); else playSong(sid);
  });

  // queue clicks
  document.getElementById('queue-list').addEventListener('click', e => {
    const li = e.target.closest('li');
    if (li && li.dataset.songId) playSong(li.dataset.songId);
  });

  // sidebar nav
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      const view = a.dataset.view;
      activePl = null;
      if (view === 'library') {
        document.getElementById('main-title').textContent = 'My Library';
        const grid = document.getElementById('song-grid');
        const local = getFilteredSongs(allSongs.filter(s => s.isLocal));
        grid.innerHTML = local.length
          ? section('My Uploads', local)
          : '<div class="empty-state"><i class="fa-solid fa-upload"></i><p>No uploads yet.</p></div>';
        renderQueue();
      } else if (view === 'search') {
        document.getElementById('main-title').textContent = 'Search';
        document.getElementById('search-input').focus();
        renderAll();
      } else {
        document.getElementById('main-title').textContent = 'All Songs';
        renderAll();
      }
      renderPlaylists();
    });
  });

  // playlist sidebar — click to view, x to delete
  document.getElementById('playlist-sidebar').addEventListener('click', e => {
    const delBtn = e.target.closest('.pl-del-btn');
    if (delBtn) {
      e.stopPropagation();
      const plId = delBtn.dataset.plId;
      const pl = playlists.find(p => p.id === plId);
      if (pl && confirm('Delete playlist "' + pl.name + '"?')) {
        playlists = playlists.filter(p => p.id !== plId);
        savePlaylists();
        if (activePl === plId) { activePl = null; document.getElementById('main-title').textContent = 'All Songs'; }
        renderPlaylists(); renderAll();
      }
      return;
    }
    const li = e.target.closest('li[data-pl-id]');
    if (li) {
      activePl = li.dataset.plId;
      const pl = playlists.find(p => p.id === activePl);
      document.getElementById('main-title').textContent = pl ? pl.name : 'Playlist';
      document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
      renderPlaylists(); renderAll();
    }
  });

  // new playlist button
  document.getElementById('new-playlist-btn').addEventListener('click', () => {
    const name = prompt('Playlist name:');
    if (!name || !name.trim()) return;
    const pl = { id: 'pl' + Date.now(), name: name.trim(), songIds: [] };
    playlists.push(pl);
    savePlaylists();
    renderPlaylists();
    showToast('Playlist created: ' + pl.name);
  });

  // search input
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderAll();
  });

  // file upload
  document.getElementById('local-upload').addEventListener('change', e => {
    if (e.target.files.length) { handleUpload(Array.from(e.target.files)); e.target.value = ''; }
  });

  // audio element events
  audioEl.addEventListener('timeupdate', () => {
    if (audioEl.duration) setProgress(audioEl.currentTime, audioEl.duration);
  });
  audioEl.addEventListener('ended', () => {
    if (repeatMode === 'one') { playSong(currentId); return; }
    const q = getQueue();
    const idx = q.findIndex(s => s.id === currentId);
    if (repeatMode === 'all' || isShuffle) { playNext(); return; }
    if (idx < q.length - 1) playNext(); else { isPlaying = false; refreshUI(); }
  });
  audioEl.addEventListener('play',  () => { isPlaying = true;  refreshUI(); });
  audioEl.addEventListener('pause', () => { isPlaying = false; refreshUI(); });

  // keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ')           { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowRight') playNext();
    else if (e.key === 'ArrowLeft')  playPrev();
    else if (e.key === 'ArrowUp')    { e.preventDefault(); setVolume(volume + 0.1); }
    else if (e.key === 'ArrowDown')  { e.preventDefault(); setVolume(volume - 0.1); }
    else if (e.key === 'm' || e.key === 'M') toggleMute();
  });
}

document.addEventListener('DOMContentLoaded', init);
