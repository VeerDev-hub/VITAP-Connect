// Synthesizes the trailer soundtrack (music + sound design) → out/audio.wav
// Everything is generated from code: no samples, no licensing issues.
// Cue times match the animation timeline in trailer.html. 120 BPM, A minor.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SR = 48000, LEN = 61, N = SR * LEN;
const TAU = Math.PI * 2;
const bus = () => [new Float32Array(N), new Float32Array(N)];
const drums = bus(), music = bus(), sfx = bus(), send = new Float32Array(N);

let seed = 1234;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rnd() * 2 - 1;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// Write a voice: fn(tt) → mono sample. pan −1..1, rev = reverb send amount.
function voice(target, t0, dur, fn, { pan = 0, gain = 1, rev = 0 } = {}) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  const gl = Math.cos((pan + 1) * Math.PI / 4) * gain, gr = Math.sin((pan + 1) * Math.PI / 4) * gain;
  for (let k = 0; k < n; k++) {
    const i = i0 + k; if (i < 0 || i >= N) continue;
    const s = fn(k / SR, k);
    target[0][i] += s * gl; target[1][i] += s * gr;
    if (rev) send[i] += s * rev * gain;
  }
}
const lp1 = (fc) => { let y = 0; const a = 1 - Math.exp(-TAU * fc / SR); return (x, f) => { const aa = f ? 1 - Math.exp(-TAU * f / SR) : a; y += aa * (x - y); return y; }; };
function svf() { let low = 0, band = 0; return (x, fc, q = 0.7) => { const f = 2 * Math.sin(Math.PI * clamp(fc, 20, SR / 6) / SR); low += f * band; const high = x - low - q * band; band += f * high; return { low, band, high }; }; }

// ── instruments ──────────────────────────────────────────────────────────────
const kicks = [];
function kick(t0, g = 1) {
  kicks.push(t0); let ph = 0;
  voice(drums, t0, 0.55, (tt) => { ph += TAU * (44 + 120 * Math.exp(-tt * 30)) / SR; return Math.tanh(1.6 * (Math.sin(ph) * Math.exp(-tt * 6.5) + noise() * Math.exp(-tt * 400) * 0.25)); }, { gain: 0.9 * g });
}
function clap(t0, g = 1) {
  const f = svf();
  voice(drums, t0, 0.35, (tt) => {
    const env = tt < 0.032 ? Math.exp(-(tt % 0.0105) * 350) : Math.exp(-(tt - 0.032) * 16);
    return f(noise(), 1500, 0.9).band * env * 1.6 + Math.sin(TAU * 185 * tt) * Math.exp(-tt * 35) * 0.25;
  }, { gain: 0.42 * g, rev: 0.35, pan: 0.05 });
}
function hat(t0, open = false, g = 1) {
  const lp = lp1(7500);
  voice(drums, t0, open ? 0.3 : 0.07, (tt) => { const x = noise(); return (x - lp(x)) * Math.exp(-tt * (open ? 16 : 75)); }, { gain: 0.16 * g, pan: 0.25 });
}
const saw = (ph) => 2 * (ph - Math.floor(ph)) - 1;
function bass(t0, dur, f, g = 1) {
  let p1 = 0, p2 = 0, p3 = 0; const filt = svf();
  voice(music, t0, dur, (tt) => {
    p1 += f / SR; p2 += f * 1.006 / SR; p3 += f / SR;
    const env = Math.min(1, tt / 0.004) * Math.min(1, (dur - tt) / 0.02);
    const x = (saw(p1) + saw(p2)) * 0.5;
    return (filt(x, 220 + 1300 * Math.exp(-tt * 9), 0.5).low + Math.sin(TAU * p3) * 0.6) * env;
  }, { gain: 0.34 * g });
}
function pad(t0, dur, freqs, g = 1) {
  freqs.forEach((f, n) => {
    [-1, 1].forEach((side) => {
      let p1 = rnd(), p2 = rnd(); const lp = lp1(1200);
      voice(music, t0, dur + 0.9, (tt) => {
        p1 += f * (1 + side * 0.0042) / SR; p2 += f * (1 - side * 0.0021) / SR;
        const env = Math.min(1, tt / 0.45) * (tt > dur ? Math.exp(-(tt - dur) * 5) : 1);
        return lp(saw(p1) + saw(p2), 700 + 500 * Math.sin(tt * 1.3 + n)) * env;
      }, { gain: 0.03 * g, pan: side * 0.6, rev: 0.6 });
    });
  });
}
function pluck(t0, f, g = 1, pan = 0) {
  let ph = 0; const filt = svf();
  voice(music, t0, 0.4, (tt) => { ph += f / SR; return filt(saw(ph) * 0.7 + (ph % 1 < 0.5 ? 0.3 : -0.3), 300 + 4200 * Math.exp(-tt * 22), 0.6).low * Math.exp(-tt * 9); }, { gain: 0.11 * g, pan, rev: 0.4 });
}

