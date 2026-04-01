/** app.js — GrooveBox v2 */
'use strict';

// ─── Catalogue ────────────────────────────────────────────────────────────────
const CATALOGUE = [
  // ── Groovebox Classics ──
  { id:'s1',  title:'Aankhon Mein Tu',       artist:'Unknown',  genre:'Pop/Rock',         src:'./tracks/Aankhon Mein Tu.mp3',       color:'#ff6b9d', emoji:'🌟', categories:['classics'] },
  { id:'s2',  title:'Rise From The Ashes',   artist:'Groove',   genre:'Rock/Alternative', src:'./tracks/Rise From The Ashes.mp3',   color:'#c471ed', emoji:'💥', categories:['classics','rock'] },
  { id:'s12', title:'Keepers of the Flame',  artist:'Genius',   genre:'Epic/Rock',        src:'./tracks/Keepers_of_the_Flame.mp3',  color:'#ff6b9d', emoji:'🌹', categories:['classics','rock'] },

  // ── Rock ──
  { id:'s5',  title:'Ambarsariya',           artist:'Unknown',  genre:'Rock/Guitar',      src:'./tracks/ambarsariya.mp3',           color:'#fee140', emoji:'❤️', categories:['rock'] },
  { id:'s8',  title:'Hotel California Intro',artist:'Eagles',   genre:'Rock',             src:'./tracks/eagles.mp3',                color:'#fee140', emoji:'🦅', categories:['rock'] },

  // ── Bollywood / Desi ──
  { id:'s3',  title:'Sanam',                 artist:'SANAM',    genre:'Pop/Fusion',       src:'./tracks/sanam.mp3',                 color:'#12c2e9', emoji:'🎸', categories:['bollywood'] },
  { id:'s4',  title:'Jeewan Ko Bato',        artist:'Unknown',  genre:'Nepali',           src:'./tracks/Jeewan Ko Bato.mp3',        color:'#ff4444', emoji:'💫', categories:['bollywood'] },
  { id:'s11', title:'Bolly Music',           artist:'Unknown',  genre:'Bollywood',        src:'./tracks/Music.mp3',                 color:'#fa709a', emoji:'💝', categories:['bollywood'] },

  // ── Phonk / Dark ──
  { id:'s7',  title:'Demons Phonk',          artist:'Unknown',  genre:'Phonk',            src:'./tracks/demons_phonk.mp3',          color:'#ff4444', emoji:'😈', categories:['phonk'] },
  { id:'s10', title:'Scam',                  artist:'Unknown',  genre:'Funky/Dark',       src:'./tracks/scam.mp3',                  color:'#43e97b', emoji:'🚀', categories:['phonk'] },

  // ── Chill / Pop ──
  { id:'s6',  title:'Backbenchers',          artist:'Unknown',  genre:'Fun/Pop',          src:'./tracks/Backbenchers.mp3',          color:'#f093fb', emoji:'😎', categories:['chill'] },
  { id:'s9',  title:'Pehli Nazar Ka Ehsaas', artist:'Unknown',  genre:'Romantic',         src:'./tracks/vibe.mp3',                  color:'#4facfe', emoji:'🌷', categories:['chill'] },
  { id:'s13', title:'Karwaan',               artist:'Unknown',  genre:'Indie/Chill',      src:'./tracks/karwaan.mp3',               color:'#f6d365', emoji:'🚗', categories:['chill','bollywood'] },
  { id:'s14', title:'Manwa Laage',           artist:'Unknown',  genre:'Bollywood/Soft',   src:'./tracks/manwa laage.mp3',           color:'#fa709a', emoji:'🌸', categories:['bollywood','chill'] },
  { id:'s15', title:'Shining',               artist:'Unknown',  genre:'Pop/Upbeat',       src:'./tracks/shining.mp3',               color:'#ffecd2', emoji:'✨', categories:['chill'] },

  // ── Lo-Fi Ambient (Web Audio API generated) ──
  { id:'lofi1', title:'Rain & Piano',        artist:'GrooveBox', genre:'Lo-Fi Ambient',   src:null, color:'#4facfe', emoji:'🌧️', categories:['lofi'], isLofi:true, lofiPreset:'rain'   },
  { id:'lofi2', title:'Deep Space Drift',    artist:'GrooveBox', genre:'Lo-Fi Ambient',   src:null, color:'#7c3aed', emoji:'🌌', categories:['lofi'], isLofi:true, lofiPreset:'space'  },
  { id:'lofi3', title:'Forest Morning',      artist:'GrooveBox', genre:'Lo-Fi Ambient',   src:null, color:'#43e97b', emoji:'🌿', categories:['lofi'], isLofi:true, lofiPreset:'forest' },
];

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  { id:'classics',  label:'Groovebox Classics', emoji:'⭐', color:'#ff6b9d', desc:'The OG tracks that started it all' },
  { id:'rock',      label:'Rock',               emoji:'🎸', color:'#fee140', desc:'Guitar-driven bangers'              },
  { id:'bollywood', label:'Bollywood / Desi',   emoji:'🎬', color:'#fa709a', desc:'Desi vibes, Hindi & Nepali hits'    },
  { id:'phonk',     label:'Phonk',              emoji:'😈', color:'#ff4444', desc:'Dark, heavy, distorted phonk'       },
  { id:'chill',     label:'Chill / Pop',        emoji:'😌', color:'#4facfe', desc:'Easy listening & feel-good pop'     },
  { id:'lofi',      label:'Lo-Fi Ambient',      emoji:'🌧️', color:'#7c3aed', desc:'Synthesized ambient soundscapes'    },
];

