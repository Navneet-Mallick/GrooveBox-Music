/**
 * tracks.js — Procedural ambient/lofi/synth track generator using Web Audio API
 * Generates real playable audio buffers. No external files needed.
 */

// ─── Utility ──────────────────────────────────────────────────────────────────
function noteFreq(note, octave) {
  const notes = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  return 440 * Math.pow(2, (notes[note] + (octave - 4) * 12 - 9) / 12);
}

// Render audio buffer offline then return a Blob URL
async function renderToBlob(durationSec, sampleRate, renderFn) {
  const offCtx = new OfflineAudioContext(2, sampleRate * durationSec, sampleRate);
  await renderFn(offCtx, durationSec);
  const buffer = await offCtx.startRendering();
  return audioBufferToWavBlob(buffer);
}

function audioBufferToWavBlob(buffer) {
  const numCh = buffer.numberOfChannels;
  const length = buffer.length * numCh * 2 + 44;
  const arrayBuf = new ArrayBuffer(length);
  const view = new DataView(arrayBuf);
  const sr = buffer.sampleRate;

  function writeStr(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }
  writeStr(0, 'RIFF');
  view.setUint32(4, length - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, buffer.length * numCh * 2, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  return URL.createObjectURL(new Blob([arrayBuf], { type: 'audio/wav' }));
}

// ─── Track 1: "Midnight Drift" — Lo-Fi Hip Hop ────────────────────────────────
export async function generateLofi(durationSec = 90) {
  const sr = 44100;
  return renderToBlob(durationSec, sr, (ctx) => {
    const master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);

    // Chord progression: Am - F - C - G (lofi classic)
    const chords = [
      [noteFreq('A',3), noteFreq('C',4), noteFreq('E',4)],
      [noteFreq('F',3), noteFreq('A',3), noteFreq('C',4)],
      [noteFreq('C',3), noteFreq('E',3), noteFreq('G',3)],
      [noteFreq('G',3), noteFreq('B',3), noteFreq('D',4)],
    ];

    const chordDur = 2;
    const totalChords = Math.floor(durationSec / chordDur);

    for (let i = 0; i < totalChords; i++) {
      const chord = chords[i % chords.length];
      const t = i * chordDur;

      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 800;
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
        gain.gain.linearRampToValueAtTime(0.08, t + chordDur - 0.1);
        gain.gain.linearRampToValueAtTime(0, t + chordDur);
        osc.connect(filter); filter.connect(gain); gain.connect(master);
        osc.start(t); osc.stop(t + chordDur);
      });
    }

    // Lo-fi kick pattern (every beat)
    const beatDur = 0.5;
    const totalBeats = Math.floor(durationSec / beatDur);
    for (let i = 0; i < totalBeats; i++) {
      const t = i * beatDur;
      if (i % 8 === 0 || i % 8 === 4) { // kick on 1 and 3
        const buf = ctx.createBuffer(1, sr * 0.15, sr);
        const data = buf.getChannelData(0);
        for (let j = 0; j < data.length; j++) {
          data[j] = Math.sin(2 * Math.PI * 60 * j / sr) * Math.exp(-j / (sr * 0.04));
        }
        const src = ctx.createBufferSource();
        const g = ctx.createGain(); g.gain.value = 0.5;
        src.buffer = buf; src.connect(g); g.connect(master);
        src.start(t);
      }
      if (i % 8 === 2 || i % 8 === 6) { // snare on 2 and 4
        const buf = ctx.createBuffer(1, sr * 0.1, sr);
        const data = buf.getChannelData(0);
        for (let j = 0; j < data.length; j++) {
          data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (sr * 0.03));
        }
        const src = ctx.createBufferSource();
        const g = ctx.createGain(); g.gain.value = 0.25;
        src.buffer = buf; src.connect(g); g.connect(master);
        src.start(t);
      }
    }

    // Vinyl crackle noise
    const noiseLen = sr * durationSec;
    const noiseBuf = ctx.createBuffer(1, noiseLen, sr);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * (Math.random() < 0.002 ? 0.3 : 0.01);
    }
    const noiseSrc = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 3000;
    const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.06;
    noiseSrc.buffer = noiseBuf;
    noiseSrc.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(master);
    noiseSrc.start(0);
  });
}