// ── sound design ─────────────────────────────────────────────────────────────
function impact(t0, size = 1, g = 1) {
  let ph = 0; const lp = lp1(900);
  voice(sfx, t0, 2.6 * size, (tt) => {
    ph += TAU * (30 + 70 * Math.exp(-tt * 7)) / SR;
    return Math.tanh(1.4 * Math.sin(ph) * Math.exp(-tt * 2.4 / size)) * 0.9 + lp(noise()) * Math.exp(-tt * 7) * 1.4 + noise() * Math.exp(-tt * 60) * 0.3;
  }, { gain: 0.75 * g, rev: 0.5 });
}
function whoosh(t0, dur, g = 1, up = true, pan0 = -0.6, pan1 = 0.6) {
  const f = svf(), n = Math.floor(dur * SR), i0 = Math.floor(t0 * SR);
  for (let k = 0; k < n; k++) {
    const u = k / n, tt = k / SR, i = i0 + k; if (i >= N) break;
    const fc = up ? 250 * Math.pow(24, u) : 6000 * Math.pow(1 / 24, u);
    const s = f(noise(), fc, 0.55).band * Math.pow(Math.sin(Math.PI * u), 2) * 0.9 * g;
    const pan = pan0 + (pan1 - pan0) * u;
    sfx[0][i] += s * Math.cos((pan + 1) * Math.PI / 4); sfx[1][i] += s * Math.sin((pan + 1) * Math.PI / 4); send[i] += s * 0.3;
  }
}
function riser(t0, dur, g = 1) {
  const f = svf(); let ph = 0;
  voice(sfx, t0, dur, (tt) => {
    const u = tt / dur;
    ph += (180 * Math.pow(6, u)) / SR;
    return (f(noise(), 400 * Math.pow(20, u), 0.4).band * 0.8 + saw(ph) * 0.15 + saw(ph * 1.01) * 0.15) * u * u;
  }, { gain: 0.5 * g, rev: 0.3 });
}
function click(t0, g = 1, tone = 3200) {
  voice(sfx, t0, 0.03, (tt) => noise() * Math.exp(-tt * 1600) * 0.6 + Math.sin(TAU * tone * tt) * Math.exp(-tt * 700) * 0.5, { gain: 0.22 * g, pan: (rnd() - 0.5) * 0.5 });
}
function pop(t0, f = 620, g = 1, pan = 0) {
  let ph = 0;
  voice(sfx, t0, 0.16, (tt) => { ph += TAU * f * (1 + 1.3 * Math.exp(-tt * 45)) / SR; return Math.sin(ph) * Math.exp(-tt * 26); }, { gain: 0.3 * g, pan, rev: 0.15 });
}
function blip(t0, f, g = 1, pan = 0) {
  voice(sfx, t0, 0.08, (tt) => Math.sin(TAU * f * tt) * Math.exp(-tt * 55), { gain: 0.14 * g, pan });
}
function bell(t0, f, g = 1, pan = 0, decay = 1) {
  const parts = [[1, 1], [2.0, 0.45], [3.01, 0.22], [4.17, 0.12]];
  voice(sfx, t0, 1.8, (tt) => parts.reduce((s, [m, a], k) => s + Math.sin(TAU * f * m * tt) * a * Math.exp(-tt * (3.5 + k * 3) / decay), 0) * Math.min(1, tt / 0.002), { gain: 0.16 * g, pan, rev: 0.45 });
}
function ping(t0) { bell(t0, 1760, 0.9, 0, 0.7); bell(t0, 880, 0.5, 0); }
function chime(t0, g = 1) { bell(t0, 880, g, -0.2); bell(t0 + 0.08, 1318.5, g, 0.2); }
function ring(t0) { [[0, 1318.5], [0.1, 1568], [0.2, 1975.5], [0.3, 1568], [0.45, 1318.5], [0.55, 1568], [0.65, 1975.5]].forEach(([d, f]) => bell(t0 + d, f, 0.75, 0, 0.45)); }
function glitch(t0, dur, g = 1) {
  let f = 200, a = 1, next = 0, ph = 0;
  voice(sfx, t0, dur, (tt) => {
    if (tt >= next) { f = 60 + rnd() * 1800; a = rnd() < 0.3 ? 0 : 0.4 + rnd() * 0.6; next = tt + 0.008 + rnd() * 0.04; }
    ph += f / SR; const sq = (ph % 1 < 0.5 ? 1 : -1);
    return Math.round((sq * 0.6 + noise() * 0.4) * a * 4) / 4;
  }, { gain: 0.2 * g, rev: 0.1 });
}
function chatter(t0, dur, g = 1) { for (let t = t0; t < t0 + dur; t += 0.028 + rnd() * 0.02) blip(t, 1400 + rnd() * 2600, 0.5 * g, (rnd() - 0.5) * 1.2); }
function lock(t0) {
  [0, 0.075].forEach((d, k) => { const lp = lp1(2200); voice(sfx, t0 + d, 0.12, (tt) => lp(noise()) * Math.exp(-tt * 70) * 1.4 + Math.sin(TAU * (k ? 120 : 160) * tt) * Math.exp(-tt * 28), { gain: 0.45 }); });
  bell(t0 + 0.12, 2637, 0.35, 0, 0.5);
}
function thock(t0, g = 1) {
  let ph = 0;
  voice(sfx, t0, 0.25, (tt) => { ph += TAU * (85 + 140 * Math.exp(-tt * 30)) / SR; return Math.sin(ph) * Math.exp(-tt * 18) + noise() * Math.exp(-tt * 500) * 0.4; }, { gain: 0.5 * g, rev: 0.15 });
}
function drone(t0, dur) {
  let a = 0, b = 0;
  voice(music, t0, dur, (tt) => { a += 55 / SR; b += 82.41 / SR; const env = Math.min(1, tt / 1.2) * Math.min(1, (dur - tt) / 0.15); return (Math.sin(TAU * a) * 0.8 + Math.sin(TAU * b) * 0.3 + saw(a * 2) * 0.05) * env * (0.8 + 0.2 * Math.sin(tt * 3)); }, { gain: 0.28, rev: 0.2 });
}