// ─── State ────────────────────────────────────────────────────────────────────
let allSongs    = [...CATALOGUE];
let playlists   = [];
let activePl    = null;
let activeCategory = null;
let currentId   = null;
let isPlaying   = false;
let isShuffle   = false;
let repeatMode  = 'off';   // 'off' | 'all' | 'one'
let volume      = 0.7;
let isMuted     = false;
let likedIds    = new Set();
let searchQuery = '';

// ─── Audio element ────────────────────────────────────────────────────────────
const audioEl = document.getElementById('audio-player');

// ─── Web Audio API (visualizer) ───────────────────────────────────────────────
let actx = null, analyser = null, sourceNode = null, gainNode = null;
let vizRaf = null;
const canvas  = document.getElementById('visualizer-canvas');
const ctx2d   = canvas.getContext('2d');

function getActx() {
  if (actx) return actx;
  actx     = new (window.AudioContext || window.webkitAudioContext)();
  gainNode = actx.createGain();
  gainNode.gain.value = isMuted ? 0 : volume;
  analyser = actx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  gainNode.connect(analyser);
  analyser.connect(actx.destination);
  sourceNode = actx.createMediaElementSource(audioEl);
  sourceNode.connect(gainNode);
  return actx;
}

function startVisualizer() {
  if (!analyser) return;
  const bufLen = analyser.frequencyBinCount;
  const data   = new Uint8Array(bufLen);

  function draw() {
    vizRaf = requestAnimationFrame(draw);
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    analyser.getByteFrequencyData(data);

    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    const barW = (canvas.width / bufLen) * 2.2;
    let x = 0;
    for (let i = 0; i < bufLen; i++) {
      const barH = (data[i] / 255) * canvas.height;
      const t = i / bufLen;
      // Gradient from purple to pink across the bars
      const r = Math.round(124 + (236 - 124) * t);
      const g = Math.round(58  + (72  - 58)  * t);
      const b = Math.round(237 + (153 - 237) * t);
      const alpha = 0.4 + (data[i] / 255) * 0.6;
      ctx2d.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      // Rounded top
      const rx = 2;
      ctx2d.beginPath();
      ctx2d.roundRect
        ? ctx2d.roundRect(x, canvas.height - barH, Math.max(barW - 1, 1), barH, [rx, rx, 0, 0])
        : ctx2d.rect(x, canvas.height - barH, Math.max(barW - 1, 1), barH);
      ctx2d.fill();
      x += barW;
    }
  }
  draw();
}

function stopVisualizer() {
  if (vizRaf) { cancelAnimationFrame(vizRaf); vizRaf = null; }
  if (ctx2d)  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
}

// ─── Lo-Fi Ambient Synthesizer (Web Audio API) ───────────────────────────────
let lofiNodes = [];

function stopLofi() {
  lofiNodes.forEach(n => { try { n.stop(); } catch(e) {} });
  lofiNodes = [];
}

function startLofi(preset) {
  stopLofi();
  const ctx = getActx();
  if (ctx.state === 'suspended') ctx.resume();

  const masterGain = ctx.createGain();
  masterGain.gain.value = isMuted ? 0 : volume;
  masterGain.connect(gainNode);

  if (preset === 'rain') {
    // White noise rain
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.18;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.5;
    noise.connect(filter);
    filter.connect(masterGain);
    noise.start();
    lofiNodes.push(noise);

    // Soft piano-like tones
    [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.value = 0.04;
      // Slow tremolo
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.3 + i * 0.07;
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain);
      lfoGain.connect(env.gain);
      lfo.start();
      osc.connect(env);
      env.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.8);
      lofiNodes.push(osc, lfo);
    });

  } else if (preset === 'space') {
    // Deep space drones
    [55, 82.41, 110, 164.81].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.05 + i * 0.03;
      lfoG.gain.value = freq * 0.01;
      lfo.connect(lfoG);
      lfoG.connect(osc.frequency);
      env.gain.value = 0.06;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400 + i * 80;
      osc.connect(filter);
      filter.connect(env);
      env.connect(masterGain);
      osc.start(ctx.currentTime + i * 1.2);
      lfo.start();
      lofiNodes.push(osc, lfo);
    });
    // Subtle noise bed
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * 0.04;
    const noise = ctx.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 200;
    noise.connect(lp); lp.connect(masterGain);
    noise.start();
    lofiNodes.push(noise);

  } else if (preset === 'forest') {
    // Bird-like chirps + wind
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * 0.12;
    const noise = ctx.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 600;
    const windGain = ctx.createGain(); windGain.gain.value = 0.08;
    noise.connect(hp); hp.connect(windGain); windGain.connect(masterGain);
    noise.start();
    lofiNodes.push(noise);

    // Harmonic tones (birds)
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      env.gain.value = 0.025;
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.2 + i * 0.15;
      lfoG.gain.value = 0.02;
      lfo.connect(lfoG); lfoG.connect(env.gain);
      lfo.start();
      osc.connect(env); env.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.5);
      lofiNodes.push(osc, lfo);
    });
  }
}


