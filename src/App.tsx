/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, SkipForward, HelpCircle, Volume2, VolumeX, Smartphone, ShoppingBag } from 'lucide-react';

// --- CONFIG & SKINS ---
const CONFIG = {
  adUnits: {
    appId: 'ca-app-pub-8939784866221143~9299484444',
    banner: 'ca-app-pub-8939784866221143/9113897597',
    interstitial: 'ca-app-pub-8939784866221143/9113897597',
    rewarded: 'ca-app-pub-8939784866221143/9299484444'
  },
  startCoins: 150,
  hintCost: 30,
  skipCost: 100,
  lifeCost: 50,
  adCoins: 60,
  maxLives: 3,
  CELL: 42
};

const SKINS: Record<string, { name: string; c1: string; c2: string; dark: string }> = {
  neon: { name: 'Neon Cyber', c1: '#38bdf8', c2: '#0284c7', dark: '#0369a1' },
  plasma: { name: 'Plasma Pink', c1: '#f43f5e', c2: '#e11d48', dark: '#be123c' },
  gold: { name: 'Quantum Gold', c1: '#fbbf24', c2: '#f59e0b', dark: '#b45309' },
  emerald: { name: 'Matrix Green', c1: '#34d399', c2: '#10b981', dark: '#047857' }
};

// --- AUDIO SYNTH ---
const Sound = {
  ac: null as AudioContext | null,
  master: null as GainNode | null,
  init() {
    try {
      if (!this.ac) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ac = new AudioCtx();
        this.master = this.ac.createGain();
        this.master.gain.value = 0.6;
        this.master.connect(this.ac.destination);
      }
      if (this.ac.state === 'suspended') this.ac.resume();
    } catch (_e) {}
  },
  tone(f: number, dur: number, type: OscillatorType = 'sine', vol = 0.25, delay = 0, f2?: number) {
    if (!this.ac || this.ac.state === 'closed') return;
    try {
      const t = this.ac.currentTime + delay;
      const o = this.ac.createOscillator();
      const g = this.ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      if (this.master) g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch (_e) {}
  },
  tap() { this.tone(720, 0.07, 'triangle', 0.22, 0, 960); },
  click() { this.tone(580, 0.05, 'sine', 0.16); },
  error() { this.tone(150, 0.25, 'sawtooth', 0.28, 0, 70); },
  coin() { this.tone(1046, 0.08, 'square', 0.1); this.tone(1567, 0.16, 'square', 0.1, 0.07); },
  win() { [523, 659, 784, 1047, 1318].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.22, i * 0.09)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.18, i * 0.14)); }
};

// --- LEVEL GENERATOR ---
const DIRS = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];

function levelParams(level: number) {
  const cols = Math.min(4 + Math.floor((level + 1) / 2), 14);
  const rows = Math.min(cols + 1 + Math.floor(level / 4), 16);
  return {
    cols,
    rows,
    maxLen: Math.min(3 + Math.floor(level / 2), 10),
    minLen: level < 4 ? 2 : 3,
    density: Math.min(0.50 + 0.02 * level, 0.90),
    turn: Math.min(0.25 + 0.02 * level, 0.6)
  };
}

function blockerDist(a: any, g: Int16Array, cols: number, rows: number) {
  const h = a.cells[a.cells.length - 1];
  let r = h.r + a.dy, c = h.c + a.dx, k = 1;
  while (r >= 0 && r < rows && c >= 0 && c < cols) {
    const v = g[r * cols + c];
    if (v !== -1 && v !== a.id) return { k, id: v };
    r += a.dy;
    c += a.dx;
    k++;
  }
  return null;
}