// ── score ────────────────────────────────────────────────────────────────────
const BEAT = 0.5, BAR = 2;
const CH = [
  { bass: 55, pad: [220, 261.63, 329.63, 440], arp: [440, 523.25, 659.25, 880] },
  { bass: 43.65, pad: [174.61, 220, 261.63, 349.23], arp: [349.23, 440, 523.25, 698.46] },
  { bass: 65.41, pad: [196, 261.63, 329.63, 392], arp: [392, 523.25, 659.25, 783.99] },
  { bass: 49.0, pad: [196, 246.94, 293.66, 392], arp: [392, 493.88, 587.33, 783.99] }
];
const chordAt = (t) => CH[Math.floor((t - 5) / BAR) % 4];
const inAny = (t, spans) => spans.some(([a, b]) => t >= a - 1e-6 && t < b - 1e-6);

const DRUMS = [[9, 37], [39, 52.75]];
const BASS = [[9, 37], [39, 52.75]];
const ARP = [[17, 37], [39, 52.5]];

// cold open
drone(0, 4.62);
for (let t = 0.0; t < 4.5; t += 0.5) blip(t, 2400, 0.5);
// logo section: pads + sparse kicks
for (let t = 5; t < 9; t += BAR) pad(t, BAR, chordAt(t).pad, 0.9);
kick(5.0, 1.1); kick(7.0, 0.7); kick(8.0, 0.5); kick(8.5, 0.5);
// groove
for (let t = 9; t < 53; t += BAR) pad(t, BAR, chordAt(t).pad, t >= 37 && t < 39 ? 1.3 : 1);
for (let b = 18; b < 106; b++) {
  const t = b * BEAT;
  if (inAny(t, DRUMS)) {
    kick(t);
    if (b % 2 === 1) clap(t, t > 49 ? 1.1 : 1);
    hat(t + 0.25, b % 4 === 3);
    if (t >= 17) { hat(t + 0.125, false, 0.5); hat(t + 0.375, false, 0.5); }
  }
  if (inAny(t, BASS)) {
    const c = chordAt(t);
    bass(t, 0.22, c.bass); bass(t + 0.25, 0.22, c.bass * (b % 4 === 3 ? 2 : 1));
  }
  if (inAny(t, ARP)) {
    const c = chordAt(t), seq = [0, 1, 2, 3, 2, 1, 0, 2];
    for (let s = 0; s < 4; s++) pluck(t + s * 0.125, c.arp[seq[(b * 4 + s) % 8]], 1, ((b * 4 + s) % 2 ? 0.35 : -0.35));
  }
}
// break 37–39: filtered pulse
for (let t = 37; t < 39; t += 0.25) blip(t, 220, 0.35);
// snare roll into the end card
for (let t = 51.5, step = 0.25; t < 52.75; t += step) { clap(t, 0.5 + (t - 51.5) * 0.6); if (t > 52) step = 0.0625; else if (t > 51.75) step = 0.125; }
// final chord
pad(53, 5.2, [110, 220, 329.63, 493.88, 523.25, 659.25], 1.6);
bass(53, 2.5, 55, 1.2);
[53.0, 53.5, 54.0, 55.0, 56.0].forEach((t, i) => pluck(t, [880, 659.25, 523.25, 493.88, 440][i], 0.8, i % 2 ? 0.3 : -0.3));