function getSong(id)  { return allSongs.find(s => s.id === id) || null; }

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

  stopVisualizer();
  stopLofi();
  audioEl.pause();
  audioEl.src = '';

  currentId = id;
  isPlaying = true;

  // Init Web Audio on first play (requires user gesture)
  try { getActx(); } catch(e) { console.warn('AudioContext init failed', e); }
  if (actx && actx.state === 'suspended') actx.resume();

  // Lo-Fi ambient: use Web Audio synth, no audio element
  if (song.isLofi) {
    try { startLofi(song.lofiPreset); } catch(e) { console.error(e); }
    updateMediaSession(song);
    setAmbientColor(song.color);
    const cover = document.getElementById('np-cover');
    cover.classList.remove('pulse');
    void cover.offsetWidth;
    cover.classList.add('pulse');
    refreshUI();
    return;
  }

  audioEl.src = song.src;
  audioEl.load();
  audioEl.volume = isMuted ? 0 : volume;
  audioEl.play().then(() => {
    startVisualizer();
    updateMediaSession(song);
  }).catch(err => {
    console.error(err);
    showToast('Cannot play: ' + err.message);
    isPlaying = false;
  });

  // Cover pulse animation
  const cover = document.getElementById('np-cover');
  cover.classList.remove('pulse');
  void cover.offsetWidth;
  cover.classList.add('pulse');

  // Ambient orbs
  setAmbientColor(song.color);

  refreshUI();
}

function togglePlay() {
  if (!currentId) {
    const q = getQueue();
    if (q.length) playSong(q[0].id);
    return;
  }
  const song = getSong(currentId);
  if (song && song.isLofi) {
    if (isPlaying) {
      stopLofi();
      isPlaying = false;
    } else {
      startLofi(song.lofiPreset);
      isPlaying = true;
    }
    refreshUI();
    return;
  }
  if (isPlaying) {
    audioEl.pause();
    stopVisualizer();
    isPlaying = false;
  } else {
    if (actx && actx.state === 'suspended') actx.resume();
    audioEl.play().then(startVisualizer).catch(console.error);
    isPlaying = true;
  }
  refreshUI();
}

function playNext() {
  const q = getQueue();
  if (!q.length) return;
  const idx    = q.findIndex(s => s.id === currentId);
  const nextId = isShuffle
    ? q[Math.floor(Math.random() * q.length)].id
    : q[(idx + 1) % q.length].id;
  playSong(nextId);
}

function playPrev() {
  const q = getQueue();
  if (!q.length) return;
  // If more than 3s in, restart; otherwise go to previous
  if (audioEl.currentTime > 3) { audioEl.currentTime = 0; return; }
  const idx    = q.findIndex(s => s.id === currentId);
  const prevId = isShuffle
    ? q[Math.floor(Math.random() * q.length)].id
    : q[(idx - 1 + q.length) % q.length].id;
  playSong(prevId);
}

// ─── Audio element events ─────────────────────────────────────────────────────
audioEl.addEventListener('timeupdate', () => {
  if (!audioEl.duration || isNaN(audioEl.duration)) return;
  setProgress(audioEl.currentTime, audioEl.duration);
  if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
    try {
      navigator.mediaSession.setPositionState({
        duration: audioEl.duration,
        playbackRate: audioEl.playbackRate,
        position: audioEl.currentTime,
      });
    } catch(e) {}
  }
});

audioEl.addEventListener('ended', () => {
  if (repeatMode === 'one') { playSong(currentId); return; }
  const q   = getQueue();
  const idx = q.findIndex(s => s.id === currentId);
  if (repeatMode === 'all' || isShuffle) { playNext(); return; }
  if (idx < q.length - 1) { playNext(); }
  else { stopVisualizer(); isPlaying = false; refreshUI(); }
});

audioEl.addEventListener('play',  () => { isPlaying = true;  refreshUI(); });
audioEl.addEventListener('pause', () => { isPlaying = false; refreshUI(); });
audioEl.addEventListener('error', () => {
  showToast('Playback error — check file format');
  stopVisualizer(); isPlaying = false; refreshUI();
});

// ─── Media Session API ────────────────────────────────────────────────────────
function updateMediaSession(song) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title:  song.title,
    artist: song.artist,
    album:  song.genre,
  });
  navigator.mediaSession.setActionHandler('play',         () => { audioEl.play(); isPlaying = true; refreshUI(); });
  navigator.mediaSession.setActionHandler('pause',        () => { audioEl.pause(); isPlaying = false; refreshUI(); });
  navigator.mediaSession.setActionHandler('nexttrack',    playNext);
  navigator.mediaSession.setActionHandler('previoustrack',playPrev);
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
}

let toastTimer = null;
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// Inline confirm — replaces browser confirm() which is blocked in iOS PWA/iframe contexts
let confirmEl = null;
function showConfirm(msg, onYes) {
  if (confirmEl) confirmEl.remove();
  confirmEl = document.createElement('div');
  confirmEl.className = 'confirm-dialog';
  confirmEl.innerHTML =
    '<div class="confirm-inner">'
    + '<p class="confirm-msg">' + escHtml(msg) + '</p>'
    + '<div class="confirm-btns">'
    + '<button class="confirm-no">Cancel</button>'
    + '<button class="confirm-yes">Delete</button>'
    + '</div></div>';
  document.body.appendChild(confirmEl);
  confirmEl.querySelector('.confirm-no').addEventListener('click',  () => confirmEl.remove());
  confirmEl.querySelector('.confirm-yes').addEventListener('click', () => { confirmEl.remove(); onYes(); });
  confirmEl.addEventListener('click', e => { if (e.target === confirmEl) confirmEl.remove(); });
}

