// CRIMSON VAULT — audio.js
// One job: every sound the game makes, synthesized live with WebAudio —
// no audio files, no network. Footsteps, coin clinks, chimes, the alarm,
// the vault, and the win / caught stingers.
"use strict";

function makeAudio() {
  return {
    ctx: null,
    muted: false,
    alarmOsc: null,
    alarmGain: null,
  };
}

function ensureAudio(audio) {
  if (!audio.ctx) {
    try {
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audio.ctx = null;
    }
  }
  if (audio.ctx && audio.ctx.state === "suspended") audio.ctx.resume();
  return audio.ctx;
}

function tone(audio, freq, dur, type, vol, slideTo) {
  const ctx = ensureAudio(audio);
  if (!ctx || audio.muted) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
  gain.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

function playFootstep(audio, running) {
  tone(audio, running ? 140 : 110, 0.06, "triangle", running ? 0.05 : 0.03);
}

function playCoin(audio) {
  tone(audio, 2100, 0.09, "square", 0.04);
  setTimeout(() => tone(audio, 2600, 0.12, "square", 0.035), 70);
}

function playLoot(audio) {
  tone(audio, 660, 0.1, "sine", 0.07);
  setTimeout(() => tone(audio, 990, 0.16, "sine", 0.07), 90);
}

function playDiamond(audio) {
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(audio, f, 0.22, "sine", 0.08), i * 90));
}

function playKeycard(audio) {
  tone(audio, 880, 0.08, "square", 0.05);
  setTimeout(() => tone(audio, 1174, 0.12, "square", 0.05), 80);
}

function playVault(audio) {
  tone(audio, 180, 0.5, "sawtooth", 0.06, 60);
  setTimeout(() => tone(audio, 523, 0.2, "sine", 0.07), 450);
}

function playSpotted(audio) {
  tone(audio, 330, 0.12, "square", 0.07, 440);
}

function playCaught(audio) {
  [392, 311, 233].forEach((f, i) => setTimeout(() => tone(audio, f, 0.3, "sawtooth", 0.08), i * 160));
}

function playWin(audio) {
  [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(audio, f, 0.3, "sine", 0.08), i * 110));
}

function playClick(audio) {
  tone(audio, 1200, 0.04, "square", 0.03);
}

// The alarm hum: a quiet two-tone siren that follows the alarm meter.
function updateAlarmSound(audio, alarm) {
  const ctx = ensureAudio(audio);
  if (!ctx) return;
  if (alarm < 25) {
    if (audio.alarmOsc) {
      try { audio.alarmOsc.stop(); } catch (e) {}
      audio.alarmOsc = null;
      audio.alarmGain = null;
    }
    return;
  }
  if (!audio.alarmOsc) {
    audio.alarmOsc = ctx.createOscillator();
    audio.alarmGain = ctx.createGain();
    audio.alarmOsc.type = "sine";
    audio.alarmOsc.frequency.value = 620;
    audio.alarmGain.gain.value = 0;
    audio.alarmOsc.connect(audio.alarmGain).connect(ctx.destination);
    audio.alarmOsc.start();
  }
  const target = audio.muted ? 0 : 0.012 + (alarm / 100) * 0.03;
  audio.alarmGain.gain.setTargetAtTime(target, ctx.currentTime, 0.2);
  audio.alarmOsc.frequency.setTargetAtTime(620 + Math.sin(ctx.currentTime * 2.4) * 90, ctx.currentTime, 0.1);
}
