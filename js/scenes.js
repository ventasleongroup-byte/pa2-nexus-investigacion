// Escenas holográficas 3D del encabezado (una por página). Un solo canvas WebGL compartido.
import * as THREE from '../vendor/three.module.min.js';

const CY = 0x65d9df, AM = 0xe9b96e, BL = 0x3c6eff;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeBack = (t) => { t = clamp(t, 0, 1); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/* ---------- Materiales y utilidades ---------- */
const lineMat = (c, o = 1) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
const fillMat = (c, o = 0.06) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
const edges = (geo, c = CY, o = 1) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat(c, o));
const seg = (pts, c = CY, o = 1) => new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat(c, o));
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
let GLOW;
const points = (arr, size, c, o = 1) => { const g = new THREE.BufferGeometry().setFromPoints(arr); return new THREE.Points(g, new THREE.PointsMaterial({ color: c, size, map: GLOW, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })); };
function labelSprite(text, c = '#bff6fa') {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const x = cv.getContext('2d');
  x.font = '600 38px Inter, Arial, sans-serif'; x.textAlign = 'center'; x.fillStyle = c; x.shadowColor = '#65d9df'; x.shadowBlur = 12; x.fillText(text, 256, 60);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
  s.scale.set(2.2, 0.41, 1); return s;
}
const circle = (r, n = 40, c = CY, o = 1) => { const p = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2; p.push(V(Math.cos(a) * r, Math.sin(a) * r), V(Math.cos(b) * r, Math.sin(b) * r)); } return seg(p, c, o); };
const box = (w, h, d, c = CY, o = 1) => { const g = new THREE.BoxGeometry(w, h, d); const gr = new THREE.Group(); gr.add(edges(g, c, o)); gr.add(new THREE.Mesh(g, fillMat(c, 0.05))); return gr; };
const rect = (w, h, c = CY, o = 1) => { const g = new THREE.PlaneGeometry(w, h); const gr = new THREE.Group(); gr.add(edges(g, c, o)); gr.add(new THREE.Mesh(g, fillMat(c, 0.05))); return gr; };

/* ---------- Campo de estrellas (constelación reactiva) ---------- */
class Stars {
  constructor(n, spread, linkDist, color = CY) {
    this.n = n; this.base = []; this.cur = [];
    for (let i = 0; i < n; i++) { const p = V((Math.random() - 0.5) * spread.x, (Math.random() - 0.5) * spread.y, (Math.random() - 0.5) * spread.z - 1.5); this.base.push(p); this.cur.push(p.clone()); }
    this.pts = points(this.cur, 0.12, color, 0.85);
    this.pairs = []; const m = Math.min(n, 90);
    for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) if (this.base[i].distanceTo(this.base[j]) < linkDist) this.pairs.push([i, j]);
    this.lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(this.pairs.flatMap(([i, j]) => [this.base[i], this.base[j]])), lineMat(color, 0.2));
    this.group = new THREE.Group(); this.group.add(this.pts, this.lines); this.react = 0;
  }
  update(t, env) {
    const k = this.react, rad = 2.4;
    for (let i = 0; i < this.n; i++) {
      const b = this.base[i], c = this.cur[i];
      let tx = b.x + Math.sin(t * 0.3 + i) * 0.12, ty = b.y + Math.cos(t * 0.27 + i * 1.7) * 0.12, tz = b.z;
      const dx = tx - env.pw.x, dy = ty - env.pw.y, d = Math.hypot(dx, dy);
      if (k > 0 && d < rad) { const f = (1 - d / rad) * k; tx += (dx / (d || 1)) * f * 0.9; ty += (dy / (d || 1)) * f * 0.9; tz += f * 1.2; }
      c.x += (tx - c.x) * 0.08; c.y += (ty - c.y) * 0.08; c.z += (tz - c.z) * 0.08;
    }
    const pa = this.pts.geometry.attributes.position; this.cur.forEach((p, i) => pa.setXYZ(i, p.x, p.y, p.z)); pa.needsUpdate = true;
    const la = this.lines.geometry.attributes.position; this.pairs.forEach(([i, j], q) => { la.setXYZ(q * 2, this.cur[i].x, this.cur[i].y, this.cur[i].z); la.setXYZ(q * 2 + 1, this.cur[j].x, this.cur[j].y, this.cur[j].z); }); la.needsUpdate = true;
  }
}

