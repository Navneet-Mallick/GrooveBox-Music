/** app.js - GrooveBox MVP | 3 synth tracks + local upload | No ES modules */

// ── Catalogue (synth only - no external URLs that can fail) ───────────────────
const CATALOGUE = [
  { id:'s1', title:'Midnight Drift', artist:'GrooveBox', genre:'Lo-Fi',     synthStyle:'lofi',      color:'#ff6b9d', emoji:'\uD83C\uDF19' },
  { id:'s2', title:'Neon Pulse',     artist:'GrooveBox', genre:'Synthwave', synthStyle:'synthwave', color:'#c471ed', emoji:'\uD83C\uDF06' },
  { id:'s3', title:'Deep Space',     artist:'GrooveBox', genre:'Ambient',   synthStyle:'ambient',   color:'#12c2e9', emoji:'\uD83C\uDF0C' },
];

// ── State ──────────────────────────────────────────────────────────────────────
let allSongs = [...CATALOGUE];
let currentId = null;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 'off';
let volume = 0.7;
let isMuted = false;
let likedIds = new Set();

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

// ── Core playback ──────────────────────────────────────────────────────────────
function getSong(id) { return allSongs.find(s => s.id === id) || null; }

function playSong(id) {
  const song = getSong(id);
  if (!song) return;
  // stop current
  audioEl.pause(); audioEl.src = '';
  stopSynth();
  currentId = id;
  isPlaying = true;
  if (song.synthStyle) {
    startSynth(song.synthStyle);
  } else {
    audioEl.src = song.src;
    audioEl.volume = isMuted ? 0 : volume;
    audioEl.play().catch(err => {
      console.error(err);
      showToast('Cannot play this file');
      isPlaying = false;
    });
  }
  refreshUI();
}

function togglePlay() {
  if (!currentId) {
    if (allSongs.length) playSong(allSongs[0].id);
    return;
  }
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
  if (!allSongs.length) return;
  const idx = allSongs.findIndex(s => s.id === currentId);
  const next = isShuffle
    ? Math.floor(Math.random() * allSongs.length)
    : (idx + 1) % allSongs.length;
  playSong(allSongs[next].id);
}

function playPrev() {
  if (!allSongs.length) return;
  const idx = allSongs.findIndex(s => s.id === currentId);
  const prev = isShuffle
    ? Math.floor(Math.random() * allSongs.length)
    : (idx - 1 + allSongs.length) % allSongs.length;
  playSong(allSongs[prev].id);
}

// ── UI ─────────────────────────────────────────────────────────────────────────
function refreshUI() {
  // play button
  document.getElementById('play-btn').querySelector('i').className =
    isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';

  // now playing bar
  const song = getSong(currentId);
  if (song) {
    document.getElementById('np-title').textContent = song.title;
    document.getElementById('np-artist').textContent = song.artist;
    const cover = document.getElementById('np-cover');
    cover.style.background = song.color;
    cover.innerHTML = '<span style="font-size:1.4rem">' + song.emoji + '</span>';
    document.querySelector('.main').style.background =
      'linear-gradient(180deg,' + song.color + '22 0%,var(--bg) 340px)';
    // like btn
    const liked = likedIds.has(song.id);
    document.getElementById('like-btn').querySelector('i').className =
      liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
  }

  // song cards
  document.querySelectorAll('.song-card').forEach(card => {
    const active = card.dataset.songId === currentId && isPlaying;
    card.classList.toggle('active', active);
    card.querySelector('.card-play-overlay i').className =
      'fa-solid ' + (active ? 'fa-pause' : 'fa-play');
    // like btn on card
    const lb = card.querySelector('.card-like-btn');
    if (lb) {
      const liked = likedIds.has(card.dataset.songId);
      lb.classList.toggle('liked', liked);
      lb.querySelector('i').className = 'fa-' + (liked ? 'solid' : 'regular') + ' fa-heart';
    }
  });

  // queue
  document.querySelectorAll('#queue-list li').forEach(li => {
    li.classList.toggle('active', li.dataset.songId === currentId);
  });
}