// Inline new-playlist dialog — replaces prompt() which is blocked in iOS PWA/iframe contexts
function openNewPlaylistDialog() {
  let dlg = document.getElementById('new-pl-dialog');
  if (!dlg) {
    dlg = document.createElement('div');
    dlg.id = 'new-pl-dialog';
    dlg.className = 'confirm-dialog';
    dlg.innerHTML =
      '<div class="confirm-inner">'
      + '<p class="confirm-msg">New Playlist</p>'
      + '<input id="new-pl-input" type="text" placeholder="Playlist name…" maxlength="40" '
      +   'style="width:100%;background:var(--surface2);border:1px solid var(--border-strong);'
      +   'border-radius:8px;padding:9px 13px;color:var(--text);font-size:0.9rem;outline:none;'
      +   'font-family:inherit;margin-bottom:10px;box-sizing:border-box"/>'
      + '<div class="confirm-btns">'
      + '<button class="confirm-no">Cancel</button>'
      + '<button class="confirm-yes confirm-create">Create</button>'
      + '</div></div>';
    document.body.appendChild(dlg);
    dlg.querySelector('.confirm-no').addEventListener('click', () => dlg.remove());
    dlg.querySelector('.confirm-yes').addEventListener('click', () => {
      const name = document.getElementById('new-pl-input').value.trim();
      if (!name) return;
      const pl = { id: 'pl' + Date.now(), name, songIds: [] };
      playlists.push(pl); savePlaylists(); renderPlaylists();
      showToast('Playlist created: ' + pl.name);
      dlg.remove();
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.remove(); });
    document.getElementById('new-pl-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') dlg.querySelector('.confirm-yes').click();
      if (e.key === 'Escape') dlg.remove();
    });
  } else {
    dlg.style.display = 'flex';
    const inp = document.getElementById('new-pl-input');
    if (inp) inp.value = '';
  }
  setTimeout(() => document.getElementById('new-pl-input')?.focus(), 50);
}

function setProgress(cur, tot) {
  const pct = Math.min((cur / tot) * 100, 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-thumb').style.left = pct + '%';
  document.getElementById('current-time').textContent  = fmt(cur);
  document.getElementById('total-time').textContent    = fmt(tot);
  document.getElementById('progress-bar').setAttribute('aria-valuenow', Math.round(pct));
}

function setVolume(val) {
  volume = Math.max(0, Math.min(1, val));
  document.getElementById('volume-fill').style.width  = (volume * 100) + '%';
  document.getElementById('volume-thumb').style.left  = (volume * 100) + '%';
  document.getElementById('volume-bar').setAttribute('aria-valuenow', Math.round(volume * 100));
  audioEl.volume = isMuted ? 0 : volume;
  if (gainNode && actx) gainNode.gain.setValueAtTime(isMuted ? 0 : volume, actx.currentTime);
  updateVolIcon();
}

function toggleMute() {
  isMuted = !isMuted;
  audioEl.volume = isMuted ? 0 : volume;
  if (gainNode && actx) gainNode.gain.setValueAtTime(isMuted ? 0 : volume, actx.currentTime);
  updateVolIcon();
  showToast(isMuted ? 'Muted' : 'Unmuted');
}

function updateVolIcon() {
  const i = document.getElementById('mute-btn').querySelector('i');
  i.className = (isMuted || volume === 0) ? 'fa-solid fa-volume-xmark'
    : volume < 0.4 ? 'fa-solid fa-volume-low' : 'fa-solid fa-volume-high';
}

function refreshUI() {
  const playIcon = document.getElementById('play-btn').querySelector('i');
  playIcon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';

  const song = getSong(currentId);
  if (song) {
    document.getElementById('np-title').textContent  = song.title;
    document.getElementById('np-artist').textContent = song.artist;
    const cover = document.getElementById('np-cover');
    cover.style.background = song.color;
    cover.innerHTML = '<span style="font-size:1.5rem">' + song.emoji + '</span>';
    document.getElementById('main-content').style.background =
      'linear-gradient(180deg,' + song.color + '28 0%,var(--bg) 380px)';

    // Lo-fi: show ∞ duration
    if (song.isLofi) {
      document.getElementById('total-time').textContent = '∞';
      document.getElementById('current-time').textContent = isPlaying ? '▶ live' : '0:00';
    }

    const likeBtn = document.getElementById('like-btn');
    const liked   = likedIds.has(song.id);
    likeBtn.querySelector('i').className = liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    likeBtn.classList.toggle('liked', liked);
  }

  document.querySelectorAll('.song-card').forEach(card => {
    const sid    = card.dataset.songId;
    const active = sid === currentId && isPlaying;
    card.classList.toggle('active', sid === currentId);
    card.querySelector('.card-play-overlay i').className =
      'fa-solid ' + (active ? 'fa-pause' : 'fa-play');

    // Equalizer bars
    let eq = card.querySelector('.eq-bars');
    if (active) {
      if (!eq) {
        eq = document.createElement('div');
        eq.className = 'eq-bars';
        eq.innerHTML = '<div class="eq-bar"></div>'.repeat(4);
        card.querySelector('.card-actions').appendChild(eq);
      }
    } else if (eq) {
      eq.remove();
    }

    const lb = card.querySelector('.card-like-btn');
    if (lb) {
      const liked = likedIds.has(sid);
      lb.classList.toggle('liked', liked);
      lb.querySelector('i').className = 'fa-' + (liked ? 'solid' : 'regular') + ' fa-heart';
    }
  });

  document.querySelectorAll('#queue-list li').forEach(li =>
    li.classList.toggle('active', li.dataset.songId === currentId)
  );

  const rb = document.getElementById('repeat-btn');
  rb.classList.toggle('active', repeatMode !== 'off');
  rb.dataset.mode = repeatMode;
  rb.title = 'Repeat: ' + repeatMode + ' (R)';

  document.getElementById('shuffle-btn').classList.toggle('active', isShuffle);
}

// ─── Rendering ────────────────────────────────────────────────────────────────
function getFilteredSongs(pool) {
  if (!searchQuery) return pool;
  const q = searchQuery.toLowerCase();
  return pool.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.artist.toLowerCase().includes(q) ||
    s.genre.toLowerCase().includes(q)
  );
}