/* ---------- Objetos de inventario (wireframe holográfico) ---------- */
function makeTruck() {
  const g = new THREE.Group(); const body = box(1.0, 0.55, 0.5); body.position.set(-0.15, 0.1, 0); const cab = box(0.45, 0.4, 0.46); cab.position.set(0.58, 0.02, 0);
  g.add(body, cab); [-0.45, 0.2, 0.65].forEach((x) => { const w = circle(0.13, 18, AM, 0.9); w.position.set(x, -0.28, 0.27); g.add(w); }); return g;
}
function makeShelf() {
  const g = new THREE.Group(); [-0.55, 0.55].forEach((x) => g.add(seg([V(x, -0.75, 0), V(x, 0.75, 0)])));
  [-0.55, -0.05, 0.45].forEach((y) => { g.add(seg([V(-0.55, y, 0), V(0.55, y, 0)])); [-0.3, 0.12].forEach((x) => { const b = box(0.34, 0.3, 0.3); b.position.set(x, y + 0.17, 0); g.add(b); }); }); return g;
}
function makeScanner() {
  const g = new THREE.Group(); const body = box(0.46, 0.85, 0.2); const scr = rect(0.34, 0.3, AM, 0.9); scr.position.set(0, 0.2, 0.11);
  g.add(body, scr); for (let i = 0; i < 6; i++) g.add(seg([V(-0.14 + (i % 3) * 0.14, -0.1 - Math.floor(i / 3) * 0.14, 0.11), V(-0.14 + (i % 3) * 0.14 + 0.06, -0.1 - Math.floor(i / 3) * 0.14, 0.11)])); return g;
}
function makePhone() {
  const g = new THREE.Group(); g.add(box(0.55, 1.0, 0.1)); const s = rect(0.45, 0.72, AM, 0.8); s.position.z = 0.06; g.add(s);
  [0.18, 0, -0.18].forEach((y) => g.add(seg([V(-0.16, y, 0.07), V(0.16, y, 0.07)], CY, 0.9))); return g;
}

