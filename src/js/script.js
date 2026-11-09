/**
 * Neural Portfolio Dashboard Scripts
 * - Neural Microprocessor & Circuit Background Canvas Simulation
 * - UI Interactions, Scroll Reveal & Navigation
 */

// ---------- Neural Background Canvas Engine ----------
(() => {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }

  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // UI Elements
  const fpsCounter = document.getElementById('fps-counter');
  const activeTracesEl = document.getElementById('active-traces');
  const speedSlider = document.getElementById('speed-slider');
  const speedVal = document.getElementById('speed-val');
  const codeSpeedSlider = document.getElementById('code-speed-slider');
  const codeSpeedVal = document.getElementById('code-speed-val');
  const glowSlider = document.getElementById('glow-slider');
  const glowVal = document.getElementById('glow-val');
  const streamToggle = document.getElementById('stream-toggle');
  const btnReset = document.getElementById('btn-reset');
  const btnToggleUI = document.getElementById('btn-toggle-ui');
  const controlPanel = document.getElementById('control-panel');

  // CONFIGURATION
  const CFG = {
    speedMult: 1.0,
    codeSpeedMult: 1.0,
    lineAlpha: 0.16,
    leadAlpha: 0.42,
    pulseAlpha: 0.65,
    pulseDensity: 0.80,
    speedMin: 45,
    speedMax: 135,
    traceCount: 110,
    seed: 7,
    showStreams: true
  };

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Geometry Helpers for Circuit Brain ----------
  function smoothClosed(P, n) {
    const out = [], N = P.length;
    for (let i = 0; i < N; i++) {
      const p0 = P[(i - 1 + N) % N], p1 = P[i], p2 = P[(i + 1) % N], p3 = P[(i + 2) % N];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const f = j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    return out;
  }

  function pointInPoly(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }

  // Side-View Brain Outline (u,v) - Cerebrum, Temporal Lobe, Cerebellum
  const BRAIN_PTS = [
    [-0.98, -0.05], [-0.90, -0.40], [-0.65, -0.68], [-0.30, -0.82], [0.10, -0.85], [0.50, -0.76], [0.82, -0.52],
    [0.98, -0.18], [0.95, 0.12], [0.80, 0.30], [0.55, 0.38], [0.35, 0.36], [0.20, 0.50], [-0.05, 0.52], [-0.30, 0.42],
    [-0.45, 0.48], [-0.62, 0.52], [-0.80, 0.45], [-0.92, 0.30]
  ];

  // Internal Folds
  const FOLDS = [
    [-0.08, -0.50, -0.30, -0.65, -0.40, -0.40, -0.60, -0.55, -0.75, -0.65, -0.85, -0.45, -0.88, -0.30],
    [-0.08, -0.15, -0.30, -0.30, -0.45, 0.00, -0.62, -0.12, -0.78, -0.22, -0.90, 0.00, -0.92, 0.10],
    [-0.08, 0.25, -0.30, 0.10, -0.42, 0.40, -0.60, 0.28, -0.75, 0.18, -0.85, 0.40, -0.86, 0.50],
    [-0.10, 0.60, -0.28, 0.50, -0.40, 0.70, -0.55, 0.65],
    [-0.45, -0.82, -0.38, -0.65, -0.55, -0.55, -0.48, -0.38],
    [-0.52, 0.05, -0.45, 0.20, -0.58, 0.28, -0.52, 0.42],
    [-0.72, -0.05, -0.68, 0.08, -0.78, 0.15, -0.74, 0.30]
  ];

  function foldPath(g, f) {
    g.moveTo(f[0], f[1]);
    for (let i = 2; i + 5 < f.length; i += 6) {
      g.bezierCurveTo(f[i], f[i + 1], f[i + 2], f[i + 3], f[i + 4], f[i + 5]);
    }
  }

  function iconOutline(g) {
    g.beginPath();
    g.moveTo(-0.04, -0.78);
    g.bezierCurveTo(-0.45, -0.95, -1.0, -0.6, -0.98, -0.05);
    g.bezierCurveTo(-0.97, 0.5, -0.55, 0.95, -0.04, 0.75);
    g.closePath();
  }

  function withBrainIcon(g, cx, cy, b, fn) {
    [1, -1].forEach(sx => {
      g.save();
      g.translate(cx, cy);
      g.scale(sx * b, b * 0.92);
      fn();
      g.restore();
    });
  }

  // Floating Snippets for 3 Clean Columns
  const BINARY_SNIPPETS = ['010100', '101101', '001011', '110100', '011010'];
  const MATH_FORMULAS = [
    'E = mc²', 'e^(iπ) + 1 = 0', '∇ × B = μ₀J', '∫ f(x)dx', 'det(A - λI) = 0', 'iℏ ∂Ψ/∂t = ĤΨ'
  ];
  const CODE_SNIPPETS = [
    'async fn sync()', 'auto ptr = make_shared()', 'import torch.nn as nn', 'let mut buf = Vec::new()'
  ];

  let W, H, dpr, paths, nodes, pulses, staticLayer, last = 0, cols = [];
  let chipCx = 0, chipCy = 0, chipC = 0, chipBrainScale = 0;
  let frameCount = 0, fpsTimer = 0;

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rand = mulberry32(CFG.seed);
    const R = (a, b) => a + rand() * (b - a);
    const cx = W / 2, cy = H / 2;
    const scale = Math.max(0.6, Math.min(W, H) / 800);

    // Central Microprocessor Dimensions
    chipCx = cx;
    chipCy = cy;
    chipC = Math.min(W, H) * 0.13;
    chipBrainScale = chipC * 0.85;

    const pn = 6, pl = chipC * 0.32;
    const S2 = Math.SQRT1_2;

    paths = [];
    nodes = [];

    // 1. GENERATE INTENSE CIRCUIT BRAIN INSIDE CHIP DIE CORE
    const Bw = chipC * 1.6;
    const bp = (u, v) => [cx - u * Bw / 2, cy + (v - 0.1) * Bw / 2];
    const poly = smoothClosed(BRAIN_PTS, 12).map(p => bp(p[0], p[1]));
    const inside = (x, y) => pointInPoly(poly, x, y);
    const core = bp(-0.22, 0.30);

    const dirs = [];
    for (let k = 0; k < 8; k++) {
      dirs.push([Math.cos(k * Math.PI / 4), Math.sin(k * Math.PI / 4)]);
    }

    const nb = 18, per = 3;
    for (let b = 0; b < nb; b++) {
      const T = poly[Math.floor(((b + R(0.1, 0.9)) / nb) * poly.length) % poly.length];
      let sx0 = core[0] + R(-0.12, 0.12) * Bw * 0.5;
      let sy0 = core[1] + R(-0.08, 0.08) * Bw * 0.5;
      if (!inside(sx0, sy0)) continue;

      for (let j = 0; j < per; j++) {
        let x = sx0, y = sy0;
        const ang0 = Math.atan2(T[1] - y, T[0] - x);
        const di = ((Math.round(ang0 / (Math.PI / 4)) % 8) + 8) % 8;
        const perp = dirs[(di + 2) % 8], off = (j - (per - 1) / 2) * 3 * scale;
        x += perp[0] * off;
        y += perp[1] * off;
        if (!inside(x, y)) continue;

        const pts = [[x, y]];
        for (let s = 0; s < 15; s++) {
          const a = Math.atan2(T[1] - y, T[0] - x);
          const want = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
          const len = R(8, 20) * scale;
          let dir = want;
          let nx = x + dirs[dir][0] * len, ny = y + dirs[dir][1] * len;
          if (!inside(nx, ny)) {
            pts.push([nx, ny]);
            break;
          }
          x = nx;
          y = ny;
          pts.push([x, y]);
        }
        if (pts.length >= 2) paths.push(pts);
      }
    }

    // 2. RADIAL OUTWARD TRACES FROM CHIP PINS IN 8 DIRECTIONS
    const sides = [
      { dir: [0, -1], p: [1, 0] }, // Top
      { dir: [0, 1], p: [1, 0] },  // Bottom
      { dir: [-1, 0], p: [0, 1] }, // Left
      { dir: [1, 0], p: [0, 1] }   // Right
    ];

    sides.forEach(sd => {
      for (let i = 0; i < pn; i++) {
        const off = -chipC + (chipC * 2) * (i + 0.5) / pn;
        const sgn = off > 0 ? 1 : -1;

        const brainX = cx + (sd.p[0] * off * 0.4);
        const brainY = cy + (sd.p[1] * off * 0.4);
        const pinTipX = cx + sd.dir[0] * (chipC + pl) + sd.p[0] * off;
        const pinTipY = cy + sd.dir[1] * (chipC + pl) + sd.p[1] * off;

        const pts = [[brainX, brainY], [pinTipX, pinTipY]];

        let x = pinTipX, y = pinTipY;
        const step1 = R(25, 70) * scale;
        x += sd.dir[0] * step1;
        y += sd.dir[1] * step1;
        pts.push([x, y]);

        const diagX = sd.dir[0] === 0 ? sgn : sd.dir[0];
        const diagY = sd.dir[1] === 0 ? (i % 2 === 0 ? -1 : 1) : sd.dir[1];
        const step2 = R(50, 140) * scale;
        x += diagX * S2 * step2;
        y += diagY * S2 * step2;
        pts.push([x, y]);

        const step3 = R(120, 320) * scale;
        x += diagX * step3;
        pts.push([x, y]);

        paths.push(pts);
        nodes.push([pinTipX, pinTipY, 2.4, true]);
        nodes.push([x, y, R(2.2, 3.8), true]);
      }
    });

    // 4 Corner Diagonals (45-degree Angled Radiations)
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(corner => {
      for (let k = 0; k < 5; k++) {
        const startX = cx + corner[0] * (chipC + pl * 0.5);
        const startY = cy + corner[1] * (chipC + pl * 0.5);
        const offset = (k - 2) * 14 * scale;

        let x = startX + corner[1] * offset;
        let y = startY - corner[0] * offset;
        const pts = [[cx, cy], [x, y]];

        const seg1 = R(70, 180) * scale;
        x += corner[0] * S2 * seg1;
        y += corner[1] * S2 * seg1;
        pts.push([x, y]);

        const seg2 = R(90, 240) * scale;
        x += (rand() < 0.5 ? corner[0] : 0) * seg2;
        y += (rand() < 0.5 ? corner[1] : 0) * seg2;
        pts.push([x, y]);

        paths.push(pts);
        nodes.push([x, y, R(2.5, 4.0), true]);
      }
    });

    // Precompute path lengths
    paths = paths.map(pts => {
      const cum = [0];
      for (let i = 1; i < pts.length; i++) {
        cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      }
      return { pts, cum, len: cum[cum.length - 1] };
    });

    if (activeTracesEl) activeTracesEl.innerText = paths.length;

    // 3 MINIMAL FLOATING COLUMNS (Binary, Geometry/Math, Programming Code)
    cols = [];
    const top = cy + chipC * 2.3;
    const lh = 18;
    const nrows = 4;

    if (H - top > 60) {
      cols.push({
        x: W * 0.18, top, lh, span: nrows * lh, off: 0, speed: 18, size: 12, a: 0.35,
        rows: [BINARY_SNIPPETS[0], BINARY_SNIPPETS[1], BINARY_SNIPPETS[2], BINARY_SNIPPETS[3]]
      });

      cols.push({
        x: cx - 60, top, lh, span: nrows * lh, off: 12, speed: 14, size: 13, a: 0.45,
        rows: [MATH_FORMULAS[0], MATH_FORMULAS[1], MATH_FORMULAS[2], MATH_FORMULAS[3]]
      });

      cols.push({
        x: W * 0.72, top, lh, span: nrows * lh, off: 24, speed: 16, size: 12, a: 0.38,
        rows: [CODE_SNIPPETS[0], CODE_SNIPPETS[1], CODE_SNIPPETS[2], CODE_SNIPPETS[3]]
      });
    }

    // STATIC BACKGROUND LAYER
    staticLayer = document.createElement('canvas');
    staticLayer.width = canvas.width;
    staticLayer.height = canvas.height;
    const s = staticLayer.getContext('2d');
    s.setTransform(dpr, 0, 0, dpr, 0, 0);

    s.fillStyle = '#010307';
    s.fillRect(0, 0, W, H);
    const g = s.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.65);
    g.addColorStop(0, 'rgba(12,50,115,0.30)');
    g.addColorStop(0.4, 'rgba(5,20,50,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    s.fillStyle = g;
    s.fillRect(0, 0, W, H);

    s.lineJoin = 'round';
    s.lineCap = 'round';
    paths.forEach((p, idx) => {
      s.beginPath();
      s.moveTo(p.pts[0][0], p.pts[0][1]);
      for (let i = 1; i < p.pts.length; i++) s.lineTo(p.pts[i][0], p.pts[i][1]);
      s.strokeStyle = `rgba(40,135,235,${CFG.lineAlpha * (0.6 + (idx % 5) * 0.12)})`;
      s.lineWidth = 1;
      s.stroke();
    });

    nodes.forEach(n => {
      if (n[3]) {
        s.beginPath();
        s.arc(n[0], n[1], n[2], 0, Math.PI * 2);
        s.strokeStyle = 'rgba(80,185,255,0.55)';
        s.lineWidth = 1;
        s.stroke();
        s.beginPath();
        s.arc(n[0], n[1], n[2] * 0.4, 0, Math.PI * 2);
        s.fillStyle = 'rgba(160,225,255,0.65)';
        s.fill();
      } else {
        s.beginPath();
        s.arc(n[0], n[1], 1.4, 0, Math.PI * 2);
        s.fillStyle = 'rgba(80,170,255,0.4)';
        s.fill();
      }
    });

    // MICROPROCESSOR CHIP & DETAILED SILICON BRAIN CORE
    const c = chipC;
    const cg = s.createRadialGradient(cx, cy, 0, cx, cy, c * 2.8);
    cg.addColorStop(0, 'rgba(20,70,140,0.16)');
    cg.addColorStop(1, 'rgba(0,20,60,0)');
    s.fillStyle = cg;
    s.fillRect(cx - c * 3, cy - c * 3, c * 6, c * 6);

    // Pins
    s.strokeStyle = 'rgba(100,195,255,0.75)';
    s.lineWidth = 1.4;
    s.lineCap = 'butt';
    s.beginPath();
    for (let i = 0; i < pn; i++) {
      const off = -c + (c * 2) * (i + 0.5) / pn;
      s.moveTo(cx + off, cy - c);
      s.lineTo(cx + off, cy - c - pl);
      s.moveTo(cx + off, cy + c);
      s.lineTo(cx + off, cy + c + pl);
      s.moveTo(cx - c, cy + off);
      s.lineTo(cx - c - pl, cy + off);
      s.moveTo(cx + c, cy + off);
      s.lineTo(cx + c + pl, cy + off);
    }
    s.stroke();

    // Body
    s.fillStyle = 'rgba(4, 20, 52, 0.95)';
    s.fillRect(cx - c, cy - c, c * 2, c * 2);
    s.strokeStyle = 'rgba(120,210,255,0.85)';
    s.lineWidth = 1.6;
    s.strokeRect(cx - c, cy - c, c * 2, c * 2);

    // Die Frame
    const d = c * 0.84;
    s.fillStyle = 'rgba(10, 50, 130, 0.35)';
    s.fillRect(cx - d, cy - d, d * 2, d * 2);
    s.strokeStyle = 'rgba(100,190,255,0.55)';
    s.lineWidth = 1;
    s.strokeRect(cx - d, cy - d, d * 2, d * 2);

    // STATIC DETAILED CIRCUIT BRAIN SILHOUETTE
    const bb = chipBrainScale;
    withBrainIcon(s, cx, cy, bb, () => {
      iconOutline(s);
      s.fillStyle = 'rgba(30, 110, 230, 0.28)';
      s.fill();
      s.strokeStyle = 'rgba(150, 220, 255, 0.9)';
      s.lineWidth = 1.5 / bb;
      s.stroke();
      s.beginPath();
      FOLDS.forEach(f => foldPath(s, f));
      s.strokeStyle = 'rgba(110, 195, 255, 0.55)';
      s.lineWidth = 1.1 / bb;
      s.stroke();
    });

    const v = s.createRadialGradient(cx, cy, Math.min(W, H) * 0.35, cx, cy, Math.max(W, H) * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0.18)');
    v.addColorStop(1, 'rgba(0,0,0,0.92)');
    s.fillStyle = v;
    s.fillRect(0, 0, W, H);

    pulses = [];
    const n = Math.round(paths.length * CFG.pulseDensity);
    for (let i = 0; i < n; i++) pulses.push(newPulse(true));

    function newPulse(initial) {
      const p = Math.floor(Math.random() * paths.length);
      return {
        p,
        d: initial ? -Math.random() * paths[p].len * 1.2 : -Math.random() * 60,
        v: CFG.speedMin + Math.random() * (CFG.speedMax - CFG.speedMin),
        tail: 45 + Math.random() * 80,
        a: 0.6 + Math.random() * 0.4
      };
    }
    build.newPulse = () => newPulse(false);
  }

  function pointAt(path, d) {
    if (d <= 0) return path.pts[0];
    if (d >= path.len) return path.pts[path.pts.length - 1];
    let i = 1;
    while (path.cum[i] < d) i++;
    const t = (d - path.cum[i - 1]) / (path.cum[i] - path.cum[i - 1]);
    const a = path.pts[i - 1], b = path.pts[i];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  // DRAW ANIMATION
  function draw(dt) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(staticLayer, 0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    const effectiveDt = dt * CFG.speedMult;

    for (let i = 0; i < pulses.length; i++) {
      const u = pulses[i];
      u.d += u.v * effectiveDt;
      const path = paths[u.p];
      if (!path) continue;
      if (u.d - u.tail > path.len) {
        pulses[i] = build.newPulse();
        continue;
      }
      if (u.d < 0) continue;

      const start = Math.max(0, u.d - u.tail), end = Math.min(path.len, u.d);
      const steps = 10;
      let prev = pointAt(path, start);

      for (let k = 1; k <= steps; k++) {
        const pt = pointAt(path, start + (end - start) * k / steps);
        const f = k / steps;
        ctx.beginPath();
        ctx.moveTo(prev[0], prev[1]);
        ctx.lineTo(pt[0], pt[1]);
        ctx.strokeStyle = `rgba(90,165,225,${f * f * CFG.pulseAlpha * u.a})`;
        ctx.lineWidth = 1.0 + f * 1.1;
        ctx.stroke();
        prev = pt;
      }

      if (u.d <= path.len) {
        const h = pointAt(path, u.d);
        const gr = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], 8);
        gr.addColorStop(0, `rgba(180,225,255,${0.50 * u.a * CFG.pulseAlpha})`);
        gr.addColorStop(1, 'rgba(40,120,220,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(h[0], h[1], 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tm = performance.now() / 1000;

    // DYNAMIC CORE PULSING BRAIN IN DIE
    if (chipC > 0) {
      const beat = 0.5 + 0.5 * Math.sin(tm * 1.8);
      const hg = ctx.createRadialGradient(chipCx, chipCy, 0, chipCx, chipCy, chipC * 2.2);
      hg.addColorStop(0, `rgba(90,180,255,${0.14 + beat * 0.18})`);
      hg.addColorStop(1, 'rgba(0,60,160,0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(chipCx, chipCy, chipC * 2.2, 0, Math.PI * 2);
      ctx.fill();

      const bb = chipBrainScale;
      withBrainIcon(ctx, chipCx, chipCy, bb, () => {
        iconOutline(ctx);
        ctx.fillStyle = `rgba(80,170,255,${0.06 + beat * 0.14})`;
        ctx.fill();
        FOLDS.forEach((f, k) => {
          const a = 0.15 + 0.85 * Math.max(0, Math.sin(tm * 2.0 - k * 0.7));
          ctx.beginPath();
          foldPath(ctx, f);
          ctx.strokeStyle = `rgba(175,235,255,${a * 0.85})`;
          ctx.lineWidth = 1.6 / bb;
          ctx.lineCap = 'round';
          ctx.stroke();
        });
      });
    }

    // FLOATING STREAMS
    if (cols.length && CFG.showStreams) {
      ctx.textBaseline = 'top';
      const codeDt = dt * CFG.codeSpeedMult;

      cols.forEach((col, idx) => {
        col.off = (col.off + col.speed * codeDt) % col.span;
        ctx.font = `${col.size}px "Fira Code", monospace`;

        for (let r = 0; r < col.rows.length; r++) {
          const y = col.top + ((r * col.lh + col.off) % col.span);
          const fade = Math.sin(Math.PI * (y - col.top) / col.span);

          if (idx === 0) {
            ctx.fillStyle = `rgba(70,160,200,${col.a * fade * 0.65})`; // Binary
          } else if (idx === 1) {
            ctx.fillStyle = `rgba(140,120,200,${col.a * fade * 0.75})`; // Math
          } else {
            ctx.fillStyle = `rgba(80,140,200,${col.a * fade * 0.65})`; // Code
          }

          ctx.fillText(col.rows[r], col.x, y);
        }
      });
    }

    // Node Twinkle
    nodes.forEach((n, i) => {
      if (!n[3]) return;
      const tw = 0.5 + 0.5 * Math.sin(tm * 1.4 + i * 1.8);
      ctx.beginPath();
      ctx.arc(n[0], n[1], n[2] + 1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100,195,255,${0.05 + tw * 0.22})`;
      ctx.fill();
    });
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;

    frameCount++;
    if (ts - fpsTimer >= 1000) {
      if (fpsCounter) fpsCounter.innerText = frameCount;
      frameCount = 0;
      fpsTimer = ts;
    }

    draw(dt);
    requestAnimationFrame(loop);
  }

  build();
  if (reduceMotion) {
    draw(0);
  } else {
    requestAnimationFrame(loop);
  }

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      build();
      if (reduceMotion) draw(0);
    }, 150);
  });

  // UI EVENT HANDLERS
  if (speedSlider) {
    speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      CFG.speedMult = val;
      if (speedVal) speedVal.innerText = val.toFixed(1) + 'x';
    });
  }

  if (codeSpeedSlider) {
    codeSpeedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      CFG.codeSpeedMult = val;
      if (codeSpeedVal) codeSpeedVal.innerText = val.toFixed(1) + 'x';
    });
  }

  if (glowSlider) {
    glowSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      CFG.pulseAlpha = val;
      if (glowVal) glowVal.innerText = val.toFixed(2);
    });
  }

  if (streamToggle) {
    streamToggle.addEventListener('change', (e) => {
      CFG.showStreams = e.target.checked;
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      CFG.speedMult = 1.0;
      CFG.codeSpeedMult = 1.0;
      CFG.pulseAlpha = 0.75;
      CFG.showStreams = true;
      if (speedSlider) {
        speedSlider.value = 1.0;
        if (speedVal) speedVal.innerText = '1.0x';
      }
      if (codeSpeedSlider) {
        codeSpeedSlider.value = 1.0;
        if (codeSpeedVal) codeSpeedVal.innerText = '1.0x';
      }
      if (glowSlider) {
        glowSlider.value = 0.75;
        if (glowVal) glowVal.innerText = '0.75';
      }
      if (streamToggle) streamToggle.checked = true;
      build();
    });
  }

  let uiVisible = true;
  if (btnToggleUI && controlPanel) {
    btnToggleUI.addEventListener('click', () => {
      uiVisible = !uiVisible;
      controlPanel.style.transform = uiVisible ? 'translateY(0)' : 'translateY(120%)';
      controlPanel.style.opacity = uiVisible ? '1' : '0';
    });
  }
})();

// ---------- Page UI & Navigation Interactions ----------
(() => {
  // Intersection Observer for scroll animations
  const revealItems = document.querySelectorAll('[data-reveal]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(el => el.classList.add('visible'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealItems.forEach(el => io.observe(el));
  }

  // Active navigation link highlighting
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.nav-links a').forEach(item => item.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // Mobile menu drawer toggle
  const nav = document.querySelector('.nav');
  const mobileToggleBtn = document.querySelector('.mobile-toggle');
  const menuLinks = document.querySelector('.nav-links');
  if (nav && mobileToggleBtn && menuLinks) {
    const setMenu = (open) => {
      nav.classList.toggle('is-open', open);
      mobileToggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobileToggleBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    mobileToggleBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      setMenu(!nav.classList.contains('is-open'));
    });

    menuLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenu(false));
    });

    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target)) setMenu(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMenu(false);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1120) setMenu(false);
    });
  }

  // ========================================================
  // 3D CYLINDER COVERFLOW & HOLOGRAPHIC GALLERY ENGINE
  // ========================================================
  (() => {
    const viewport = document.getElementById('ab-viewport');
    const track = document.getElementById('ab-track');
    const cards = Array.from(document.querySelectorAll('.ab-card'));
    const prevBtn = document.getElementById('ab-prev');
    const nextBtn = document.getElementById('ab-next');
    const counter = document.getElementById('ab-counter');
    const titleEl = document.getElementById('ab-active-title');
    const tagEl = document.getElementById('ab-active-tag');
    const paginationContainer = document.getElementById('ab-pagination');

    // Modal elements
    const modal = document.getElementById('gallery-modal');
    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalTag = document.getElementById('modal-tag');
    const modalClose = document.getElementById('modal-close');
    const modalBackdrop = document.getElementById('modal-backdrop');

    if (!viewport || !track || !cards.length) return;

    const total = cards.length;
    let activeIndex = 3; // Focus on FB_IMG_1794075079623.jpg
    let currentX = 0;
    let targetX = 0;
    let isDragging = false;
    let startX = 0;
    let dragStartX = 0;
    let moved = false;
    let animFrame = null;
    let autoPlayTimer = null;
    let isHovered = false;

    // Mouse tilt tracking
    let mouseTiltX = 0;
    let mouseTiltY = 0;

    // Build pagination dots
    if (paginationContainer) {
      paginationContainer.innerHTML = '';
      cards.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = `ab-dot ${i === activeIndex ? 'active' : ''}`;
        dot.setAttribute('type', 'button');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => {
          snapToIndex(i);
        });
        paginationContainer.appendChild(dot);
      });
    }

    function updatePagination() {
      if (!paginationContainer) return;
      const dots = paginationContainer.querySelectorAll('.ab-dot');
      dots.forEach((dot, i) => {
        if (i === activeIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }

    function getCardCenter(index) {
      const card = cards[index];
      if (!card) return 0;
      return card.offsetLeft + card.offsetWidth / 2;
    }

    function snapToIndex(idx, immediate = false) {
      activeIndex = Math.max(0, Math.min(total - 1, idx));
      const vpW = viewport.offsetWidth;
      const cardCenter = getCardCenter(activeIndex);
      targetX = cardCenter - vpW / 2;
      if (immediate) currentX = targetX;
      updateDisplayInfo();
      updatePagination();
    }

    function cardTitle(card) {
      return card.querySelector('h4')?.textContent?.trim()
        || card.getAttribute('data-title')
        || 'Featured Work';
    }

    function cardTag(card) {
      return card.querySelector('.ab-badge')?.textContent?.trim()
        || card.getAttribute('data-tag')
        || 'Visual Project';
    }

    function updateDisplayInfo() {
      if (counter) {
        counter.innerText = `${String(activeIndex + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      }
      const activeCard = cards[activeIndex];
      if (activeCard) {
        if (titleEl) titleEl.innerText = cardTitle(activeCard);
        if (tagEl) tagEl.innerText = cardTag(activeCard);
      }
    }

    // Modal Handlers
    function openModal(imgSrc, title, tag) {
      if (!modal) return;
      if (modalImg) modalImg.src = imgSrc;
      if (modalTitle) modalTitle.innerText = title;
      if (modalTag) modalTag.innerText = tag;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // 3D Cylinder Coverflow Animation Loop
    function render() {
      const diff = targetX - currentX;
      currentX += diff * 0.085;

      track.style.transform = `translate3d(${-currentX}px, 0, 0)`;

      const vpW = viewport.offsetWidth;
      const vpCenter = vpW / 2;
      let closestIdx = activeIndex;
      let minDistance = Infinity;

      cards.forEach((card, i) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distFromCenter = cardCenter - currentX - vpCenter;
        const absDist = Math.abs(distFromCenter);

        if (absDist < minDistance) {
          minDistance = absDist;
          closestIdx = i;
        }

        const ratio = distFromCenter / (card.offsetWidth * 0.85);
        const clampedRatio = Math.max(-2.5, Math.min(2.5, ratio));

        // 3D Cylinder / Coverflow geometry calculations
        let rotateY = 0;
        let translateZ = 0;
        let scale = 1;
        let opacity = 1;
        let blurPx = 0;
        let brightness = 1;

        if (Math.abs(clampedRatio) < 0.25) {
          // Center Active Card: elevated in true 3D space with responsive mouse holographic tilt
          translateZ = 120 * (1 - Math.abs(clampedRatio) * 4);
          scale = 1.06 - Math.abs(clampedRatio) * 0.22;
          rotateY = -clampedRatio * 25 + mouseTiltX * 12;
          const rotateX = mouseTiltY * 8;
          opacity = 1;
          blurPx = 0;
          brightness = 1.05;
          card.style.transform = `perspective(1400px) translate3d(0, 0, ${translateZ}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(${scale})`;
        } else {
          // Flanking Cards: Inward 3D Cylinder rotation & deep push into Z-space
          const dir = clampedRatio > 0 ? 1 : -1;
          const dist = Math.abs(clampedRatio);
          rotateY = -dir * Math.min(46, 32 + (dist - 1) * 9);
          translateZ = -Math.min(230, dist * 80);
          scale = Math.max(0.74, 1 - dist * 0.16);
          opacity = Math.max(0.35, 1 - dist * 0.35);
          blurPx = Math.min(3, (dist - 0.2) * 1.8);
          brightness = Math.max(0.48, 1 - dist * 0.28);
          card.style.transform = `perspective(1400px) translate3d(0, 0, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
        }

        card.style.opacity = opacity;
        card.style.filter = blurPx > 0.3 ? `blur(${blurPx}px) brightness(${brightness})` : `brightness(${brightness})`;

        if (i === activeIndex) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });

      if (isDragging && closestIdx !== activeIndex) {
        activeIndex = closestIdx;
        updateDisplayInfo();
        updatePagination();
      }

      animFrame = requestAnimationFrame(render);
    }

    // Pointer Drag & Hover Tilt Handling
    viewport.addEventListener('pointerenter', () => { isHovered = true; });
    viewport.addEventListener('pointerleave', () => {
      isHovered = false;
      mouseTiltX = 0;
      mouseTiltY = 0;
    });

    viewport.addEventListener('pointermove', (e) => {
      if (isDragging) {
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 4) moved = true;
        targetX = dragStartX - dx * 1.35;
      } else {
        const rect = viewport.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        mouseTiltX = nx;
        mouseTiltY = -ny;
      }
    });

    viewport.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a')) return;
      isDragging = true;
      moved = false;
      startX = e.clientX;
      dragStartX = targetX;
      viewport.setPointerCapture(e.pointerId);
    });

    function settleToNearest() {
      isDragging = false;
      const vpW = viewport.offsetWidth;
      const vpCenter = vpW / 2;
      let bestIdx = 0;
      let minD = Infinity;
      cards.forEach((card, i) => {
        const cCenter = card.offsetLeft + card.offsetWidth / 2;
        const d = Math.abs(cCenter - currentX - vpCenter);
        if (d < minD) {
          minD = d;
          bestIdx = i;
        }
      });
      snapToIndex(bestIdx);
    }

    function handlePointerUp() {
      if (!isDragging) return;
      settleToNearest();
    }

    viewport.addEventListener('pointerup', handlePointerUp);
    viewport.addEventListener('pointercancel', handlePointerUp);

    // Card Click Selection & Expand Modal
    cards.forEach((card, i) => {
      card.addEventListener('click', () => {
        if (!moved) {
          if (i === activeIndex) {
            const img = card.querySelector('img');
            if (img) openModal(img.src, cardTitle(card), cardTag(card));
          } else {
            snapToIndex(i);
          }
        }
      });

      const expandBtn = card.querySelector('.ab-expand-btn');
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const img = card.querySelector('img');
          if (img) openModal(img.src, cardTitle(card), cardTag(card));
        });
      }
    });

    // Arrow Buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const next = (activeIndex - 1 + total) % total;
        snapToIndex(next);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const next = (activeIndex + 1) % total;
        snapToIndex(next);
      });
    }

    // Wheel Scroll with smooth inertia
    viewport.addEventListener('wheel', (e) => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = horizontal ? e.deltaX : e.deltaY;
      if (!horizontal && !e.shiftKey) return;
      if (Math.abs(delta) > 8) {
        e.preventDefault();
        targetX += delta * 0.95;
        clearTimeout(viewport._wheelSnapTimer);
        viewport._wheelSnapTimer = setTimeout(settleToNearest, 150);
      }
    }, { passive: false });

    // Auto Play every 4 seconds when not interacting
    function startAutoPlay() {
      stopAutoPlay();
      autoPlayTimer = setInterval(() => {
        if (!isHovered && !isDragging && (!modal || !modal.classList.contains('open'))) {
          const next = (activeIndex + 1) % total;
          snapToIndex(next);
        }
      }, 4000);
    }

    function stopAutoPlay() {
      if (autoPlayTimer) clearInterval(autoPlayTimer);
    }

    startAutoPlay();

    // Window Resize Recenter
    window.addEventListener('resize', () => {
      snapToIndex(activeIndex, true);
    });

    // Initialize with primary center focus on index 3 (=FB_IMG_1794075079623.jpg)
    setTimeout(() => {
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
      snapToIndex(3, true);
      render();
    }, 120);
  })();
})();