// ─── Track 2: "Neon Pulse" — Synthwave ───────────────────────────────────────
export async function generateSynthwave(durationSec = 90) {
  const sr = 44100;
  return renderToBlob(durationSec, sr, (ctx) => {
    const master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);

    // Reverb impulse
    const revLen = sr * 2;
    const revBuf = ctx.createBuffer(2, revLen, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = revBuf.getChannelData(ch);
      for (let i = 0; i < revLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 2);
    }
    const reverb = ctx.createConvolver(); reverb.buffer = revBuf;
    const revGain = ctx.createGain(); revGain.gain.value = 0.3;
    reverb.connect(revGain); revGain.connect(master);

    // Synth bass line: E - E - A - B
    const bassNotes = [
      noteFreq('E',2), noteFreq('E',2), noteFreq('A',2), noteFreq('B',2)
    ];
    const bassDur = 1;
    const totalBass = Math.floor(durationSec / bassDur);
    for (let i = 0; i < totalBass; i++) {
      const t = i * bassDur;
      const freq = bassNotes[i % bassNotes.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 400;
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.linearRampToValueAtTime(0.2, t + bassDur - 0.05);
      gain.gain.linearRampToValueAtTime(0, t + bassDur);
      osc.connect(filter); filter.connect(gain); gain.connect(master);
      osc.start(t); osc.stop(t + bassDur);
    }

    // Arpeggiated synth lead
    const arpNotes = [
      noteFreq('E',4), noteFreq('G',4), noteFreq('B',4), noteFreq('E',5),
      noteFreq('B',4), noteFreq('G',4), noteFreq('E',4), noteFreq('D',4),
    ];
    const arpDur = 0.25;
    const totalArp = Math.floor(durationSec / arpDur);
    for (let i = 0; i < totalArp; i++) {
      const t = i * arpDur;
      const freq = arpNotes[i % arpNotes.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.01);
      gain.gain.linearRampToValueAtTime(0, t + arpDur * 0.8);
      osc.connect(gain); gain.connect(reverb); gain.connect(master);
      osc.start(t); osc.stop(t + arpDur);
    }

    // Drum machine: 4-on-the-floor kick
    const beatDur = 0.5;
    const totalBeats = Math.floor(durationSec / beatDur);
    for (let i = 0; i < totalBeats; i++) {
      const t = i * beatDur;
      if (i % 2 === 0) {
        const buf = ctx.createBuffer(1, sr * 0.2, sr);
        const data = buf.getChannelData(0);
        for (let j = 0; j < data.length; j++) {
          const env = Math.exp(-j / (sr * 0.05));
          data[j] = Math.sin(2 * Math.PI * (80 - 60 * j / data.length) * j / sr) * env;
        }
        const src = ctx.createBufferSource();
        const g = ctx.createGain(); g.gain.value = 0.6;
        src.buffer = buf; src.connect(g); g.connect(master); src.start(t);
      }
      // Hi-hat
      const hBuf = ctx.createBuffer(1, sr * 0.05, sr);
      const hData = hBuf.getChannelData(0);
      for (let j = 0; j < hData.length; j++) {
        hData[j] = (Math.random() * 2 - 1) * Math.exp(-j / (sr * 0.01));
      }
      const hSrc = ctx.createBufferSource();
      const hFilter = ctx.createBiquadFilter(); hFilter.type = 'highpass'; hFilter.frequency.value = 8000;
      const hGain = ctx.createGain(); hGain.gain.value = 0.15;
      hSrc.buffer = hBuf; hSrc.connect(hFilter); hFilter.connect(hGain); hGain.connect(master);
      hSrc.start(t);
    }
  });
}

// ─── Track 3: "Deep Space" — Dark Ambient ────────────────────────────────────
export async function generateAmbient(durationSec = 90) {
  const sr = 44100;
  return renderToBlob(durationSec, sr, (ctx) => {
    const master = ctx.createGain(); master.gain.value = 0.45; master.connect(ctx.destination);

    // Long reverb
    const revLen = sr * 4;
    const revBuf = ctx.createBuffer(2, revLen, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = revBuf.getChannelData(ch);
      for (let i = 0; i < revLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / revLen, 1.5);
    }
    const reverb = ctx.createConvolver(); reverb.buffer = revBuf;
    const revGain = ctx.createGain(); revGain.gain.value = 0.6;
    reverb.connect(revGain); revGain.connect(master);

    // Drone pads — slow evolving chords
    const dronePairs = [
      [noteFreq('A',2), noteFreq('E',3), noteFreq('A',3)],
      [noteFreq('D',2), noteFreq('A',2), noteFreq('F',3)],
      [noteFreq('E',2), noteFreq('B',2), noteFreq('G',3)],
    ];
    const droneDur = 30;
    const totalDrones = Math.ceil(durationSec / droneDur);
    for (let i = 0; i < totalDrones; i++) {
      const t = i * droneDur;
      const freqs = dronePairs[i % dronePairs.length];
      freqs.forEach((freq, fi) => {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator(); // slight detune for width
        const gain = ctx.createGain();
        osc1.type = 'sine'; osc1.frequency.value = freq;
        osc2.type = 'sine'; osc2.frequency.value = freq * 1.003;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 4);
        gain.gain.linearRampToValueAtTime(0.12, t + droneDur - 4);
        gain.gain.linearRampToValueAtTime(0, t + droneDur);
        osc1.connect(gain); osc2.connect(gain);
        gain.connect(reverb); gain.connect(master);
        osc1.start(t); osc1.stop(t + droneDur);
        osc2.start(t); osc2.stop(t + droneDur);
      });
    }

    // Subtle high shimmer
    const shimmerFreqs = [noteFreq('A',5), noteFreq('E',6), noteFreq('C',6)];
    const shimDur = 8;
    const totalShim = Math.floor(durationSec / shimDur);
    for (let i = 0; i < totalShim; i++) {
      const t = i * shimDur + Math.random() * 2;
      const freq = shimmerFreqs[i % shimmerFreqs.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.04, t + 1);
      gain.gain.linearRampToValueAtTime(0, t + shimDur);
      osc.connect(gain); gain.connect(reverb);
      osc.start(t); osc.stop(t + shimDur);
    }

    // Space noise texture
    const noiseLen = sr * durationSec;
    const noiseBuf = ctx.createBuffer(2, noiseLen, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = noiseBuf.getChannelData(ch);
      for (let i = 0; i < noiseLen; i++) d[i] = (Math.random() * 2 - 1) * 0.015;
    }
    const noiseSrc = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass'; noiseFilter.frequency.value = 200;
    noiseSrc.buffer = noiseBuf;
    noiseSrc.connect(noiseFilter); noiseFilter.connect(master);
    noiseSrc.start(0);
  });
}