/* ================= Escena 1 · Presentación ================= */
function scene1() {
  const g = new THREE.Group(); let t0 = 0;
  const core = new THREE.Group(); const cb = box(1.7, 1.3, 1.3, CY, 1); core.add(cb);
  const bars = new THREE.Group(); for (let i = 0; i < 17; i++) { const w = 0.018 + ((i * 7) % 3) * 0.018; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.62), fillMat(CY, 0.9)); m.position.set(-0.7 + i * 0.0875, 0.1, 0.66); bars.add(m); } core.add(bars);
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.05), fillMat(AM, 0.95)); scan.position.z = 0.67; core.add(scan);
  const band = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.3), fillMat(AM, 0.12)); band.position.z = 0.66; core.add(band);
  const tag = labelSprite('EXISTENCIAS · MYPE'); tag.scale.set(1.9, 0.36, 1); tag.position.set(0, -1.05, 0.7); core.add(tag);
  g.add(core);

  const defs = [
    { k: 'truck', mk: makeTruck, p: V(-3.0, 1.35, 0.2), l: 'Recepción' }, { k: 'shelf', mk: makeShelf, p: V(3.0, 1.5, -0.2), l: 'Existencias' },
    { k: 'scan', mk: makeScanner, p: V(3.0, -1.45, 0.3), l: 'Venta' }, { k: 'phone', mk: makePhone, p: V(-3.0, -1.4, 0), l: 'Registro digital' },
  ];
  const nodes = {}; defs.forEach((d) => { const n = new THREE.Group(); const m = d.mk(); n.add(m); const lb = labelSprite(d.l); lb.position.set(0, -0.95, 0); n.add(lb); n.position.copy(d.p); n.userData = { glow: 0, hover: 0, intro: 0, base: d.p.clone() }; nodes[d.k] = n; g.add(n); });
  const linkDefs = [['truck', 'core'], ['core', 'shelf'], ['shelf', 'scan'], ['scan', 'core'], ['core', 'phone'], ['truck', 'shelf'], ['phone', 'truck']];
  const pos = (k) => (k === 'core' ? V(0, 0, 0) : nodes[k].userData.base);
  const links = linkDefs.map(([a, b]) => { const l = seg([pos(a), pos(b)], CY, 0.0); g.add(l); return { a, b, l }; });

  const stars = new Stars(230, V(15, 8, 6), 1.5); g.add(stars.group);
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 7), fillMat(AM, 0.7)); sweep.position.set(-5, 0, 0.5); g.add(sweep);
  const pulseDot = points([V(0, 0, 0)], 0.35, AM, 1); pulseDot.visible = false; g.add(pulseDot);
  let pulse = null, nextPulse = 3.1;
  const paths = [['truck', 'core', 'shelf'], ['shelf', 'scan'], ['truck', 'core', 'phone'], ['scan', 'core', 'phone']];

  return {
    group: g, stars,
    enter() { t0 = -1; },
    update(t, dt, env) {
      if (t0 < 0) t0 = t; const e = t - t0; const root = e;
      // 0–0.7 s: la caja y su código se dibujan
      const sc = easeBack(root / 0.7); core.scale.setScalar(Math.max(0.001, sc)); bars.scale.y = ease((root - 0.1) / 0.5);
      core.rotation.y = Math.sin(t * 0.5) * 0.25 + env.px * 0.25; core.rotation.x = env.py * -0.12;
      scan.position.y = Math.sin(t * 1.6) * 0.5 + 0.1; band.position.y = scan.position.y;
      // 0.7–2.0 s: un barrido revela nodos y enlaces
      const sx = -4.2 + 8.4 * ease((e - 0.7) / 1.3); sweep.position.x = sx; sweep.visible = e > 0.7 && e < 2.2; sweep.material.opacity = 0.7 * (1 - clamp((e - 2.0) / 0.2, 0, 1));
      let hov = null, best = 0.34;
      for (const k in nodes) {
        const n = nodes[k], u = n.userData; u.intro = ease((sx - u.base.x + 0.4) / 0.8); n.visible = u.intro > 0.01;
        u.glow *= 0.94; const wp = n.getWorldPosition(new THREE.Vector3()).project(env.camera); const d = Math.hypot(wp.x - env.px, wp.y - env.py);
        if (e > 2 && d < best) { best = d; hov = k; }
      }
      for (const k in nodes) {
        const n = nodes[k], u = n.userData; u.hover += ((k === hov ? 1 : 0) - u.hover) * 0.12;
        const push = hov && k !== hov ? 0.18 : 0; const dirv = n.userData.base.clone().sub(nodes[hov ?? k].userData.base).normalize();
        n.position.copy(u.base).addScaledVector(dirv, push * (1 - u.hover)).addScaledVector(V(0, Math.sin(t * 0.8 + u.base.x) * 0.08, 0), 1);
        n.scale.setScalar(Math.max(0.001, u.intro) * (1 + 0.25 * u.glow + 0.32 * u.hover)); n.rotation.y = Math.sin(t * 0.6 + u.base.y) * 0.4 + u.hover * 0.6;
      }
      links.forEach((L) => { const ia = L.a === 'core' ? 1 : nodes[L.a].userData.intro, ib = L.b === 'core' ? 1 : nodes[L.b].userData.intro; L.l.material.opacity = 0.5 * Math.min(ia, ib) * (0.8 + 0.2 * Math.sin(t * 2 + ia)); });
      // pulsos ocasionales (después del arranque)
      if (e > nextPulse && !pulse) { const p = paths[Math.floor(Math.random() * paths.length)]; pulse = { p, i: 0, f: 0 }; pulseDot.visible = true; nextPulse = e + 2.6 + Math.random() * 1.4; }
      if (pulse) {
        pulse.f += dt * 0.9; const a = pos(pulse.p[pulse.i]), b = pos(pulse.p[pulse.i + 1]); const q = a.clone().lerp(b, clamp(pulse.f, 0, 1));
        pulseDot.geometry.setFromPoints([q]);
        if (pulse.f >= 1) { const arr = pulse.p[pulse.i + 1]; if (arr !== 'core') { nodes[arr].userData.glow = 1; nodes.phone.userData.glow = Math.max(nodes.phone.userData.glow, 1); } pulse.i++; pulse.f = 0; if (pulse.i >= pulse.p.length - 1) { pulse = null; pulseDot.visible = false; } }
      }
      stars.react += ((e > 2 ? 1 : 0) - stars.react) * 0.03;
    },
  };
}

