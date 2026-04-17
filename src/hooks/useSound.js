import { useRef, useCallback, useEffect } from 'react';

function createAudioCtx() {
  try {
    return new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return null;
  }
}

function envelope(gain, ctx, start, peak, end, duration) {
  gain.gain.cancelScheduledValues(start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(end, start + duration);
}

function tone(ctx, { freq = 220, type = 'sine', duration = 0.16, gainValue = 0.08, detune = 0, filterFreq = 1400 }) {
  if (!ctx || ctx.state === 'suspended') return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(detune, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    envelope(gain, ctx, now, gainValue, 0.0001, duration);
    osc.start(now);
    osc.stop(now + duration);
  } catch {}
}

export function useSound(settings) {
  const ctxRef = useRef(null);
  const unlockedRef = useRef(false);
  const settingsRef = useRef(settings);
  const musicTimersRef = useRef([]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const unlockAudio = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = createAudioCtx();
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        unlockedRef.current = true;
      }).catch(() => {});
    } else {
      unlockedRef.current = true;
    }
  }, []);

  const playDrop = useCallback(() => {
    if (!settingsRef.current?.sfx) return;
    tone(ctxRef.current, { freq: 240, type: 'triangle', duration: 0.11, gainValue: 0.06, filterFreq: 900 });
    tone(ctxRef.current, { freq: 320, type: 'sine', duration: 0.08, gainValue: 0.045, detune: -50, filterFreq: 1400 });
  }, []);

  const playBounce = useCallback(() => {
    if (!settingsRef.current?.sfx) return;
    tone(ctxRef.current, { freq: 180, type: 'sine', duration: 0.06, gainValue: 0.03, filterFreq: 800 });
  }, []);

  const playMerge = useCallback((level = 1) => {
    if (!settingsRef.current?.sfx) return;
    const freq = 260 + level * 28;
    tone(ctxRef.current, { freq, type: 'sine', duration: 0.18, gainValue: 0.07, filterFreq: 1800 });
    tone(ctxRef.current, { freq: freq * 1.5, type: 'triangle', duration: 0.14, gainValue: 0.04, detune: 8, filterFreq: 2200 });
  }, []);

  const playClick = useCallback(() => {
    if (!settingsRef.current?.sfx) return;
    tone(ctxRef.current, { freq: 520, type: 'triangle', duration: 0.05, gainValue: 0.045, filterFreq: 1800 });
  }, []);

  const playGameOver = useCallback(() => {
    if (!settingsRef.current?.sfx) return;
    [420, 360, 300].forEach((freq, index) => {
      setTimeout(() => tone(ctxRef.current, { freq, type: 'sine', duration: 0.22, gainValue: 0.05, filterFreq: 1000 }), index * 120);
    });
  }, []);

  const playPowerup = useCallback(() => {
    if (!settingsRef.current?.sfx) return;
    [330, 440, 550].forEach((freq, index) => {
      setTimeout(() => tone(ctxRef.current, { freq, type: 'triangle', duration: 0.1, gainValue: 0.05, filterFreq: 2200 }), index * 70);
    });
  }, []);

  const stopMusic = useCallback(() => {
    musicTimersRef.current.forEach((timer) => clearTimeout(timer));
    musicTimersRef.current = [];
  }, []);

  const startMusic = useCallback(() => {
    if (!settingsRef.current?.music || !ctxRef.current || musicTimersRef.current.length > 0) return;

    const ctx = ctxRef.current;
    const bpm = 72;
    const beat = (60 / bpm) * 1000;
    const chords = [
      [174.61, 261.63, 349.23],
      [196.0, 293.66, 392.0],
      [220.0, 329.63, 440.0],
      [196.0, 261.63, 392.0],
    ];
    let step = 0;

    const loop = () => {
      if (!settingsRef.current?.music) {
        stopMusic();
        return;
      }
      const notes = chords[step % chords.length];
      notes.forEach((freq, index) => {
        tone(ctx, { freq, type: 'sine', duration: 0.9, gainValue: index === 0 ? 0.028 : 0.018, detune: index * 4, filterFreq: 1200 });
      });
      tone(ctx, { freq: notes[0] / 2, type: 'triangle', duration: 0.5, gainValue: 0.02, filterFreq: 700 });
      step += 1;
      const timer = setTimeout(loop, beat * 2);
      musicTimersRef.current = [timer];
    };

    loop();
  }, [stopMusic]);

  const toggleMusic = useCallback((on) => {
    if (on) startMusic();
    else stopMusic();
  }, [startMusic, stopMusic]);

  const haptic = useCallback((pattern = [14]) => {
    if (!settingsRef.current?.haptics) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }, []);

  useEffect(() => () => {
    stopMusic();
    if (ctxRef.current) ctxRef.current.close().catch(() => {});
  }, [stopMusic]);

  return {
    unlockAudio,
    playDrop,
    playBounce,
    playMerge,
    playClick,
    playGameOver,
    playPowerup,
    startMusic,
    stopMusic,
    toggleMusic,
    haptic,
  };
}