// ── sound design cues ────────────────────────────────────────────────────────
// cold open
[0.5, 1.75, 3.0].forEach((t, i) => { impact(t, 0.8, 0.8); whoosh(t - 0.18, 0.22, 0.5); });
glitch(3.9, 0.72, 1.1);
riser(3.4, 1.6, 0.9);
// logo
impact(5.0, 1.4, 1.1);
[0, 0.12, 0.24].forEach((d, i) => whoosh(5.0 + d, 0.6, 0.5, true, [-0.8, 0.8, -0.3][i], 0));
pop(6.05, 220, 1.2); bell(6.1, 659.25, 0.6);
whoosh(6.5, 0.6, 0.4, false, 0.4, -0.4);
for (let i = 0; i < 13; i++) click(6.8 + i * 0.04, 0.8, 2600 + i * 60);
for (let i = 0; i < 46; i += 2) click(7.45 + i * 0.0196, 0.45, 4200);
riser(8.0, 1.0, 1.0); whoosh(8.5, 0.5, 0.8);
// graph
impact(9.0, 1.1, 1.0);
for (let i = 0; i < 24; i++) blip(9.25 + rnd() * 1.2, 2000 + rnd() * 2500, 0.35, rnd() * 2 - 1);
[10.5, 11.5, 12.5].forEach(ping);
[10.72, 10.84, 10.9, 10.98, 11.1].forEach((t, i) => pop(t, 700 + i * 90, 0.6, i % 2 ? 0.4 : -0.4));
whoosh(12.6, 0.55, 0.5, true, 0.2, 0.8);
[13.0, 13.5, 14.0, 14.5, 15.0].forEach((t, i) => pop(t, 520 + i * 70, 0.9, 0.5));
for (let i = 0; i < 17; i++) blip(15.5 + i * 0.03, 1800 + i * 60, 0.6, 0.5);
pop(16.02, 900, 1.1, 0.4); bell(16.02, 1318.5, 0.6, 0.4);
whoosh(16.4, 0.65, 0.9, true, -0.6, 0.6);
// dashboard / discover
impact(17.0, 0.6, 0.5); whoosh(16.95, 0.6, 0.6, false, 0.8, 0);
[18.0, 18.15, 18.75, 18.9].forEach((t, i) => pop(t, i % 2 ? 760 : 560, 0.7, 0.3));
whoosh(19.72, 0.45, 1.0, true, -0.8, 0.8);
for (let i = 0; i < 5; i++) click(20.62 + i * 0.1, 0.9, 3400);
pop(21.3, 820, 0.9); pop(21.6, 600, 0.7);
riser(21.6, 1.2, 0.35); whoosh(22.65, 0.4, 0.8, false, 0, -0.6);
// collaborations
whoosh(23.0, 0.5, 0.6, false, 0.6, 0);
for (let i = 0; i < 17; i++) click(23.5 + i * 0.053, 0.8, 3000 + (i % 3) * 300);
[25.0, 25.25, 25.5].forEach((t, i) => pop(t, 600 + i * 120, 0.8, 0.4));
[25.75, 25.87].forEach((t) => pop(t, 480, 0.6, 0.3));
chime(26.3, 0.9); whoosh(26.2, 0.4, 0.4, false, 0.6, 0.6);
click(27.32, 1.3, 1800);
chime(27.42, 0.8); bell(27.6, 1975.5, 0.5);
whoosh(27.55, 0.5, 0.4, true, 0.4, -0.1);
pop(28.05, 700, 0.9, 0.1);
whoosh(28.4, 0.65, 1.0, true, 0, 0);
// messages
pop(29.35, 520, 0.9, -0.4); pop(29.75, 560, 0.9, -0.4);
for (let i = 0; i < 19; i += 1) click(29.95 + i * 0.021, 0.5, 3800);
whoosh(30.42, 0.22, 0.5, true, 0, 0.5); pop(30.45, 760, 0.8, 0.3);
blip(31.05, 2600, 1, 0.3); blip(31.1, 3200, 1, 0.3);
for (let t = 31.45; t < 32.35; t += 0.2) blip(t, 900, 0.25, -0.4);
pop(32.4, 560, 0.9, -0.4);
for (let i = 0; i < 16; i++) click(32.6 + i * 0.022, 0.5, 3800);
whoosh(33.02, 0.22, 0.5, true, 0, 0.5); pop(33.05, 760, 0.8, 0.3);
blip(33.5, 2600, 1, 0.3); blip(33.55, 3200, 1, 0.3);
[33.5, 34.0, 34.5].forEach((t) => pop(t, 640, 0.6, 0.6));
lock(35.0);
chatter(35.0, 0.75, 1);
whoosh(35.45, 0.45, 0.7, true, 0.8, 0); whoosh(35.7, 0.45, 0.7, true, 0.8, 0.2);
bell(36.2, 1568, 0.5, -0.4);
riser(36.4, 0.6, 0.6); whoosh(36.6, 0.42, 0.9);
// calls
ring(37.1); ring(37.9);
click(38.62, 1.3, 1800);
impact(39.0, 0.9, 0.9); chime(39.0, 0.8);
[38.95, 39.05, 39.15, 39.25].forEach((t, i) => whoosh(t, 0.35, 0.35, true, i % 2 ? 0.6 : -0.6, 0));
whoosh(41.5, 0.5, 0.8, false, 0, 0);
// themes + mobile
impact(42.0, 0.8, 0.8); whoosh(41.95, 0.6, 0.6, true, 0, 0);
click(42.94, 1.2, 1600);
whoosh(43.0, 1.0, 1.2, false, -0.7, 0.7); impact(43.0, 0.7, 0.6);
whoosh(44.75, 0.5, 0.6, false, 0, 0);
[45.0, 45.25, 45.5].forEach((t, i) => { whoosh(t, 0.45, 0.6, true, -0.6 + i * 0.6, -0.6 + i * 0.6); pop(t + 0.42, 300, 0.7, -0.6 + i * 0.6); });
whoosh(48.5, 0.6, 0.8, false, 0, 0);
// stack
for (let i = 0; i < 10; i++) { thock(49.25 + i * 0.25, 1); click(49.25 + i * 0.25, 0.6, 2200 + i * 150); }
riser(51.0, 1.85, 1.3);
chatter(51.9, 0.8, 0.6);
// end card
impact(53.0, 1.8, 1.25); whoosh(52.85, 0.5, 0.8);
for (let i = 0; i < 13; i++) click(53.3 + i * 0.035, 0.7, 2600 + i * 70);
bell(54.1, 880, 0.5); bell(54.12, 1318.5, 0.4, 0.3);