/* ================= Escena 2 · Contenido académico (fichero en abanico) ================= */
function scene2() {
  const g = new THREE.Group(); let t0 = 0; const N = 7, cards = [];
  const pivot = new THREE.Group(); pivot.position.set(0, -1.9, 0); g.add(pivot); g.scale.setScalar(1.45);
  for (let i = 0; i < N; i++) {
    const holder = new THREE.Group(), c = new THREE.Group(); c.position.y = 1.15; holder.add(c);
    const fr = rect(1.35, 1.9, i % 2 ? CY : BL, 0.95); c.add(fr);
    const img = rect(1.0, 0.55, AM, 0.8); img.position.set(0, 0.55, 0.01); c.add(img);
    [0.1, -0.12, -0.34, -0.56].forEach((y, k) => { const l = seg([V(-0.5, y, 0.01), V(k === 3 ? 0.1 : 0.5, y, 0.01)], CY, 0.7); c.add(l); });
    holder.userData = { c, fr, hover: 0 }; pivot.add(holder); cards.push(holder);
  }
  const stars = new Stars(150, V(14, 8, 5), 1.4); g.add(stars.group);
  return { group: g, stars, enter() { t0 = -1; },
    update(t, dt, env) {
      if (t0 < 0) t0 = t; const e = t - t0;
      const pp = pivot.getWorldPosition(new THREE.Vector3()).project(env.camera); const ang = Math.atan2(env.px - pp.x, env.py - pp.y);
      cards.forEach((h, i) => {
        const open = ease((e - 0.15 - i * 0.08) / 0.9), target = (i - (N - 1) / 2) * 0.27;
        const hovered = e > 1.2 && Math.abs(ang - target) < 0.15 && env.py > pp.y; h.userData.hover += ((hovered ? 1 : 0) - h.userData.hover) * 0.14;
        h.rotation.z = -target * open + env.px * 0.03; h.userData.c.position.z = h.userData.hover * 0.55; h.userData.c.scale.setScalar(1 + h.userData.hover * 0.08);
        h.userData.fr.children[1].material.opacity = 0.05 + h.userData.hover * 0.18;
      });
      pivot.position.y = -1.9 + Math.sin(t * 0.8) * 0.05; g.rotation.y = env.px * 0.18; stars.react += ((e > 1.5 ? 1 : 0) - stars.react) * 0.03;
    } };
}