function mulberry32(a: number) {
  return function() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genOnce(level: number, seed: number) {
  const P = levelParams(level);
  const rnd = mulberry32(seed);
  const { cols, rows } = P;
  const grid = new Int16Array(cols * rows).fill(-1);
  const arrows: any[] = [];
  const idx = (r: number, c: number) => r * cols + c;
  const target = Math.floor(cols * rows * P.density);
  let filled = 0, fails = 0;

  while (filled < target && fails < 800) {
    const r = (rnd() * rows) | 0, c = (rnd() * cols) | 0;
    if (grid[idx(r, c)] !== -1) { fails++; continue; }
    const d = DIRS[(rnd() * 4) | 0];
    const ray = new Set<number>();
    let ok = true, rr = r + d.dy, cc = c + d.dx;
    while (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
      if (grid[idx(rr, cc)] !== -1) { ok = false; break; }
      ray.add(idx(rr, cc));
      rr += d.dy;
      cc += d.dx;
    }
    if (!ok) { fails++; continue; }
    const nr = r - d.dy, nc = c - d.dx;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[idx(nr, nc)] !== -1) { fails++; continue; }
    const want = P.minLen + ((rnd() * (P.maxLen - P.minLen + 1)) | 0);
    const path: Array<{ r: number; c: number }> = [{ r, c }, { r: nr, c: nc }];
    const used = new Set([idx(r, c), idx(nr, nc)]);
    let cur = { r: nr, c: nc }, dirx = -d.dx, diry = -d.dy;

    while (path.length < want) {
      const opts = [];
      for (const dd of DIRS) {
        const pr = cur.r + dd.dy, pc = cur.c + dd.dx;
        if (pr < 0 || pr >= rows || pc < 0 || pc >= cols) continue;
        const k = idx(pr, pc);
        if (grid[k] !== -1 || used.has(k) || ray.has(k)) continue;
        opts.push({ dd, pr, pc });
      }
      if (!opts.length) break;
      const straight = opts.find(o => o.dd.dx === dirx && o.dd.dy === diry);
      let pick;
      if (straight && rnd() > P.turn) pick = straight;
      else {
        const t = opts.filter(o => o !== straight);
        pick = t.length ? t[(rnd() * t.length) | 0] : straight;
      }
      if (!pick) break;
      path.push({ r: pick.pr, c: pick.pc });
      used.add(idx(pick.pr, pick.pc));
      cur = { r: pick.pr, c: pick.pc };
      dirx = pick.dd.dx;
      diry = pick.dd.dy;
    }
    if (path.length < P.minLen) { fails++; continue; }
    path.reverse();
    const id = arrows.length;
    for (let i = 0; i < path.length; i++) {
      const cell = path[i] as { r: number; c: number };
      grid[idx(cell.r, cell.c)] = id;
    }

    let arrowType = 'neon';
    if (level > 25 && level <= 50) arrowType = rnd() > 0.6 ? 'plasma' : 'neon';
    else if (level > 50 && level <= 75) arrowType = rnd() > 0.5 ? 'quantum' : 'plasma';
    else if (level > 75) {
      const types = ['neon', 'plasma', 'quantum', 'portal'];
      arrowType = types[(rnd() * types.length) | 0];
    }

    arrows.push({ id, cells: path, dx: d.dx, dy: d.dy, arrowType });
    filled += path.length;
  }
  return { cols, rows, arrows, grid };
}

function peel(L: any) {
  const g = Int16Array.from(L.grid);
  const alive = new Set(L.arrows.map((a: any) => a.id));
  let layers = 0;
  while (alive.size) {
    const rem = [];
    for (const id of alive) if (!blockerDist(L.arrows[id], g, L.cols, L.rows)) rem.push(id);
    if (!rem.length) return null;
    for (const id of rem) {
      L.arrows[id].cells.forEach((p: any) => (g[p.r * L.cols + p.c] = -1));
      alive.delete(id);
    }
    layers++;
  }
  return { layers };
}