// ── mix ──────────────────────────────────────────────────────────────────────
// sidechain the music to the kick for that pumping feel
kicks.sort((a, b) => a - b);
let ki = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  while (ki + 1 < kicks.length && kicks[ki + 1] <= t) ki++;
  const dt = kicks.length && kicks[ki] <= t ? t - kicks[ki] : 9;
  const duck = 1 - 0.55 * Math.exp(-dt / 0.09);
  music[0][i] *= duck; music[1][i] *= duck;
}
// freeverb-style reverb on the send
const SC = SR / 44100;
function reverb(input, spread) {
  const out = new Float32Array(N);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * SC)), i: 0, f: 0 }));
  const aps = [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * SC)), i: 0 }));
  for (let n = 0; n < N; n++) {
    const x = input[n] * 0.015; let y = 0;
    for (const c of combs) { const o = c.buf[c.i]; c.f = o * 0.8 + c.f * 0.2; c.buf[c.i] = x + c.f * 0.86; c.i = (c.i + 1) % c.buf.length; y += o; }
    for (const a of aps) { const b = a.buf[a.i]; const o = -y + b; a.buf[a.i] = y + b * 0.5; a.i = (a.i + 1) % a.buf.length; y = o; }
    out[n] = y;
  }
  return out;
}
const rvL = reverb(send, 0), rvR = reverb(send, 23);

const outL = new Float32Array(N), outR = new Float32Array(N);
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = t > 58.2 ? Math.max(0, 1 - (t - 58.2) / 1.6) : 1;
  const L = (drums[0][i] * 0.9 + music[0][i] * 0.85 + sfx[0][i] + rvL[i] * 0.9) * fade;
  const R = (drums[1][i] * 0.9 + music[1][i] * 0.85 + sfx[1][i] + rvR[i] * 0.9) * fade;
  outL[i] = Math.tanh(L * 1.1); outR[i] = Math.tanh(R * 1.1);
  peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
}
const norm = 0.89 / peak;
const pcm = Buffer.alloc(44 + N * 4);
pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write("WAVE", 8); pcm.write("fmt ", 12);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22); pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write("data", 36); pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.round(clamp(outL[i] * norm, -1, 1) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(clamp(outR[i] * norm, -1, 1) * 32767), 46 + i * 4);
}
const here = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(here, "out"), { recursive: true });
writeFileSync(path.join(here, "out", "audio.wav"), pcm);
writeFileSync(path.join(here, "trailer-audio.wav"), pcm);
console.log(`audio.wav written (peak ${peak.toFixed(2)} → normalised)`);