/* ================= Escena 3 · Aprendizaje colaborativo (hitos en línea de tiempo) ================= */
function scene3() {
  const g = new THREE.Group(); let t0 = 0;
  const xs = [-3.1, -1.05, 1.05, 3.1], ys = [0.3, -0.25, 0.3, -0.25];
  const mk = [() => { const r = rect(0.8, 0.7); r.add(seg([V(-0.4, 0.15, 0), V(0.4, 0.15, 0), V(-0.13, 0.35, 0), V(-0.13, -0.35, 0), V(0.13, 0.35, 0), V(0.13, -0.35, 0)])); return r; },
    () => { const r = box(0.7, 0.5, 0.12); const t = seg([V(0.35, 0.1, 0), V(0.6, 0.25, 0), V(0.6, 0.25, 0), V(0.6, -0.25, 0), V(0.6, -0.25, 0), V(0.35, -0.1, 0)], AM); r.add(t); return r; },
    () => { const r = rect(0.85, 0.55); r.add(seg([V(-0.2, -0.28, 0), V(-0.35, -0.5, 0), V(-0.35, -0.5, 0), V(-0.05, -0.28, 0)], AM)); return r; },
    () => { const a = rect(0.55, 0.75, AM); a.position.x = -0.3; const b = rect(0.55, 0.75, CY); b.position.x = 0.3; const r = new THREE.Group(); r.add(a, b); return r; }];
  const labels = ['Calendar', 'Meet', 'Chat', 'Bitácora'];
  const nodes = xs.map((x, i) => { const n = new THREE.Group(); n.add(mk[i]()); const lb = labelSprite(labels[i]); lb.scale.set(3, 0.56, 1); lb.position.y = -0.95; n.add(lb); n.position.set(x, ys[i], 0); n.userData = { lit: 0, hover: 0 }; g.add(n); return n; });
  const path = new THREE.CatmullRomCurve3(xs.map((x, i) => V(x, ys[i], 0))); const pts = path.getPoints(120);
  const lineBase = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(CY, 0.35)); g.add(lineBase);
  const lineLit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(AM, 0.95)); lineLit.geometry.setDrawRange(0, 0); g.add(lineLit);
  const dot = points([V(0, 0, 0)], 0.4, AM, 1); g.add(dot);
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array(30).fill(V())), lineMat(CY, 0.8)); g.add(arc);
  const stars = new Stars(150, V(14, 8, 5), 1.4); g.add(stars.group);
  return { group: g, stars, enter() { t0 = -1; },
    update(t, dt, env) {
      if (t0 < 0) t0 = t; const e = t - t0, loop = e > 3.6 ? ((e - 3.6) % 5) / 3.2 : e / 3.2, f = clamp(loop, 0, 1);
      lineLit.geometry.setDrawRange(0, Math.floor(f * 121)); dot.geometry.setFromPoints([path.getPoint(f)]); dot.visible = f < 1;
      let hov = -1, best = 0.3;
      nodes.forEach((n, i) => { n.userData.lit = i / 3 <= f ? 1 : 0; const wp = n.getWorldPosition(new THREE.Vector3()).project(env.camera); const d = Math.hypot(wp.x - env.px, wp.y - env.py); if (e > 3 && d < best) { best = d; hov = i; } });
      nodes.forEach((n, i) => { n.userData.hover += ((i === hov ? 1 : 0) - n.userData.hover) * 0.15; const s = 0.01 + Math.max(0, easeBack((e - i * 0.25) / 0.6)) * (0.9 + 0.1 * n.userData.lit + 0.3 * n.userData.hover); n.scale.setScalar(Math.max(0.001, s)); n.position.y = ys[i] + Math.sin(t * 0.9 + i) * 0.06; n.rotation.y = Math.sin(t * 0.7 + i) * 0.35 + n.userData.hover * 0.5; });
      if (hov >= 0 && hov < 3) { const a = nodes[hov].position, b = nodes[3].position; const c = V((a.x + b.x) / 2, 1.9, 0.6); const arr = new THREE.QuadraticBezierCurve3(a.clone(), c, b.clone()).getPoints(29); arc.geometry.setFromPoints(arr); arc.visible = true; } else arc.visible = false;
      g.rotation.y = env.px * 0.15; stars.react += ((e > 1.5 ? 1 : 0) - stars.react) * 0.03;
    } };
}