function genLevel(level: number) {
  const tries = level < 2 ? 1 : Math.min(75, 6 + level * 2);
  let best = null, bestScore = -1e9;
  for (let t = 0; t < tries; t++) {
    const L = genOnce(level, level * 7919 + t * 104729 + 17);
    if (L.arrows.length < 3) continue;
    const info = peel(L);
    if (!info) continue;
    const score = info.layers * 100 + L.arrows.length * 3;
    if (score > bestScore) {
      bestScore = score;
      best = L;
    }
  }
  return best || genOnce(level, 12345 + level);
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'won' | 'lost'>('menu');
  const [level, setLevel] = useState(1);
  const [maxUnlocked, setMaxUnlocked] = useState(1);
  const [coins, setCoins] = useState(CONFIG.startCoins);
  const [lives, setLives] = useState(CONFIG.maxLives);
  const [leftArrows, setLeftArrows] = useState(0);
  const [skin, setSkin] = useState('neon');
  const [soundOn, setSoundOn] = useState(true);
  const [modal, setModal] = useState<{ title: string; body: React.ReactNode; buttons: any[] } | null>(null);
  const [adModal, setAdModal] = useState<{ type: string; reason: string; timer: number; onComplete: () => void } | null>(null);

  const gameRef = useRef<any>(null);
  const camRef = useRef({ s: 1, ox: 0, oy: 0, min: 1, max: 3 });

  // Load saved progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem('arrowNexus_save');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.coins) setCoins(data.coins);
        if (data.level) {
          setLevel(data.level);
          setMaxUnlocked(Math.max(1, data.level));
        }
        if (data.maxUnlocked) setMaxUnlocked(data.maxUnlocked);
        if (data.skin) setSkin(data.skin);
      }
    } catch (_e) {}
  }, []);

  const saveProgress = (newCoins: number, newLevel: number) => {
    try {
      const newMax = Math.max(maxUnlocked, newLevel);
      setMaxUnlocked(newMax);
      localStorage.setItem('arrowNexus_save', JSON.stringify({ coins: newCoins, level: newLevel, maxUnlocked: newMax, skin }));
    } catch (_e) {}
  };

  const startLevel = (lvlNum: number) => {
    Sound.init();
    const L = genLevel(lvlNum);
    const skinObj = SKINS[skin] || SKINS.neon;
    const arrows = L.arrows.map((a: any) => {
      const nn = a.cells.length, h = a.cells[nn - 1];
      let m = 0, r = h.r + a.dy, c = h.c + a.dx;
      while (r >= 0 && r < L.rows && c >= 0 && c < L.cols) {
        m++;
        r += a.dy;
        c += a.dx;
      }
      const ext = a.cells.map((p: any) => ({ x: p.c + 0.5, y: p.r + 0.5 }));
      const K = nn + m + 3;
      for (let k = 1; k <= K; k++) ext.push({ x: h.c + 0.5 + a.dx * k, y: h.r + 0.5 + a.dy * k });

      let col = skinObj.c1, dark = skinObj.dark, light = skinObj.c2;
      if (a.arrowType === 'plasma') { col = '#f43f5e'; dark = '#be123c'; light = '#fb7185'; }
      else if (a.arrowType === 'quantum') { col = '#fbbf24'; dark = '#b45309'; light = '#fde047'; }
      else if (a.arrowType === 'portal') { col = '#a855f7'; dark = '#6b21a8'; light = '#c084fc'; }

      return {
        ...a,
        n: nn,
        m,
        ext,
        sEnd: nn - 1 + m + 0.8,
        color: col,
        dark,
        light,
        state: 'idle',
        s: 0,
        t: 0,
        flash: 0
      };
    });

    gameRef.current = {
      level: lvlNum,
      cols: L.cols,
      rows: L.rows,
      arrows,
      grid: L.grid,
      lives: CONFIG.maxLives,
      left: arrows.length,
      mistakes: 0,
      state: 'playing',
      hintId: -1
    };

    setLevel(lvlNum);
    setLives(CONFIG.maxLives);
    setLeftArrows(arrows.length);
    setGameState('playing');
    setModal(null);
  };

  // AdMob Simulator
  const showAd = (reason: string, onComplete: () => void) => {
    setAdModal({ type: 'REWARDED AD', reason, timer: 4, onComplete });
  };

  useEffect(() => {
    if (!adModal) return;
    if (adModal.timer <= 0) return;
    const iv = setInterval(() => {
      setAdModal(prev => {
        if (!prev) return null;
        if (prev.timer <= 1) {
          clearInterval(iv);
          return { ...prev, timer: 0 };
        }
        return { ...prev, timer: prev.timer - 1 };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [adModal]);

  // Canvas Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const renderLoop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (canvas.width !== vw * dpr || canvas.height !== vh * dpr) {
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);

      const G = gameRef.current;
      if (G) {
        // Fit camera
        const top = 60;
        const bot = 130;
        const aw = vw - 20;
        const ah = vh - top - bot;
        const pad = 0.6 * CONFIG.CELL;
        const bw = G.cols * CONFIG.CELL + pad;
        const bh = G.rows * CONFIG.CELL + pad;
        const fit = Math.min(aw / bw, ah / bh, 1.8);
        camRef.current.s = fit;
        camRef.current.ox = (vw - bw * fit) / 2 + (pad / 2) * fit;
        camRef.current.oy = top + (ah - bh * fit) / 2 + (pad / 2) * fit;

        ctx.save();
        ctx.translate(camRef.current.ox, camRef.current.oy);
        ctx.scale(camRef.current.s, camRef.current.s);

        // Draw board background
        ctx.beginPath();
        const cr = CONFIG.CELL * 0.45;
        const bwPx = G.cols * CONFIG.CELL;
        const bhPx = G.rows * CONFIG.CELL;
        ctx.moveTo(-pad + cr, -pad);
        ctx.arcTo(bwPx + pad, -pad, bwPx + pad, bhPx + pad, cr);
        ctx.arcTo(bwPx + pad, bhPx + pad, -pad, bhPx + pad, cr);
        ctx.arcTo(-pad, bhPx + pad, -pad, -pad, cr);
        ctx.arcTo(-pad, -pad, bwPx + pad, -pad, cr);
        ctx.closePath();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.stroke();

        // Dots
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let r = 0; r < G.rows; r++) {
          for (let c = 0; c < G.cols; c++) {
            ctx.beginPath();
            ctx.arc((c + 0.5) * CONFIG.CELL, (r + 0.5) * CONFIG.CELL, CONFIG.CELL * 0.06, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Update & Draw Arrows
        let exiting = 0;
        for (const a of G.arrows) {
          if (a.flash > 0) a.flash = Math.max(0, a.flash - dt);
          if (a.state === 'exit') {
            a.t += dt;
            const p = Math.min(1, a.t / a.T);
            a.s = a.sEnd * (0.35 * p + 0.65 * p * p);
            if (p >= 1) a.state = 'gone';
            else exiting++;
          } else if (a.state === 'bump') {
            a.t += dt;
            if (a.phase === 1) {
              const p = Math.min(1, a.t / a.d1);
              a.s = a.target * p * p;
              if (p >= 1) {
                a.phase = 2;
                a.t = 0;
                Sound.error();
                const bl = G.arrows[a.blockId];
                if (bl) bl.flash = 0.6;
              }
            } else {
              const q = Math.min(1, a.t / 0.3);
              const e = 1 - Math.pow(1 - q, 3);
              a.s = a.target * (1 - e);
              if (q >= 1) {
                a.s = 0;
                a.state = 'idle';
              }
            }
          }

          // Draw Arrow
          const C = CONFIG.CELL;
          const L = a.n - 1;
          const pts = subPath(a.ext, a.s, a.s + L);
          const w = C * 0.28;

          ctx.save();
          if (a.flash > 0) ctx.translate(Math.sin(time * 0.08) * C * 0.05 * (a.flash / 0.6), 0);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const trace = (dx: number, dy: number) => {
            ctx.beginPath();
            ctx.moveTo(pts[0].x * C + dx, pts[0].y * C + dy);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * C + dx, pts[i].y * C + dy);
          };

          trace(0, C * 0.08);
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = w + C * 0.1;
          ctx.stroke();

          if (G.hintId === a.id) {
            const pl = 0.5 + 0.5 * Math.sin(time * 0.006);
            trace(0, 0);
            ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.4 * pl})`;
            ctx.lineWidth = w + C * (0.35 + 0.2 * pl);
            ctx.stroke();
          }

          trace(0, 0);
          ctx.strokeStyle = a.dark;
          ctx.lineWidth = w + C * 0.09;
          ctx.stroke();
          trace(0, 0);
          ctx.strokeStyle = a.color;
          ctx.lineWidth = w;
          ctx.stroke();

          // Head
          const hp = pts[pts.length - 1];
          const fx = a.dx, fy = a.dy, px = -fy, py = fx;
          const cx = hp.x * C, cy = hp.y * C;
          const tx = cx + fx * C * 0.47, ty = cy + fy * C * 0.47;
          const bx = cx - fx * C * 0.1, by = cy - fy * C * 0.1;
          const hw = C * 0.4;

          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(bx + px * hw, by + py * hw);
          ctx.lineTo(bx - px * hw, by - py * hw);
          ctx.closePath();
          ctx.fillStyle = a.color;
          ctx.fill();

          ctx.restore();
        }

        ctx.restore();

        // Check Win
        if (G.state === 'playing' && G.left === 0 && exiting === 0) {
          G.state = 'won';
          Sound.win();
          const earn = 25 + level * 5;
          const newCoins = coins + earn;
          const nextLvl = level + 1;
          setCoins(newCoins);
          saveProgress(newCoins, nextLvl);
          setGameState('won');
          setModal({
            title: `LEVEL ${level} CLEAR!`,
            body: (
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-2 text-3xl">⭐⭐⭐</div>
                <div className="text-2xl font-black text-amber-400 flex items-center gap-2">
                  🪙 +{earn} Coins Earned
                </div>
              </div>
            ),
            buttons: [
              {
                text: '▶ Next Level',
                cls: 'bg-emerald-500 hover:bg-emerald-600',
                onClick: () => startLevel(nextLvl)
              },
              {
                text: '🏠 Main Menu',
                cls: 'bg-slate-700 hover:bg-slate-600',
                onClick: () => setGameState('menu')
              }
            ]
          });
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, level, coins, skin]);

  const subPath = (pts: any[], a: number, b: number) => {
    const pos = (t: number) => {
      const last = pts.length - 1;
      if (t <= 0) return pts[0];
      if (t >= last) return pts[last];
      const i = t | 0, f = t - i;
      return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f };
    };
    const out = [pos(a)];
    for (let i = Math.floor(a) + 1; i < b && i < pts.length; i++) out.push(pts[i]);
    out.push(pos(b));
    return out;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const G = gameRef.current;
    if (!G || G.state !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const wx = (x - camRef.current.ox) / camRef.current.s / CONFIG.CELL;
    const wy = (y - camRef.current.oy) / camRef.current.s / CONFIG.CELL;

    const c0 = Math.floor(wx), r0 = Math.floor(wy);
    let best = -1, bd = 0.65;
    for (let r = r0 - 1; r <= r0 + 1; r++) {
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        if (r < 0 || c < 0 || r >= G.rows || c >= G.cols) continue;
        const id = G.grid[r * G.cols + c];
        if (id < 0) continue;
        const dist = Math.hypot(wx - (c + 0.5), wy - (r + 0.5));
        if (dist < bd) {
          bd = dist;
          best = id;
        }
      }
    }

    if (best >= 0) {
      const a = G.arrows[best];
      if (a.state !== 'idle') return;
      Sound.tap();
      const b = blockerDist(a, G.grid, G.cols, G.rows);
      if (!b) {
        a.cells.forEach((p: any) => (G.grid[p.r * G.cols + p.c] = -1));
        a.state = 'exit';
        a.t = 0;
        a.s = 0;
        a.burst = false;
        a.T = Math.max(0.35, 0.3 + 0.03 * a.sEnd);
        G.left--;
        if (G.hintId === a.id) G.hintId = -1;
        setLeftArrows(G.left);
      } else {
        G.lives--;
        G.mistakes++;
        a.state = 'bump';
        a.phase = 1;
        a.t = 0;
        a.target = b.k - 0.9;
        a.d1 = 0.09 + 0.045 * (b.k - 1);
        a.blockId = b.id;
        setLives(G.lives);
        if (G.lives <= 0) {
          G.state = 'lost';
          Sound.lose();
          setGameState('lost');
          setModal({
            title: 'SYSTEM OVERLOAD',
            body: <div className="text-rose-400 font-bold">You ran out of lives! Watch an ad to revive or restart.</div>,
            buttons: [
              {
                text: '▶ Watch Ad: +1 Life',
                cls: 'bg-emerald-500 hover:bg-emerald-600',
                onClick: () => {
                  showAd('Revive Life', () => {
                    G.lives = 1;
                    G.state = 'playing';
                    setLives(1);
                    setGameState('playing');
                    setModal(null);
                  });
                }
              },
              {
                text: '🔄 Restart Level',
                cls: 'bg-blue-600 hover:bg-blue-500',
                onClick: () => startLevel(level)
              }
            ]
          });
        }
      }
    }
  };

  const useHint = () => {
    const G = gameRef.current;
    if (!G) return;
    showAd('Hint', () => {
      const free = G.arrows.filter((a: any) => a.state === 'idle' && !blockerDist(a, G.grid, G.cols, G.rows));
      if (free.length) {
        G.hintId = free[(Math.random() * free.length) | 0].id;
        Sound.coin();
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-[#030712] text-white flex flex-col font-sans select-none overflow-hidden">
      {gameState === 'menu' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-950/60 via-[#030712] to-[#030712] relative">
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/80 border border-white/10 px-4 py-2 rounded-full font-bold text-amber-400 backdrop-blur-md">
            <span>🪙</span>
            <span>{coins}</span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-wider bg-gradient-to-r from-cyan-400 via-indigo-300 to-rose-400 bg-clip-text text-transparent mb-2">
              ARROW ESCAPE 2027
            </h1>
            <p className="text-xs tracking-widest text-white/60">NEON NEXUS EDITION</p>
          </div>

          <button
            onClick={() => startLevel(level)}
            className="flex flex-col items-center gap-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-xl px-10 py-5 rounded-3xl shadow-2xl shadow-green-500/30 border border-emerald-400/40 hover:scale-105 transition-all mb-4"
          >
            <span className="flex items-center gap-2"><Play className="fill-current w-6 h-6" /> PLAY NEXUS</span>
            <span className="text-xs font-bold opacity-80">LEVEL {level}</span>
          </button>

          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={() => {
                setModal({
                  title: 'SELECT LEVEL (1 - 100+)',
                  body: (
                    <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto p-2">
                      {Array.from({ length: 105 }).map((_, i) => {
                        const lvlNum = i + 1;
                        return (
                          <button
                            key={lvlNum}
                            onClick={() => {
                              startLevel(lvlNum);
                              setModal(null);
                            }}
                            className={`py-2.5 rounded-xl font-bold text-xs border ${
                              level === lvlNum
                                ? 'bg-cyan-500 border-cyan-300 text-black'
                                : 'bg-slate-900/80 border-white/20 hover:bg-slate-800 text-white'
                            }`}
                          >
                            {lvlNum}
                          </button>
                        );
                      })}
                    </div>
                  ),
                  buttons: [{ text: 'Close', cls: 'bg-slate-700 hover:bg-slate-600' }]
                });
              }}
              className="flex items-center gap-2 bg-slate-900/80 border border-white/15 px-4 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all text-cyan-400"
            >
              🗺️ Levels 100+
            </button>

            <button
              onClick={() => {
                setModal({
                  title: 'NEXUS SHOP & SKINS',
                  body: (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(SKINS).map(([key, s]) => (
                        <button
                          key={key}
                          onClick={() => { setSkin(key); saveProgress(coins, level); }}
                          className={`p-3 rounded-2xl border flex flex-col items-center gap-2 ${skin === key ? 'border-cyan-400 bg-cyan-500/20' : 'border-white/10 bg-slate-900/60'}`}
                        >
                          <div className="w-6 h-6 rounded-full" style={{ background: s.c1 }}></div>
                          <span className="text-xs font-bold">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  ),
                  buttons: [{ text: 'Close', cls: 'bg-slate-700 hover:bg-slate-600' }]
                });
              }}
              className="flex items-center gap-2 bg-slate-900/80 border border-white/15 px-4 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-cyan-400" /> Shop
            </button>

            <button
              onClick={() => setSoundOn(!soundOn)}
              className="flex items-center gap-2 bg-slate-900/80 border border-white/15 px-4 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
              Sound
            </button>
          </div>
        </div>
      )}

      {gameState !== 'menu' && (
        <div className="flex-1 flex flex-col relative w-full h-full">
          {/* HUD */}
          <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between z-20 pointer-events-none">
            <button
              onClick={() => setGameState('menu')}
              className="pointer-events-auto w-11 h-11 bg-slate-900/80 border border-white/20 rounded-xl flex items-center justify-center font-bold text-lg backdrop-blur-md shadow-lg"
            >
              ⏸
            </button>

            <div className="text-center pointer-events-none">
              <div className="text-lg font-black bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                LEVEL {level}
              </div>
              <div className="text-[11px] text-white/60">{leftArrows} arrows left</div>
              <div className="text-sm tracking-wider mt-0.5">
                {Array.from({ length: CONFIG.maxLives }).map((_, i) => (
                  <span key={i}>{i < lives ? '❤️' : '🖤'}</span>
                ))}
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/80 border border-white/20 px-3 py-1.5 rounded-full font-bold text-sm backdrop-blur-md">
              <span>🪙</span>
              <span>{coins}</span>
              <button
                onClick={() => showAd('Free Coins', () => setCoins(c => c + CONFIG.adCoins))}
                className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs ml-1 font-black"
              >
                +
              </button>
            </div>
          </div>

          {/* Canvas Game */}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="flex-1 w-full h-full touch-none cursor-pointer"
          />

          {/* Bottom Bar & AdMob Earning Banner */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-slate-950/95 border-t border-white/10 backdrop-blur-md">
            {/* AdMob Banner Slot */}
            <div className="w-full h-11 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-between px-4 border-b border-white/10 text-xs">
              <span className="bg-amber-500 text-black font-extrabold px-1.5 py-0.5 rounded text-[10px]">AD</span>
              <span className="text-white/80 font-semibold tracking-wide">Google AdMob Earning Banner Active</span>
              <span className="text-cyan-400 font-bold">320x50</span>
            </div>

            <div className="flex justify-center gap-4 p-3">
              <button
                onClick={useHint}
                className="flex flex-col items-center justify-center w-20 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl font-extrabold text-xs shadow-lg border border-amber-300/40 relative"
              >
                <HelpCircle className="w-5 h-5 mb-0.5" />
                Hint
                <span className="absolute -top-2 -right-1 bg-rose-500 text-[9px] px-1.5 py-0.5 rounded-full font-black">▶ AD</span>
              </button>

              <button
                onClick={() => showAd('Restart', () => startLevel(level))}
                className="flex flex-col items-center justify-center w-20 h-14 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl font-extrabold text-xs shadow-lg border border-cyan-300/40"
              >
                <RotateCcw className="w-5 h-5 mb-0.5" />
                Restart
              </button>

              <button
                onClick={() => {
                  showAd('Skip Level', () => {
                    const nextL = level + 1;
                    setLevel(nextL);
                    saveProgress(coins, nextL);
                    startLevel(nextL);
                  });
                }}
                className="flex flex-col items-center justify-center w-20 h-14 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl font-extrabold text-xs shadow-lg border border-purple-300/40 relative"
              >
                <SkipForward className="w-5 h-5 mb-0.5" />
                Skip
                <span className="absolute -top-2 -right-1 bg-rose-500 text-[9px] px-1.5 py-0.5 rounded-full font-black">▶ AD</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-indigo-950 to-slate-900 border border-white/20 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-xl font-black mb-3 bg-gradient-to-r from-cyan-400 to-rose-400 bg-clip-text text-transparent">
              {modal.title}
            </h2>
            <div className="mb-6">{modal.body}</div>
            <div className="flex flex-col gap-2">
              {modal.buttons.map((b, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    Sound.click();
                    if (b.onClick) b.onClick();
                    setModal(null);
                  }}
                  className={`w-full py-3 rounded-2xl font-extrabold text-sm shadow-lg transition-all ${b.cls || 'bg-slate-700 hover:bg-slate-600'}`}
                >
                  {b.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AdMob Simulator Modal */}
      {adModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-amber-400 text-black font-black text-xs px-3 py-1 rounded-full mb-4 uppercase tracking-widest shadow-lg">
            Google AdMob {adModal.type}
          </div>
          <div className="w-full max-w-xs aspect-video bg-gradient-to-tr from-slate-900 to-indigo-950 border-2 border-dashed border-amber-500/50 rounded-2xl flex flex-col items-center justify-center p-4 mb-6 shadow-2xl">
            <Smartphone className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
            <div className="text-sm font-extrabold text-white">Sponsored Ad for: {adModal.reason}</div>
            <div className="text-xs text-white/60 mt-1">Real AdMob SDK Active in APK</div>
          </div>
          <button
            disabled={adModal.timer > 0}
            onClick={() => {
              adModal.onComplete();
              setAdModal(null);
            }}
            className={`w-full max-w-xs py-4 rounded-2xl font-black text-base shadow-xl transition-all ${
              adModal.timer > 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-white'
            }`}
          >
            {adModal.timer > 0 ? `Ad Playing (${adModal.timer}s)...` : '✕ Close & Claim Reward'}
          </button>
        </div>
      )}
    </div>
  );
}