function section(title, songs) {
  return '<div class="grid-section">'
    + '<div class="grid-section-title">' + escHtml(title) + '</div>'
    + '<div class="song-grid-inner">' + songs.map(cardHTML).join('') + '</div>'
    + '</div>';
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderAll() {
  const grid   = document.getElementById('song-grid');
  const addBtn = document.getElementById('add-to-pl-btn');
  if (addBtn) addBtn.style.display = activePl ? 'flex' : 'none';

  let pool = activePl
    ? (() => { const pl = playlists.find(p => p.id === activePl); return pl ? allSongs.filter(s => pl.songIds.includes(s.id)) : []; })()
    : activeCategory
    ? allSongs.filter(s => s.categories && s.categories.includes(activeCategory))
    : allSongs;
  pool = getFilteredSongs(pool);

  if (!pool.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-music"></i><p>'
      + (searchQuery
          ? 'No results for "' + escHtml(searchQuery) + '"'
          : activePl ? 'Playlist is empty. Add songs with the + button.'
          : activeCategory ? 'No songs in this category yet.'
          : 'No songs yet.')
      + '</p></div>';
    renderQueue();
    return;
  }

  const builtin = pool.filter(s => !s.isLocal);
  const local   = pool.filter(s =>  s.isLocal);
  let html = '';
  if (builtin.length) html += section('Tracks', builtin);
  if (local.length)   html += section('My Uploads', local);
  grid.innerHTML = html;
  renderQueue();
}

function renderCategories() {
  const grid = document.getElementById('song-grid');
  grid.innerHTML = '<div class="categories-grid">'
    + CATEGORIES.map(cat => {
        const count = allSongs.filter(s => s.categories && s.categories.includes(cat.id)).length;
        return '<div class="category-card" data-cat-id="' + cat.id + '" style="--cat-color:' + cat.color + '">'
          + '<div class="cat-emoji">' + cat.emoji + '</div>'
          + '<div class="cat-label">' + escHtml(cat.label) + '</div>'
          + '<div class="cat-desc">' + escHtml(cat.desc) + '</div>'
          + '<div class="cat-count">' + count + ' track' + (count !== 1 ? 's' : '') + '</div>'
          + '</div>';
      }).join('')
    + '</div>';
}

function cardHTML(song) {
  const active = song.id === currentId;
  const playing = active && isPlaying;
  const liked  = likedIds.has(song.id);
  const inPl   = playlists.some(p => p.songIds.includes(song.id));
  return '<div class="song-card' + (active ? ' active' : '') + '" data-song-id="' + song.id + '"' + (song.isLofi ? ' data-lofi="true"' : '') + '>'
    + '<div class="card-cover" style="background:' + song.color + '">'
    + '<span class="cover-icon">' + song.emoji + '</span>'
    + '<div class="card-play-overlay"><i class="fa-solid ' + (playing ? 'fa-pause' : 'fa-play') + '"></i></div>'
    + '</div>'
    + '<div class="card-title">'  + escHtml(song.title)  + '</div>'
    + '<div class="card-artist">' + escHtml(song.artist) + '</div>'
    + '<div class="card-meta">'   + escHtml(song.genre)  + '</div>'
    + '<div class="card-actions">'
    + '<button class="card-like-btn' + (liked ? ' liked' : '') + '" data-id="' + song.id + '" title="Like">'
    +   '<i class="fa-' + (liked ? 'solid' : 'regular') + ' fa-heart"></i></button>'
    + '<button class="card-add-pl-btn' + (inPl ? ' in-pl' : '') + '" data-id="' + song.id + '" title="Add to playlist">'
    +   '<i class="fa-solid fa-' + (inPl ? 'circle-check' : 'circle-plus') + '"></i></button>'
    + (song.isLocal ? '<button class="delete-btn" data-id="' + song.id + '" title="Delete"><i class="fa-solid fa-trash"></i></button>' : '')
    + (playing ? '<div class="eq-bars"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>' : '')
    + '</div>'
    + '</div>';
}

function renderQueue() {
  const q = getQueue();
  document.getElementById('queue-list').innerHTML = q.map((s, i) =>
    '<li data-song-id="' + s.id + '" class="' + (s.id === currentId ? 'active' : '') + '">'
    + '<span class="q-num">' + (i + 1) + '</span>'
    + '<div class="q-info"><div class="q-title">' + escHtml(s.title) + '</div><div class="q-artist">' + escHtml(s.artist) + '</div></div>'
    + '<span class="q-emoji">' + s.emoji + '</span>'
    + '</li>'
  ).join('');
}

function renderPlaylists() {
  const ul = document.getElementById('playlist-sidebar');
  if (!playlists.length) { ul.innerHTML = '<li class="pl-empty-hint">No playlists yet</li>'; return; }
  ul.innerHTML = playlists.map(pl =>
    '<li data-pl-id="' + pl.id + '" class="' + (pl.id === activePl ? 'active' : '') + '">'
    + '<span class="pl-icon"><i class="fa-solid fa-music"></i></span>'
    + '<span class="pl-name">' + escHtml(pl.name) + '</span>'
    + '<button class="pl-del-btn" data-pl-id="' + pl.id + '" title="Delete playlist"><i class="fa-solid fa-xmark"></i></button>'
    + '</li>'
  ).join('');
}

// ─── Playlist modal ───────────────────────────────────────────────────────────
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
      +   '<input id="pl-modal-input" type="text" placeholder="New playlist name…" maxlength="40"/>'
      +   '<button class="upload-btn" id="pl-modal-create"><i class="fa-solid fa-plus"></i> Create</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(modal);

    document.getElementById('pl-modal-close').addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
    document.getElementById('pl-modal-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('pl-modal-create').click();
    });
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
      + '<i class="fa-solid fa-' + (has ? 'circle-check' : 'circle-plus') + '"></i> ' + escHtml(pl.name)
      + '</li>';
  }).join('');
  list.querySelectorAll('.pl-modal-item').forEach(li => {
    li.addEventListener('click', () => {
      const pl  = playlists.find(p => p.id === li.dataset.plId);
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

// ─── Persistence ──────────────────────────────────────────────────────────────
function savePlaylists() { localStorage.setItem('gb_playlists', JSON.stringify(playlists)); }
function loadPlaylists() {
  try { playlists = JSON.parse(localStorage.getItem('gb_playlists') || '[]'); } catch(e) { playlists = []; }
}
function saveLiked() { localStorage.setItem('gb_liked', JSON.stringify([...likedIds])); }

// ─── Upload / delete ──────────────────────────────────────────────────────────
const COLORS = ['#ff6b9d','#c471ed','#12c2e9','#f093fb','#4facfe','#43e97b','#fa709a','#fee140','#ff4444'];
const EMOJIS = ['🎵','🎶','🎸','🎹','🎺','🎻','🥁','🎤','🎧'];

async function handleUpload(files, targetPlId) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith('audio/')) continue;
    const title = file.name.replace(/\.[^/.]+$/, '');
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    try {
      const id  = String(await saveSong({ title, artist: 'Local', genre: 'Uploaded', blob: file, color, emoji }));
      const src = URL.createObjectURL(file);
      allSongs.push({ id, title, artist: 'Local', genre: 'Uploaded', src, color, emoji, isLocal: true });
      const plId = targetPlId || activePl;
      if (plId) {
        const pl = playlists.find(p => p.id === plId);
        if (pl && !pl.songIds.includes(id)) { pl.songIds.push(id); savePlaylists(); }
      }
      added++;
    } catch(e) { showToast('Upload failed: ' + e.message); }
  }
  if (added) showToast(added === 1 ? 'Song added' : added + ' songs added');
  renderAll(); renderPlaylists();
}

async function handleDelete(id) {
  const song = getSong(id);
  if (!song) return;
  // Use inline confirm toast instead of browser confirm() which is blocked on some mobile browsers
  showConfirm('Delete "' + song.title + '"?', async () => {
    try {
      await deleteSong(isNaN(Number(id)) ? id : Number(id));
      if (currentId === id) { audioEl.pause(); stopVisualizer(); isPlaying = false; currentId = null; }
      allSongs = allSongs.filter(s => s.id !== id);
      playlists.forEach(pl => { pl.songIds = pl.songIds.filter(sid => sid !== id); });
      savePlaylists(); renderAll(); renderPlaylists(); refreshUI(); showToast('Deleted');
    } catch(e) { showToast('Delete failed: ' + e.message); }
  });
}

// ─── Drag-and-drop ────────────────────────────────────────────────────────────
function setupDragDrop() {
  const main = document.getElementById('main-content');
  const zone = document.getElementById('drop-zone');

  let dragCounter = 0;
  main.addEventListener('dragenter', e => {
    e.preventDefault();
    dragCounter++;
    if ([...e.dataTransfer.items].some(i => i.kind === 'file')) zone.classList.add('active');
  });
  main.addEventListener('dragleave', () => {
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; zone.classList.remove('active'); }
  });
  main.addEventListener('dragover', e => e.preventDefault());
  main.addEventListener('drop', e => {
    e.preventDefault();
    dragCounter = 0;
    zone.classList.remove('active');
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('audio/'));
    if (files.length) handleUpload(files);
    else showToast('Only audio files are supported');
  });
}