/* ================= Escena 4 · Conclusiones (trazos que convergen) ================= */
function scene4() {
  const g = new THREE.Group(); let t0 = 0; const ends = [V(2.6, 1.5, 0), V(2.6, 0.5, 0), V(2.6, -0.5, 0), V(2.6, -1.5, 0)];
  const strokes = []; const under = [];
  ends.forEach((E, i) => {
    for (let k = 0; k < 5; k++) {
      const s = V(-3.8 + Math.random() * 1.2, (Math.random() - 0.5) * 3.8, (Math.random() - 0.5));
      const curve = new THREE.QuadraticBezierCurve3(s, V(-0.8, (s.y + E.y) / 2 + (Math.random() - 0.5) * 1.6, 0.3), E.clone());
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)), lineMat(k % 2 ? CY : BL, 0.7)); line.geometry.setDrawRange(0, 0); g.add(line); strokes.push({ line, i, delay: i * 0.25 + k * 0.1 });
    }
    const d = points([E], 0.5, AM, 1); g.add(d);
    const u = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.04), fillMat(AM, 0.9)); u.position.set(E.x + 0.9, E.y - 0.22, 0); u.scale.x = 0.001; g.add(u); under.push({ u, h: 0, E });
  });
  const stars = new Stars(150, V(14, 8, 5), 1.4); g.add(stars.group);
  return { group: g, stars, enter() { t0 = -1; },
    update(t, dt, env) {
      if (t0 < 0) t0 = t; const e = t - t0;
      strokes.forEach((s) => { const f = ease((e - s.delay) / 1.6); s.line.geometry.setDrawRange(0, Math.floor(f * 61)); s.line.material.opacity = 0.55 + 0.25 * Math.sin(t * 1.4 + s.i); });
      under.forEach((x) => { const w =x.u.getWorldPosition(new THREE.Vector3()).project(env.camera); const near = e > 1.5 && Math.hypot(w.x - env.px, w.y - env.py) < 0.45 ? 1 : 0; x.h += (near - x.h) * 0.14; x.u.scale.x = Math.max(0.001, 0.15 + x.h * 0.85); x.u.position.x = x.E.x + 0.1 + x.u.scale.x * 0.8; });
      g.rotation.y = env.px * 0.15; stars.react += ((e > 1.5 ? 1 : 0) - stars.react) * 0.03;
    } };
}

/* ================= Escena 5 · Autoría (credenciales sobre cuadrícula Symbaloo) ================= */
function scene5() {
  const g = new THREE.Group(); let t0 = 0; const cards = [];
  const tiles = new THREE.Group(); tiles.position.z = -1.2; for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) { const t = rect(0.62, 0.62, (r + c) % 3 === 0 ? AM : (r + c) % 2 ? CY : BL, 0.3); t.position.set(-3.5 + c * 0.9, -1.8 + r * 0.9, 0); tiles.add(t); } g.add(tiles);
  [[-1.25, 0.85], [1.25, 0.85], [-1.25, -0.85], [1.25, -0.85]].forEach(([x, y], i) => {
    const c = new THREE.Group(); c.add(rect(2.2, 1.45, CY, 1)); const av = circle(0.3, 28, AM, 0.95); av.position.set(-0.6, 0.2, 0.01); c.add(av);
    c.add(seg([V(-0.6, -0.25, 0.01), V(-0.2, -0.25, 0.01), V(-0.2, 0.3, 0.01), V(0.8, 0.3, 0.01), V(-0.2, 0.05, 0.01), V(0.7, 0.05, 0.01), V(-0.2, -0.2, 0.01), V(0.55, -0.2, 0.01)], CY, 0.75));
    c.add(rect(0.7, 0.14, AM, 0.9)); c.children[c.children.length - 1].position.set(0.35, -0.55, 0.01);
    c.position.set(x, y, 0); c.userData = { hover: 0, x, y }; g.add(c); cards.push(c);
  });
  const stars = new Stars(150, V(14, 8, 5), 1.4); g.add(stars.group);
  return { group: g, stars, enter() { t0 = -1; },
    update(t, dt, env) {
      if (t0 < 0) t0 = t; const e = t - t0; let hov = -1, best = 0.38;
      cards.forEach((c, i) => { const wp = c.getWorldPosition(new THREE.Vector3()).project(env.camera); const d = Math.hypot(wp.x - env.px, wp.y - env.py); if (e > 1.4 && d < best) { best = d; hov = i; } });
      cards.forEach((c, i) => { const u = c.userData, a = ease((e - i * 0.18) / 0.7); u.hover += ((i === hov ? 1 : 0) - u.hover) * 0.14;
        c.scale.setScalar(Math.max(0.001, a) * (1 + u.hover * 0.08)); c.position.z = u.hover * 0.5; c.rotation.y = u.hover * clamp(env.px, -1, 1) * 0.45 + Math.sin(t * 0.6 + i) * 0.1; c.rotation.x = -u.hover * env.py * 0.25; c.position.y = u.y + Math.sin(t * 0.9 + i) * 0.04; });
      tiles.rotation.z = Math.sin(t * 0.2) * 0.03; g.rotation.y = env.px * 0.12; stars.react += ((e > 1.5 ? 1 : 0) - stars.react) * 0.03;
    } };
}