function setProgress(cur, tot) {
  const pct = Math.min((cur / tot) * 100, 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-thumb').style.left = pct + '%';
  document.getElementById('current-time').textContent = fmt(cur);
  document.getElementById('total-time').textContent = fmt(tot);
}

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

function setVolume(val) {
  volume = val;
  document.getElementById('volume-fill').style.width = (val * 100) + '%';
  document.getElementById('volume-thumb').style.left = (val * 100) + '%';
  audioEl.volume = isMuted ? 0 : val;
  if (masterGain && actx) masterGain.gain.setValueAtTime(isMuted ? 0 : val, actx.currentTime);
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

// ── Render song list ───────────────────────────────────────────────────────────
function renderAll() {
  const grid = document.getElementById('song-grid');
  if (!allSongs.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-music"></i><p>No songs yet. Add some!</p></div>';
    return;
  }
  const synth = allSongs.filter(s => s.synthStyle);
  const local = allSongs.filter(s => s.isLocal);
  let html = '';
  if (synth.length) {
    html += '<div class="grid-section"><div class="grid-section-title">Synth Tracks</div>'
      + '<div class="song-grid-inner">' + synth.map(cardHTML).join('') + '</div></div>';
  }
  if (local.length) {
    html += '<div class="grid-section"><div class="grid-section-title">My Uploads</div>'
      + '<div class="song-grid-inner">' + local.map(cardHTML).join('') + '</div></div>';
  }
  grid.innerHTML = html;
  renderQueue();
}

function cardHTML(song) {
  const active = song.id === currentId && isPlaying;
  const liked = likedIds.has(song.id);
  return '<div class="song-card' + (active ? ' active' : '') + '" data-song-id="' + song.id + '">'
    + '<div class="card-cover" style="background:' + song.color + '">'
    + '<span class="cover-icon">' + song.emoji + '</span>'
    + '<div class="card-play-overlay"><i class="fa-solid ' + (active ? 'fa-pause' : 'fa-play') + '"></i></div>'
    + '</div>'
    + '<div class="card-title">' + song.title + '</div>'
    + '<div class="card-artist">' + song.artist + '</div>'
    + '<div class="card-meta">' + song.genre + '</div>'
    + '<div class="card-actions">'
    + '<button class="card-like-btn' + (liked ? ' liked' : '') + '" data-id="' + song.id + '">'
    + '<i class="fa-' + (liked ? 'solid' : 'regular') + ' fa-heart"></i></button>'
    + (song.isLocal ? '<button class="delete-btn" data-id="' + song.id + '"><i class="fa-solid fa-trash"></i></button>' : '')
    + '</div></div>';
}

function renderQueue() {
  document.getElementById('queue-list').innerHTML = allSongs.map((s, i) =>
    '<li data-song-id="' + s.id + '" class="' + (s.id === currentId ? 'active' : '') + '">'
    + '<span class="q-num">' + (i + 1) + '</span>'
    + '<div class="q-info"><div class="q-title">' + s.title + '</div>'
    + '<div class="q-artist">' + s.artist + '</div></div>'
    + '<span class="q-emoji">' + s.emoji + '</span></li>'
  ).join('');
}

// ── Upload ─────────────────────────────────────────────────────────────────────
const COLORS = ['#ff6b9d','#c471ed','#12c2e9','#f093fb','#4facfe','#43e97b','#fa709a','#fee140'];
const EMOJIS = ['\uD83C\uDFB5','\uD83C\uDFB6','\uD83C\uDFB8','\uD83C\uDFB9','\uD83C\uDFBA','\uD83C\uDFBB','\uD83E\uDD41','\uD83C\uDFA4'];

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
    } catch(e) {
      showToast('Upload failed: ' + e.message);
    }
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
    renderAll(); refreshUI(); showToast('Deleted');
  } catch(e) { showToast('Delete failed'); }
}

// ── Init ───────────────────────────────────────────────────────────────────────
async function init() {
  // restore liked
  try { likedIds = new Set(JSON.parse(localStorage.getItem('liked') || '[]')); } catch(e) {}
  // load local songs from IndexedDB
  try {
    const local = await loadSongs();
    local.forEach(s => { if (!s.isLocal) s.isLocal = true; allSongs.push(s); });
  } catch(e) { console.warn('IndexedDB load failed', e); }

  renderAll();
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
    + '<p class="welcome-sub">3 synth tracks ready \u2022 add your own songs</p>'
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
    const m = ['off','all','one'];
    repeatMode = m[(m.indexOf(repeatMode) + 1) % 3];
    const btn = document.getElementById('repeat-btn');
    btn.classList.toggle('active', repeatMode !== 'off');
    btn.querySelector('i').className = repeatMode === 'one' ? 'fa-solid fa-repeat-1' : 'fa-solid fa-repeat';
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

  // progress seek
  document.getElementById('progress-bar').addEventListener('click', e => {
    const song = getSong(currentId);
    if (!song || song.synthStyle) return;
    const r = document.getElementById('progress-bar').getBoundingClientRect();
    audioEl.currentTime = ((e.clientX - r.left) / r.width) * audioEl.duration;
  });

  // volume
  document.getElementById('volume-bar').addEventListener('click', e => {
    const r = document.getElementById('volume-bar').getBoundingClientRect();
    setVolume(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  });

  // song grid clicks
  document.getElementById('song-grid').addEventListener('click', e => {
    if (e.target.closest('.card-like-btn')) {
      const id = e.target.closest('.card-like-btn').dataset.id;
      likedIds.has(id) ? likedIds.delete(id) : likedIds.add(id);
      localStorage.setItem('liked', JSON.stringify([...likedIds]));
      refreshUI(); return;
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
    if (li) playSong(li.dataset.songId);
  });

  // file upload
  document.getElementById('local-upload').addEventListener('change', e => {
    if (e.target.files.length) { handleUpload(Array.from(e.target.files)); e.target.value = ''; }
  });

  // audio events
  audioEl.addEventListener('timeupdate', () => {
    if (audioEl.duration) setProgress(audioEl.currentTime, audioEl.duration);
  });
  audioEl.addEventListener('ended', () => {
    if (repeatMode === 'one') playSong(currentId);
    else if (repeatMode === 'all' || isShuffle) playNext();
    else {
      const idx = allSongs.findIndex(s => s.id === currentId);
      if (idx < allSongs.length - 1) playNext();
      else { isPlaying = false; refreshUI(); }
    }
  });
  audioEl.addEventListener('play',  () => { isPlaying = true;  refreshUI(); });
  audioEl.addEventListener('pause', () => { isPlaying = false; refreshUI(); });

  // keyboard
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowRight') playNext();
    else if (e.key === 'ArrowLeft')  playPrev();
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setVolume(Math.min(1, volume + 0.1)); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setVolume(Math.max(0, volume - 0.1)); }
    else if (e.key === 'm' || e.key === 'M') toggleMute();
  });
}

document.addEventListener('DOMContentLoaded', init);