// ─── Slider drag helper ───────────────────────────────────────────────────────
function makeSlider(barEl, onValue) {
  function calc(e) {
    const r = barEl.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  }
  let dragging = false;
  barEl.addEventListener('mousedown',  e => { dragging = true; onValue(calc(e)); });
  barEl.addEventListener('touchstart', e => { dragging = true; onValue(calc(e)); }, { passive: true });
  document.addEventListener('mousemove',  e => { if (dragging) onValue(calc(e)); });
  // passive: false so we can preventDefault and stop page scroll while dragging
  document.addEventListener('touchmove',  e => {
    if (dragging) { e.preventDefault(); onValue(calc(e)); }
  }, { passive: false });
  document.addEventListener('mouseup',  () => { dragging = false; });
  document.addEventListener('touchend', () => { dragging = false; });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  try { likedIds = new Set(JSON.parse(localStorage.getItem('gb_liked') || '[]')); } catch(e) {}
  loadPlaylists();
  try {
    const local = await loadSongs();
    local.forEach(s => {
      s.isLocal = true;
      s.id = String(s.id);
      if (!s.src && s.blob) s.src = URL.createObjectURL(s.blob);
      allSongs.push(s);
    });
  } catch(e) { console.warn('IndexedDB load failed', e); }

  setVolume(volume);
  renderAll();
  renderPlaylists();
  setupEvents();
  setupDragDrop();
  setupTheme();
  setupSleepTimer();
  showWelcome();
}

function showWelcome() {
  const ov = document.createElement('div');
  ov.id = 'welcome-overlay';
  ov.innerHTML =
    '<div class="welcome-card">'
    + '<div class="welcome-logo"><i class="fa-solid fa-music"></i></div>'
    + '<h1>GrooveBox</h1>'
    + '<p>Your personal music player</p>'
    + '<button class="welcome-btn" id="start-btn"><i class="fa-solid fa-play"></i> Start Listening</button>'
    + '<p class="welcome-sub">Press <kbd style="background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:1px 6px;font-size:0.7rem">?</kbd> anytime for keyboard shortcuts</p>'
    + '</div>';
  document.body.appendChild(ov);
  function dismissWelcome() {
    ov.style.pointerEvents = 'none';
    ov.classList.add('fade-out');
    setTimeout(() => { if (ov.parentNode) ov.remove(); }, 500);
    if (allSongs.length) playSong(allSongs[0].id);
  }
  document.getElementById('start-btn').addEventListener('click', dismissWelcome);
  document.getElementById('start-btn').addEventListener('touchend', e => { e.preventDefault(); dismissWelcome(); });
}