/* ================= Núcleo ================= */
let staticT = 10, renderer, camera, host, canvas, scenes = [], current = 1, running = false, visible = true, reduced = false, last = 0, tAcc = 0, staticDone = false;
const env = { px: 0, py: 0, pw: new THREE.Vector3(), camera: null };
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
let root;

function layout() {
  const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const wide = w > 900; root.position.set(wide ? 3.5 : 0, 0, 0); root.scale.setScalar(wide ? Math.min(0.92, w / 1300 + 0.16) : Math.max(0.5, w / 760));
  if (!wide) root.position.y = -0.8;
  if (reduced && scenes.length) { staticT += 1; render(staticT, 0.05); }
}
function frame(now) {
  if (!running) return; requestAnimationFrame(frame);
  if (!visible || document.hidden) { last = now; return; }
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; tAcc += dt;
  pointer.x += (pointer.tx - pointer.x) * 0.07; pointer.y += (pointer.ty - pointer.y) * 0.07; env.px = pointer.x; env.py = pointer.y;
  const dist = camera.position.z, hh = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
  env.pw.set((pointer.x * hh * camera.aspect - root.position.x) / root.scale.x, (pointer.y * hh - root.position.y) / root.scale.y, 0);
  render(tAcc, dt);
}
function render(t, dt) {
  const s = scenes[current - 1]; if (!s) return;
  try { s.update(t, dt, env); s.stars.update(t, env); } catch (err) { console.error('scene', current, err); }
  root.rotation.y = pointer.x * 0.12; root.rotation.x = -pointer.y * 0.06;
  renderer.render(three, camera);
}
let three;
export function initScene(cv, heroEl, opts = {}) {
  canvas = cv; host = heroEl; reduced = !!opts.reduced;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
  catch { canvas.style.display = 'none'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75)); renderer.setClearColor(0x000000, 0);
  three = new THREE.Scene(); camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60); camera.position.set(0, 0, 9); env.camera = camera;
  GLOW = glowTexture(); root = new THREE.Group(); three.add(root);
  scenes = [scene1(), scene2(), scene3(), scene4(), scene5()]; scenes.forEach((s) => { s.group.visible = false; root.add(s.group); });
  layout(); new ResizeObserver(layout).observe(host);
  new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0.02 }).observe(host);
  host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1; pointer.ty = -(((e.clientY - r.top) / r.height) * 2 - 1); });
  host.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; });
  setScene(current);
  if (reduced) { for (let i = 0; i < 4; i++) render(4 + i, 0.05); staticDone = true; } else { running = true; last = performance.now(); requestAnimationFrame(frame); }
}
export function setScene(n) {
  if (!scenes.length) { current = n; return; }
  scenes.forEach((s, i) => (s.group.visible = i === n - 1)); current = n; scenes[n - 1].enter(); tAcc = tAcc || 0;
  if (reduced) { for (let i = 0; i < 6; i++) render(tAcc + 4 + i, 0.05); }
}