// ─── Event wiring ─────────────────────────────────────────────────────────────
function setupEvents() {
  // Transport
  document.getElementById('play-btn').addEventListener('click', togglePlay);
  document.getElementById('prev-btn').addEventListener('click', playPrev);
  document.getElementById('next-btn').addEventListener('click', playNext);

  // Shuffle
  document.getElementById('shuffle-btn').addEventListener('click', () => {
    isShuffle = !isShuffle;
    refreshUI();
    showToast(isShuffle ? 'Shuffle on' : 'Shuffle off');
  });

  // Repeat
  document.getElementById('repeat-btn').addEventListener('click', () => {
    const modes = ['off', 'all', 'one'];
    repeatMode = modes[(modes.indexOf(repeatMode) + 1) % 3];
    refreshUI();
    showToast('Repeat: ' + repeatMode);
  });

  // Like (now-playing bar)
  document.getElementById('like-btn').addEventListener('click', () => {
    if (!currentId) return;
    likedIds.has(currentId) ? likedIds.delete(currentId) : likedIds.add(currentId);
    saveLiked();
    refreshUI();
    showToast(likedIds.has(currentId) ? '❤️ Liked' : 'Unliked');
  });

  // Volume
  document.getElementById('mute-btn').addEventListener('click', toggleMute);
  makeSlider(document.getElementById('volume-bar'), setVolume);

  // Progress bar
  makeSlider(document.getElementById('progress-bar'), pct => {
    if (!currentId || !audioEl.duration || isNaN(audioEl.duration)) return;
    audioEl.currentTime = pct * audioEl.duration;
  });

  // Queue panel
  document.getElementById('queue-btn').addEventListener('click', () => {
    document.getElementById('queue-panel').classList.toggle('open');
  });
  document.getElementById('close-queue').addEventListener('click', () => {
    document.getElementById('queue-panel').classList.remove('open');
  });
  document.getElementById('queue-list').addEventListener('click', e => {
    const li = e.target.closest('li[data-song-id]');
    if (li) { playSong(li.dataset.songId); document.getElementById('queue-panel').classList.remove('open'); }
  });

  // Song grid (event delegation)
  document.getElementById('song-grid').addEventListener('click', e => {
    // Category card click
    const catCard = e.target.closest('.category-card');
    if (catCard) {
      activeCategory = catCard.dataset.catId;
      const cat = CATEGORIES.find(c => c.id === activeCategory);
      document.getElementById('main-title').textContent = cat ? cat.emoji + ' ' + cat.label : 'Category';
      renderAll();
      return;
    }
    if (e.target.closest('.card-like-btn')) {
      const id = e.target.closest('.card-like-btn').dataset.id;
      likedIds.has(id) ? likedIds.delete(id) : likedIds.add(id);
      saveLiked(); refreshUI(); return;
    }
    if (e.target.closest('.card-add-pl-btn')) {
      openPlaylistModal(e.target.closest('.card-add-pl-btn').dataset.id); return;
    }
    if (e.target.closest('.delete-btn')) {
      handleDelete(e.target.closest('.delete-btn').dataset.id); return;
    }
    const card = e.target.closest('.song-card');
    if (!card) return;
    const sid = card.dataset.songId;
    if (sid === currentId) togglePlay(); else playSong(sid);
  });

  // Navigation
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      closeMobileSidebar();
      document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      activePl = null;
      activeCategory = null;
      const view = a.dataset.view;

      if (view === 'categories') {
        document.getElementById('main-title').textContent = 'Categories';
        activeCategory = null;
        renderCategories();
        renderQueue();
      } else if (view === 'library') {
        document.getElementById('main-title').textContent = 'My Library';
        const local = getFilteredSongs(allSongs.filter(s => s.isLocal));
        document.getElementById('song-grid').innerHTML = local.length
          ? section('My Uploads', local)
          : '<div class="empty-state"><i class="fa-solid fa-upload"></i><p>No uploads yet. Drag audio files here or use "Add Local Songs".</p></div>';
        renderQueue();
      } else if (view === 'liked') {
        document.getElementById('main-title').textContent = 'Liked Songs';
        const liked = getFilteredSongs(allSongs.filter(s => likedIds.has(s.id)));
        document.getElementById('song-grid').innerHTML = liked.length
          ? section('Liked Songs', liked)
          : '<div class="empty-state"><i class="fa-solid fa-heart"></i><p>No liked songs yet. Hit the heart on any track.</p></div>';
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

  // Playlist sidebar
  document.getElementById('playlist-sidebar').addEventListener('click', e => {
    const delBtn = e.target.closest('.pl-del-btn');
    if (delBtn) {
      e.stopPropagation();
      const plId = delBtn.dataset.plId;
      const pl   = playlists.find(p => p.id === plId);
      if (pl) {
        showConfirm('Delete playlist "' + pl.name + '"?', () => {
          playlists = playlists.filter(p => p.id !== plId);
          savePlaylists();
          if (activePl === plId) { activePl = null; document.getElementById('main-title').textContent = 'All Songs'; }
          renderPlaylists(); renderAll();
        });
      }
      return;
    }
    const li = e.target.closest('li[data-pl-id]');
    if (li) {
      activePl = li.dataset.plId;
      activeCategory = null;
      const pl = playlists.find(p => p.id === activePl);
      document.getElementById('main-title').textContent = pl ? pl.name : 'Playlist';
      document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
      renderPlaylists(); renderAll();
      closeMobileSidebar();
    }
  });

  // New playlist button — open a mini inline modal instead of prompt() (blocked on iOS PWA)
  document.getElementById('new-playlist-btn').addEventListener('click', () => {
    openNewPlaylistDialog();
  });

  // Search
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    searchClear.style.display = searchQuery ? 'block' : 'none';
    renderAll();
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = ''; searchQuery = '';
    searchClear.style.display = 'none';
    searchInput.focus(); renderAll();
  });

  // File upload
  document.getElementById('local-upload').addEventListener('change', e => {
    if (e.target.files.length) { handleUpload(Array.from(e.target.files)); e.target.value = ''; }
  });

  const addPlBtn = document.getElementById('add-to-pl-btn');
  if (addPlBtn) {
    addPlBtn.addEventListener('click', () => document.getElementById('pl-song-upload').click());
    document.getElementById('pl-song-upload').addEventListener('change', e => {
      if (e.target.files.length) { handleUpload(Array.from(e.target.files), activePl); e.target.value = ''; }
    });
  }

  // Mobile sidebar
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('open');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', closeMobileSidebar);

  // Shortcuts modal
  document.getElementById('close-shortcuts').addEventListener('click', () => {
    document.getElementById('shortcuts-modal').classList.remove('open');
  });
  document.getElementById('shortcuts-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('shortcuts-modal'))
      document.getElementById('shortcuts-modal').classList.remove('open');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch(e.key) {
      case ' ':          e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': playNext(); break;
      case 'ArrowLeft':  playPrev(); break;
      case 'ArrowUp':    e.preventDefault(); setVolume(volume + 0.05); break;
      case 'ArrowDown':  e.preventDefault(); setVolume(volume - 0.05); break;
      case 'm': case 'M': toggleMute(); break;
      case 's': case 'S':
        isShuffle = !isShuffle; refreshUI();
        showToast(isShuffle ? 'Shuffle on' : 'Shuffle off'); break;
      case 'r': case 'R': {
        const modes = ['off','all','one'];
        repeatMode = modes[(modes.indexOf(repeatMode) + 1) % 3];
        refreshUI(); showToast('Repeat: ' + repeatMode); break;
      }
      case 'l': case 'L':
        if (currentId) {
          likedIds.has(currentId) ? likedIds.delete(currentId) : likedIds.add(currentId);
          saveLiked(); refreshUI();
          showToast(likedIds.has(currentId) ? '❤️ Liked' : 'Unliked');
        }
        break;
      case 'q': case 'Q':
        document.getElementById('queue-panel').classList.toggle('open'); break;
      case '?':
        document.getElementById('shortcuts-modal').classList.toggle('open'); break;
    }
  });
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('gb_theme', theme);
  const icon  = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon)  icon.className  = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  if (label) label.textContent = theme === 'dark' ? 'Dark mode' : 'Light mode';
}

function setupTheme() {
  const saved = localStorage.getItem('gb_theme') || 'dark';
  applyTheme(saved);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// ─── Ambient Orbs ─────────────────────────────────────────────────────────────
function setAmbientColor(hex) {
  const orbs = document.querySelectorAll('.orb');
  if (!orbs.length || !hex || hex.length < 7) return;
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return;
  // Orb 1: song color
  orbs[0].style.background = `rgb(${r},${g},${b})`;
  // Orb 2: rotated hue (swap channels)
  orbs[1].style.background = `rgb(${b},${r},${g})`;
  // Orb 3: accent purple always
  orbs[2].style.background = `rgb(124,58,237)`;
  orbs.forEach(o => o.classList.add('visible'));
}

// ─── Sleep Timer ──────────────────────────────────────────────────────────────
let sleepEnd = null, sleepTick = null;

function setSleepTimer(mins) {
  clearInterval(sleepTick);
  sleepTick = null; sleepEnd = null;
  const btn       = document.getElementById('sleep-btn');
  const countdown = document.getElementById('sleep-countdown');

  if (!mins) {
    btn.classList.remove('active');
    countdown.style.display = 'none';
    showToast('Sleep timer cancelled');
    return;
  }

  sleepEnd = Date.now() + mins * 60 * 1000;
  btn.classList.add('active');
  countdown.style.display = 'block';

  function tick() {
    const left = Math.max(0, sleepEnd - Date.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    countdown.textContent = `⏾ ${m}:${String(s).padStart(2,'0')} left`;
    if (left <= 0) {
      clearInterval(sleepTick);
      audioEl.pause();
      stopVisualizer();
      isPlaying = false;
      refreshUI();
      btn.classList.remove('active');
      countdown.style.display = 'none';
      showToast('😴 Sleep timer — goodnight!');
    }
  }
  tick();
  sleepTick = setInterval(tick, 1000);
  showToast(`Sleep timer set for ${mins} min`);
}

function setupSleepTimer() {
  const btn  = document.getElementById('sleep-btn');
  const menu = document.getElementById('sleep-menu');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    menu.classList.toggle('open');
  });
  // iOS doesn't fire click on non-interactive elements; use both click and touchstart
  function closeSleepMenu(e) {
    if (!document.getElementById('sleep-timer-wrap').contains(e.target))
      menu.classList.remove('open');
  }
  document.addEventListener('click', closeSleepMenu);
  document.addEventListener('touchstart', closeSleepMenu, { passive: true });
  document.querySelectorAll('.sleep-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      setSleepTimer(parseInt(opt.dataset.mins));
      menu.classList.remove('open');
    });
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
