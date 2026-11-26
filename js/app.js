// Sitio de investigación PA2 — app principal (router, contenido, edición, checklist, tema)
import { initScene, setScene } from './scenes.js';
import { playTransition } from './transitions.js';
import * as C from './collab.js';

/* ================= Configuración ================= */
// Para la entrega final: abrir el sitio con ?final=1 (oculta checklist y botón editar),
// o poner CHECKLIST:false aquí y borrar el bloque <aside id="checklist"> del index.html.
const CONFIG = { CHECKLIST: true, EDIT_BUTTON: true, BUILD_DATE: '2026-11-25' };
const FINAL = new URLSearchParams(location.search).get('final') === '1';

const STUDENTS = [
  { n: 1, nombre: 'Lazo Llamoca, Natali Daniela' },
  { n: 2, nombre: 'León Sovero, Franluis Eduardo' },
  { n: 3, nombre: 'Vasquez Segura, Fabio' },
  { n: 4, nombre: 'Villegas Márquez, Marghiory Maricielo' },
];
const short = (s) => s.nombre.split(',')[1]?.trim().split(' ')[0] ?? `Integrante ${s.n}`;

const LICENSES = {
  'by': ['CC BY 4.0', 'Atribución 4.0 Internacional'],
  'by-sa': ['CC BY-SA 4.0', 'Atribución-CompartirIgual 4.0 Internacional'],
  'by-nc': ['CC BY-NC 4.0', 'Atribución-NoComercial 4.0 Internacional'],
  'by-nc-sa': ['CC BY-NC-SA 4.0', 'Atribución-NoComercial-CompartirIgual 4.0 Internacional'],
  'by-nd': ['CC BY-ND 4.0', 'Atribución-SinDerivadas 4.0 Internacional'],
  'by-nc-nd': ['CC BY-NC-ND 4.0', 'Atribución-NoComercial-SinDerivadas 4.0 Internacional'],
};

// Figura interactiva de la página 1 (Wikimedia Commons, CC BY 4.0)
const HOTSPOTS = [
  { x: 15, y: 16, es: 'Gestión de inventario', en: 'Inventory management', d: 'Control de las cantidades disponibles de cada producto y de sus movimientos de entrada y salida.' },
  { x: 62, y: 26, es: 'Recepción y almacenamiento', en: 'Receiving & put away', d: 'Registro de la mercadería que llega y asignación del lugar donde se guarda.' },
  { x: 82, y: 66, es: 'Wi-Fi y sistema de código de barras', en: 'Wi-Fi & barcode system', d: 'Lectura de códigos para identificar productos y actualizar el sistema mediante conexión inalámbrica.' },
  { x: 73, y: 88, es: 'Gestión de ubicaciones', en: 'Location management', d: 'Definición y consulta del lugar exacto en que se encuentra cada producto dentro del almacén.' },
  { x: 41, y: 85, es: 'Preparación y empaque', en: 'Picking & packing', d: 'Selección de los productos de un pedido y su embalaje para el despacho.' },
  { x: 23, y: 71, es: 'Gestión de reportes', en: 'Reporting management', d: 'Informes sobre existencias, movimientos y desempeño que apoyan la toma de decisiones.' },
];

const DEFAULTS = {
  'fig1.titulo': 'Características típicas de un sistema de gestión de almacenes',
  'fig1.fuente': 'Vatumalae, V., Rajagopal, P., & Veera Pandiyan, K. S. (2020). Typical features of a Warehouse Management System [Imagen]. Wikimedia Commons. CC BY 4.0.',
  'fig1.url': 'https://commons.wikimedia.org/wiki/File:Typical_features_of_a_Warehouse_Management_System.png',
  'license': 'by',
  'symbaloo.url': '',
};
STUDENTS.forEach((s) => (DEFAULTS[`s${s.n}.nombre`] = s.nombre));

const RANGES = { intro: [30, 70], cdir: [30, 84], cpar: [30, 70], analisis: [30, 70], bit: [14, 30], concl: [30, 56] };

/* ================= Store (documento compartido en tiempo real) ================= */
const DEV = ['127.0.0.1', 'localhost'].includes(location.hostname);
const ROOM = (() => {
  const m = location.hash.match(/sala=([A-Za-z0-9_-]{16,64})/);
  try { if (m) { localStorage.setItem('pa2.room', m[1]); return m[1]; } return localStorage.getItem('pa2.room') || ''; } catch { return m ? m[1] : ''; }
})();
const COLLAB = !!ROOM;           // con clave de sala: edición colaborativa. Sin clave: vista pública de solo lectura (content.json).
let base = {};                   // contenido final publicado (solo lectura)
C.setDefaults(DEFAULTS);
const get = (id) => (COLLAB ? C.getVal(id) : id in base ? base[id] : DEFAULTS[id] ?? '');
const set = (id, v) => { if (COLLAB) C.setVal(id, v); };
const updated = () => (COLLAB ? C.lastUpdate() : (base._u || '').slice(0, 10)) || CONFIG.BUILD_DATE;
const ME_KEY = 'pa2.me';
let ME = ''; try { ME = localStorage.getItem(ME_KEY) || ''; } catch {}

/* ================= Utilidades ================= */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wc = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;
const safeUrl = (u) => { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
const ytId = (u) => (u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1] || '';
function symbalooSrc(raw) {
  // Devuelve { src, embeddable }. Los enlaces /shared/ no se pueden incrustar (X-Frame-Options); solo el código «Insertar» (/embed/).
  let u = (raw || '').match(/src=["']([^"']+)["']/)?.[1] || (raw || '').trim();
  u = safeUrl(u);
  if (!u) return { src: '', embeddable: false };
  const x = new URL(u);
  if (!/(^|\.)symbaloo\.com$/.test(x.hostname)) return { src: '', embeddable: false };
  if (/^\/shared\//.test(x.pathname)) return { src: x.href, embeddable: false };
  x.pathname = x.pathname.replace(/^\/mix\//, '/embed/');
  return { src: x.href, embeddable: /^\/embed\//.test(x.pathname) };
}
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1b1200;color:#ffe6b3;padding:10px 16px;border-radius:10px;z-index:300;font:600 .85rem Inter,sans-serif;max-width:90vw;box-shadow:0 8px 30px rgba(0,0,0,.4)';
    document.body.appendChild(t); }
  t.textContent = msg; t.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => (t.style.display = 'none'), 4200);
}
async function fileToDataURL(file, max = 1280, q = 0.78) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return file.type === 'image/png' && max <= 512 ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', q);
}

/* ================= Constructores de HTML ================= */
const PENDING = (label) => `<div class="pending">Pendiente: <b>${esc(label)}</b></div>`;

function para(id, label, { hint = '', range = null, rows = 5 } = {}) {
  return `<div class="field" data-field="${id}">
    <label for="f-${id}">${esc(label)}</label>
    <div class="view-only" data-render="para" data-id="${id}" data-label="${esc(label)}"></div>
    <div class="edit-only">
      <textarea id="f-${id}" data-id="${id}" rows="${rows}" placeholder="Escribe aquí…">${esc(get(id))}</textarea>
      <div class="hint"><span>${esc(hint)}</span><span class="cnt" data-cnt="${id}" ${range ? `data-min="${range[0]}" data-max="${range[1]}"` : ''}></span></div>
    </div></div>`;
}
function line(id, label, { ph = '', type = 'text', hint = '' } = {}) {
  return `<div class="field"><label for="f-${id}">${esc(label)}</label>
    <input id="f-${id}" type="${type}" data-id="${id}" value="${esc(get(id))}" placeholder="${esc(ph)}">
    ${hint ? `<div class="hint"><span>${esc(hint)}</span></div>` : ''}</div>`;
}
function uploader(id, label) {
  return `<div class="field"><label>${esc(label)}</label><div class="uploader">
    <label class="btn" for="up-${id}">Subir imagen</label><input class="sr" id="up-${id}" type="file" accept="image/*" data-up="${id}">
    <button class="btn" type="button" data-clear="${id}">Quitar</button><span class="hint" data-upstate="${id}"></span></div></div>`;
}

/* ---------- Página 1 ---------- */
function page1() {
  const P = [
    ['p1', 'Párrafo 1 · Resumen de la problemática', 'Resumen corto y claro de la problemática investigada, en lenguaje académico.'],
    ['p2', 'Párrafo 2 · Importancia del tema', 'Por qué el tema es importante y justificación de investigarlo, con datos o razones.'],
    ['p3', 'Párrafo 3 · Estructura del sitio web', 'Qué subpáginas tiene el sitio y qué información se encuentra en cada una.'],
    ['p4', 'Párrafo 4 · Limitaciones de la investigación', 'Dificultades para reunir información, trabajar en equipo o aplicar encuestas, con sinceridad y reflexión.'],
  ];
  return `<section class="page" data-p="1" aria-labelledby="t1">
    <h2 id="t1">Presentación</h2><div class="rule"></div>
    <p class="lead">Problemática general: la gestión de inventarios y el uso de herramientas digitales en las micro y pequeñas empresas (MYPES).</p>
    <div class="card" id="logo-card"><h3>Logotipo del equipo</h3>
      <div class="view-only"><p class="lead" style="margin:0">El logotipo aparece en la barra superior.</p></div>
      <div class="edit-only">${uploader('logo', 'Logotipo (PNG con fondo transparente recomendado)')}</div></div>
    <div class="card"><h3>Figura interactiva</h3>
      <p class="lead" style="margin-bottom:10px">Toca o haz clic en los puntos numerados para explorar las funciones de un sistema de gestión de almacenes.</p>
      <div class="holo" id="holo"><div class="holo-card" id="holo-card"><div class="stage">
        <img src="assets/wms.png" alt="Diagrama circular con seis funciones de un sistema de gestión de almacenes: recepción, código de barras, ubicaciones, preparación de pedidos, reportes e inventario." width="841" height="395">
        <div class="beam"></div>
        ${HOTSPOTS.map((h, i) => `<button class="hot" data-hot="${i}" style="left:${h.x}%;top:${h.y}%" aria-pressed="false" aria-label="${esc(h.es)}">${i + 1}</button>`).join('')}
      </div></div></div>
      <div class="hotinfo" id="hotinfo" aria-live="polite"><small>Selecciona un punto de la figura.</small></div>
      <div class="fig"><div class="cap" data-render="fig1"></div></div>
      <div class="edit-only">${line('fig1.titulo', 'Título de la figura')}${line('fig1.fuente', 'Fuente (texto APA)')}${line('fig1.url', 'Enlace de la fuente', { type: 'url' })}</div>
    </div>
    ${P.map(([id, l, h]) => `<div class="card">${para(id, l, { hint: h, rows: 6 })}</div>`).join('')}
  </section>`;
}

/* ---------- Página 2 ---------- */
function studentBlock(s) {
  const k = `s${s.n}`;
  return `<article class="card student" id="stu-${s.n}" aria-labelledby="st-${s.n}">
    <div class="student-head"><h3 id="st-${s.n}">Subtema ${s.n}</h3><span class="tag">${esc(short(s))}</span></div>
    <div class="field"><div class="view-only" data-render="subtema" data-s="${s.n}"></div>
      <div class="edit-only">${line(`${k}.subtema`, 'Subtema (subtítulo)', { ph: 'Ej.: Clasificación ABC y control de existencias' })}</div></div>
    ${para(`${k}.intro`, 'Introducción al subtema', { hint: 'Con tus propias palabras, sin copiar · 3–5 líneas', range: RANGES.intro })}
    <h3 style="font-size:1rem">Cita directa (APA 7)</h3>
    <div class="view-only" data-render="cita" data-k="cd" data-s="${s.n}"></div>
    <div class="edit-only">
      <div class="grid2">${line(`${k}.cd.autor`, 'Autor(es) (ej.: Rivero Sánchez et al.)')}${line(`${k}.cd.anio`, 'Año')}</div>
      <div class="grid2">${line(`${k}.cd.pag`, 'Página (ej.: p. 17)')}${line(`${k}.cd.ref`, 'Referencia APA completa (para la lista de referencias)')}</div>
      ${para(`${k}.cd.texto`, 'Texto citado (sin comillas)', { hint: 'Cita corta o en bloque · 3–6 líneas', range: RANGES.cdir, rows: 4 })}
    </div>
    <h3 style="font-size:1rem">Cita parafraseada (APA 7)</h3>
    <div class="view-only" data-render="cita" data-k="cp" data-s="${s.n}"></div>
    <div class="edit-only">
      <div class="grid2">${line(`${k}.cp.autor`, 'Autor(es)')}${line(`${k}.cp.anio`, 'Año')}</div>
      <div class="grid2">${line(`${k}.cp.pag`, 'Página (opcional en paráfrasis)')}${line(`${k}.cp.ref`, 'Referencia APA completa (de una fuente distinta a la directa)')}</div>
      ${para(`${k}.cp.texto`, 'Texto parafraseado', { hint: '3–5 líneas', range: RANGES.cpar, rows: 4 })}
    </div>
    ${para(`${k}.analisis`, 'Análisis o reflexión final', { hint: 'Tu interpretación con tus propias palabras · 3–5 líneas', range: RANGES.analisis })}
    <h3 style="font-size:1rem">Imágenes y video</h3>
    ${[1, 2].map((i) => `<div class="fig" data-render="img" data-s="${s.n}" data-i="${i}"></div>
      <div class="edit-only">${uploader(`${k}.img${i}.file`, `Imagen ${i} (subir archivo)`)}${line(`${k}.img${i}.url`, `Imagen ${i} · o enlace directo a la imagen`, { type: 'url' })}
        ${line(`${k}.img${i}.titulo`, `Imagen ${i} · título`)}${line(`${k}.img${i}.fuente`, `Imagen ${i} · fuente (texto)`)}${line(`${k}.img${i}.fuenteurl`, `Imagen ${i} · enlace de la fuente`, { type: 'url' })}</div>`).join('')}
    <div class="fig" data-render="video" data-s="${s.n}"></div>
    <div class="edit-only">${line(`${k}.vid.url`, 'Video · enlace de YouTube', { type: 'url' })}${line(`${k}.vid.titulo`, 'Video · título')}${line(`${k}.vid.fuente`, 'Video · fuente (canal / autor)')}${line(`${k}.vid.fuenteurl`, 'Video · enlace de la fuente', { type: 'url' })}</div>
    <div class="field"><div class="view-only" data-render="autor" data-s="${s.n}"></div>
      <div class="edit-only">${line(`${k}.nombre`, 'Autor (apellidos y nombres)')}</div></div>
  </article>`;
}
const page2 = () => `<section class="page" data-p="2" aria-labelledby="t2">
  <h2 id="t2">Contenido académico</h2><div class="rule"></div>
  <p class="lead">Cada integrante desarrolla su subtema con citas de las fuentes trabajadas en la Unidad 2.</p>
  ${STUDENTS.map(studentBlock).join('')}
  <div class="card"><h3>Referencias</h3><ol class="refs" style="list-style:none;padding:0;margin:0" data-render="refs"></ol></div>
</section>`;

/* ---------- Página 3 ---------- */
const EVID = [['cal', 'Evento programado en Google Calendar'], ['meet', 'Sesión en Google Meet u otro similar (cámaras activadas)'], ['chat', 'Coordinaciones en chats'], ['otro', 'Otros medios utilizados por el equipo (opcional)']];
const page3 = () => `<section class="page" data-p="3" aria-labelledby="t3">
  <h2 id="t3">Aprendizaje colaborativo</h2><div class="rule"></div>
  <h3>Evidencias de gestión</h3>
  <div class="grid2">${EVID.map(([k, l], i) => `<div class="card"><div data-render="evid" data-k="${k}" data-l="${esc(l)}" data-i="${i + 1}"></div>
    <div class="edit-only">${uploader(`ev.${k}.file`, 'Captura (subir imagen)')}${line(`ev.${k}.pie`, 'Descripción breve (fecha, hora, qué se coordinó)')}</div></div>`).join('')}</div>
  <h3>Bitácora reflexiva</h3>
  <p class="lead">Cada integrante identifica un aspecto positivo y uno negativo del trabajo colaborativo (3–4 líneas en total).</p>
  ${STUDENTS.map((s) => `<div class="card"><div class="student-head"><h3 style="margin:0">${esc(s.nombre)}</h3></div>
    ${para(`s${s.n}.bit.pos`, 'Aspecto positivo', { hint: '1–2 líneas', range: RANGES.bit, rows: 3 })}
    ${para(`s${s.n}.bit.neg`, 'Aspecto negativo', { hint: '1–2 líneas', range: RANGES.bit, rows: 3 })}</div>`).join('')}
</section>`;

/* ---------- Página 4 ---------- */
const page4 = () => `<section class="page" data-p="4" aria-labelledby="t4">
  <h2 id="t4">Conclusiones</h2><div class="rule"></div>
  <p class="lead">Una conclusión académica por integrante, en tercera persona, que responde a la problemática de su subtema.</p>
  ${STUDENTS.map((s) => `<div class="card student"><div class="student-head"><h3 style="margin:0">${esc(s.nombre)}</h3><span class="tag" data-render="subtag" data-s="${s.n}"></span></div>
    ${para(`s${s.n}.concl`, 'Conclusión', { hint: 'Tercera persona · 3–4 líneas · sin errores ortográficos', range: RANGES.concl })}</div>`).join('')}
</section>`;

/* ---------- Página 5 ---------- */
const page5 = () => `<section class="page" data-p="5" aria-labelledby="t5">
  <h2 id="t5">Autoría</h2><div class="rule"></div>
  <h3>Perfil profesional</h3>
  <div class="grid2">${STUDENTS.map((s) => `<article class="card"><div data-render="perfil" data-s="${s.n}"></div>
    <div class="edit-only">${uploader(`s${s.n}.foto`, 'Fotografía formal (optimizada con IA, Gemini)')}${line(`s${s.n}.nombre`, 'Apellidos y nombres completos')}${line(`s${s.n}.carrera`, 'Carrera profesional')}${line(`s${s.n}.nacimiento`, 'Lugar de nacimiento')}</div></article>`).join('')}</div>
  <h3>Entorno Personal de Aprendizaje (PLE)</h3>
  <div class="card"><div data-render="symbaloo"></div>
    <div class="edit-only">${line('symbaloo.url', 'Enlace o código de inserción (iframe) de tu Symbaloo', { ph: 'https://www.symbaloo.com/mix/…', hint: 'Usa Compartir → Incrustar (Embed) en Symbaloo y pega el código iframe. Los enlaces «shared» no se pueden incrustar. Debe incluir la categoría «Producción académica».' })}
    <label style="display:flex;gap:8px;align-items:center;font-size:.9rem"><input type="checkbox" data-bool="symbaloo.cat" ${get('symbaloo.cat') === '1' ? 'checked' : ''}> Confirmo que existe la categoría «Producción académica»</label></div></div>
</section>`;

/* ================= Renderers de vista ================= */
function figureNumbers() {
  const order = ['fig1'];
  STUDENTS.forEach((s) => [1, 2].forEach((i) => order.push(`s${s.n}.img${i}`)));
  let n = 0; const map = {};
  order.forEach((key) => { const ok = key === 'fig1' || imgSrc(key); if (ok) map[key] = ++n; });
  return map;
}
const imgSrc = (key) => get(`${key}.file`) || safeUrl(get(`${key}.url`));
const link = (u, t) => (safeUrl(u) ? `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer">${esc(t || u)}</a>` : esc(t || ''));

const RENDER = {
  para(el) { const v = get(el.dataset.id).trim(); el.innerHTML = v ? `<p class="text-body" style="margin:0">${esc(v).replace(/\n+/g, '</p><p class="text-body">')}</p>` : PENDING(el.dataset.label); },
  fig1(el) {
    const t = get('fig1.titulo'), f = get('fig1.fuente'), u = get('fig1.url'), n = figureNumbers().fig1;
    el.innerHTML = `<span class="n">Figura ${n}</span><br><em>${esc(t)}</em><br><span style="display:block;margin-top:6px"><em>Nota.</em> Adaptado de ${esc(f)} ${link(u, u)}. Se agregaron puntos interactivos y una glosa en español de las etiquetas.</span>`;
  },
  subtema(el) { const v = get(`s${el.dataset.s}.subtema`).trim(); el.innerHTML = v ? `<h3 style="margin:8px 0 0;color:var(--accent)">${esc(v)}</h3>` : PENDING('Subtema (subtítulo)'); },
  subtag(el) { el.textContent = get(`s${el.dataset.s}.subtema`).trim() || 'Subtema pendiente'; },
  cita(el) {
    const k = `s${el.dataset.s}.${el.dataset.k}`, a = get(`${k}.autor`).trim(), y = get(`${k}.anio`).trim(), p = get(`${k}.pag`).trim(), t = get(`${k}.texto`).trim();
    if (!t) { el.innerHTML = PENDING(el.dataset.k === 'cd' ? 'Cita directa' : 'Cita parafraseada'); return; }
    const who = `<span class="red">${esc(a || 'Autor')} (${esc(y || 's. f.')}${p ? `, ${esc(p)}` : ''})</span>`;
    el.innerHTML = el.dataset.k === 'cd'
      ? `<div class="quote text-body">${who}: <span class="blue">“${esc(t)}”</span></div>`
      : `<div class="quote text-body">${who} <span class="blue">${esc(t)}</span></div>`;
  },
  img(el) {
    const key = `s${el.dataset.s}.img${el.dataset.i}`, src = imgSrc(key);
    if (!src) { el.innerHTML = PENDING(`Imagen ${el.dataset.i} del subtema ${el.dataset.s}`); return; }
    const n = figureNumbers()[key];
    el.innerHTML = `<div class="cap" style="margin:0 0 6px"><span class="n">Figura ${n}</span><br><em>${esc(get(`${key}.titulo`) || 'Título pendiente')}</em></div>
      <img src="${esc(src)}" alt="${esc(get(`${key}.titulo`) || 'Imagen del subtema')}" loading="lazy">
      <div class="cap"><em>Nota.</em> ${esc(get(`${key}.fuente`) || 'Fuente pendiente')}. ${link(get(`${key}.fuenteurl`), get(`${key}.fuenteurl`))}</div>`;
  },
  video(el) {
    const k = `s${el.dataset.s}.vid`, id = ytId(get(`${k}.url`));
    if (!id) { el.innerHTML = PENDING(`Video del subtema ${el.dataset.s}`); return; }
    el.innerHTML = `<div class="cap" style="margin:0 0 6px"><span class="n">Video</span><br><em>${esc(get(`${k}.titulo`) || 'Título pendiente')}</em></div>
      <div class="ytwrap"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(get(`${k}.titulo`) || 'Video')}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <div class="cap"><em>Nota.</em> ${esc(get(`${k}.fuente`) || 'Fuente pendiente')}. ${link(get(`${k}.fuenteurl`) || get(`${k}.url`), get(`${k}.fuenteurl`) || get(`${k}.url`))}</div>`;
  },
  autor(el) { el.innerHTML = `<p class="lead" style="margin:6px 0 0"><b>Autor:</b> ${esc(get(`s${el.dataset.s}.nombre`))}</p>`; },
  refs(el) {
    const refs = STUDENTS.flatMap((s) => ['cd', 'cp'].map((k) => get(`s${s.n}.${k}.ref`).trim())).filter(Boolean);
    const uniq = [...new Set(refs)].sort((a, b) => a.localeCompare(b, 'es'));
    el.innerHTML = uniq.length ? uniq.map((r) => `<li>${esc(r)}</li>`).join('') : `<li>${PENDING('Las referencias aparecen aquí al completar las citas')}</li>`;
  },
  evid(el) {
    const k = el.dataset.k, src = get(`ev.${k}.file`);
    el.innerHTML = `<h3 style="margin:0 0 8px;font-size:1rem">${esc(el.dataset.l)}</h3>` + (src
      ? `<div class="fig"><img src="${esc(src)}" alt="${esc(el.dataset.l)}" loading="lazy"><div class="cap"><span class="n">Evidencia ${el.dataset.i}.</span> ${esc(get(`ev.${k}.pie`))}</div></div>`
      : PENDING('Captura de pantalla'));
  },
  perfil(el) {
    const k = `s${el.dataset.s}`, foto = get(`${k}.foto.file`);
    el.innerHTML = `<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
      <div style="width:112px;height:140px;border-radius:12px;overflow:hidden;border:1px solid var(--line);flex:none;background:var(--bg);display:grid;place-items:center;color:var(--muted);font-size:.7rem;text-align:center">${foto ? `<img src="${esc(foto)}" alt="Fotografía de ${esc(get(`${k}.nombre`))}" style="width:100%;height:100%;object-fit:cover">` : 'Foto pendiente'}</div>
      <div style="min-width:0;flex:1"><h3 style="margin:0 0 6px;font-size:1.05rem">${esc(get(`${k}.nombre`))}</h3>
      <p style="margin:0"><b>Carrera:</b> ${esc(get(`${k}.carrera`)) || '<span class="tag todo">pendiente</span>'}</p>
      <p style="margin:0"><b>Lugar de nacimiento:</b> ${esc(get(`${k}.nacimiento`)) || '<span class="tag todo">pendiente</span>'}</p></div></div>`;
  },
  symbaloo(el) {
    const { src, embeddable } = symbalooSrc(get('symbaloo.url'));
    if (!src) { el.innerHTML = PENDING('PLE de Symbaloo (código de inserción)'); return; }
    el.innerHTML = embeddable
      ? `<div style="aspect-ratio:16/10;border-radius:10px;overflow:hidden;border:1px solid var(--line)"><iframe src="${esc(src)}" title="Entorno Personal de Aprendizaje en Symbaloo" style="width:100%;height:100%;border:0" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe></div>
         <p class="lead" style="margin:8px 0 0;font-size:.85rem">Si el recuadro no se muestra, abre el PLE directamente: ${link(src, src)}</p>`
      : `<div class="pending"><b>Este enlace no se puede incrustar.</b> Symbaloo bloquea los enlaces «compartidos». En Symbaloo abre tu webmix → Compartir → <b>Incrustar (Embed)</b> y pega aquí el código completo.<br><a class="btn pri" style="margin-top:10px" href="${esc(src)}" target="_blank" rel="noopener noreferrer">Abrir el PLE en Symbaloo</a></div>`;
  },
};
function refreshViews() { document.querySelectorAll('[data-render]').forEach((el) => RENDER[el.dataset.render]?.(el)); refreshCounters(); }

/* ================= Contadores ================= */
function refreshCounters() {
  document.querySelectorAll('[data-cnt]').forEach((c) => {
    const w = wc(get(c.dataset.cnt)), min = +c.dataset.min, max = +c.dataset.max;
    if (!min) { c.textContent = `${w} palabras`; return; }
    const ok = w >= min && w <= max;
    c.className = `cnt ${w === 0 ? '' : ok ? 'ok' : 'bad'}`;
    c.textContent = `${w} palabras (≈${Math.max(0, Math.round(w / 12))} líneas) · meta ${min}–${max}`;
  });
}

/* ================= Checklist (derivado del contenido) ================= */
const has = (id) => get(id).trim().length > 0;
const inRange = (id, [a, b]) => { const w = wc(get(id)); return w >= a && w <= b; };
function buildChecklist() {
  const L = [];
  const add = (page, group, label, done, go, manual) => L.push({ page, group, label, done, go, manual });
  add(1, 'Presentación', 'Logotipo del equipo', () => has('logo.file'), 'logo-card');
  add(1, 'Presentación', 'Figura interactiva con título y fuente con enlace', () => has('fig1.titulo') && has('fig1.fuente') && !!safeUrl(get('fig1.url')), 'holo');
  [['p1', 'Párrafo 1 · Resumen de la problemática'], ['p2', 'Párrafo 2 · Importancia del tema'], ['p3', 'Párrafo 3 · Estructura del sitio'], ['p4', 'Párrafo 4 · Limitaciones']]
    .forEach(([id, l]) => add(1, 'Presentación', l, () => wc(get(id)) >= 25, `f-${id}`));
  add(1, 'Presentación', 'Licencia Creative Commons y fecha en el pie', () => !!get('license'), 'site-footer');
  STUDENTS.forEach((s) => {
    const k = `s${s.n}`, g = `Contenido · ${short(s)}`;
    add(2, g, 'Subtema (subtítulo) y datos del autor', () => has(`${k}.subtema`) && has(`${k}.nombre`), `stu-${s.n}`);
    add(2, g, 'Introducción (3–5 líneas)', () => inRange(`${k}.intro`, RANGES.intro), `stu-${s.n}`);
    add(2, g, 'Cita directa APA 7 (3–6 líneas)', () => ['autor', 'anio', 'pag', 'ref'].every((x) => has(`${k}.cd.${x}`)) && inRange(`${k}.cd.texto`, RANGES.cdir), `stu-${s.n}`);
    add(2, g, 'Cita parafraseada APA 7 (fuente distinta)', () => ['autor', 'anio', 'ref'].every((x) => has(`${k}.cp.${x}`)) && inRange(`${k}.cp.texto`, RANGES.cpar) && get(`${k}.cp.ref`).trim() !== get(`${k}.cd.ref`).trim(), `stu-${s.n}`);
    add(2, g, 'Análisis o reflexión final (3–5 líneas)', () => inRange(`${k}.analisis`, RANGES.analisis), `stu-${s.n}`);
    add(2, g, '2 imágenes con título y fuente con enlace', () => [1, 2].every((i) => imgSrc(`${k}.img${i}`) && has(`${k}.img${i}.titulo`) && has(`${k}.img${i}.fuente`) && safeUrl(get(`${k}.img${i}.fuenteurl`))), `stu-${s.n}`);
    add(2, g, '1 video con título y fuente con enlace', () => !!ytId(get(`${k}.vid.url`)) && has(`${k}.vid.titulo`) && has(`${k}.vid.fuente`) && !!safeUrl(get(`${k}.vid.fuenteurl`) || get(`${k}.vid.url`)), `stu-${s.n}`);
  });
  [['cal', 'Captura de Google Calendar'], ['meet', 'Captura de Meet con cámaras activadas'], ['chat', 'Captura de coordinaciones en chat']].forEach(([k, l]) => add(3, 'Evidencias', l, () => has(`ev.${k}.file`), 'main'));
  STUDENTS.forEach((s) => add(3, 'Bitácora reflexiva', `${short(s)}: positivo y negativo`, () => inRange(`s${s.n}.bit.pos`, RANGES.bit) && inRange(`s${s.n}.bit.neg`, RANGES.bit), 'main'));
  STUDENTS.forEach((s) => add(4, 'Conclusiones', `${short(s)}: conclusión (3–4 líneas)`, () => inRange(`s${s.n}.concl`, RANGES.concl), 'main'));
  STUDENTS.forEach((s) => add(5, 'Autoría', `${short(s)}: foto, carrera y lugar de nacimiento`, () => has(`s${s.n}.foto.file`) && has(`s${s.n}.carrera`) && has(`s${s.n}.nacimiento`), 'main'));
  add(5, 'Autoría', 'Symbaloo (PLE) incrustado con iframe', () => symbalooSrc(get('symbaloo.url')).embeddable, 'main');
  add(5, 'Autoría', 'Categoría «Producción académica» confirmada', () => get('symbaloo.cat') === '1', 'main', 'symbaloo.cat');
  add(0, 'Antes de entregar', 'Probar el enlace público desde otra cuenta o ventana', () => get('chk.publico') === '1', 'main', 'chk.publico');
  add(0, 'Antes de entregar', 'Revisar que enlaces, videos e incrustaciones funcionen', () => get('chk.enlaces') === '1', 'main', 'chk.enlaces');
  add(0, 'Antes de entregar', 'Revisar ortografía y formato APA 7', () => get('chk.apa') === '1', 'main', 'chk.apa');
  return L;
}
const ITEMS = buildChecklist();
function renderChecklist() {
  const el = document.getElementById('checklist'); if (!el) return;
  const res = ITEMS.map((i) => ({ ...i, ok: !!i.done() }));
  const done = res.filter((r) => r.ok).length, pct = Math.round((done / res.length) * 100);
  const groups = [...new Set(res.map((r) => r.group))];
  const wasOpen = [...el.querySelectorAll('details[open]')].map((d) => d.dataset.g);
  const first = !el.dataset.init; el.dataset.init = '1';
  el.innerHTML = `<header><h4><span>Checklist del equipo</span><span>${done}/${res.length}</span></h4>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div></header>
    ${groups.map((g) => { const r = res.filter((x) => x.group === g), d = r.filter((x) => x.ok).length;
      const open = first ? d < r.length && groups.indexOf(g) < 2 : wasOpen.includes(g);
      return `<section><details data-g="${esc(g)}" ${open ? 'open' : ''}><summary style="cursor:pointer;list-style:none"><h5 style="display:inline">${esc(g)} · ${d}/${r.length}</h5></summary>
      ${r.map((x) => `<button class="it ${x.ok ? 'done' : ''}" data-page="${x.page}" data-go="${x.go}" ${x.manual ? `data-manual="${x.manual}"` : ''} role="${x.manual ? 'checkbox' : 'link'}" ${x.manual ? `aria-checked="${x.ok}"` : ''}><span class="box">✓</span><span>${esc(x.label)}</span></button>`).join('')}</details></section>`; }).join('')}
    <footer>Los puntos se marcan solos al completar cada campo. Este checklist se elimina antes de la entrega (abre el sitio con <b>?final=1</b>).</footer>`;
}

/* ================= Footer ================= */
function renderFooter() {
  const key = get('license') || 'by', [code, name] = LICENSES[key] || LICENSES.by;
  const url = `https://creativecommons.org/licenses/${key}/4.0/deed.es`;
  document.getElementById('site-footer').innerHTML = `
    <a href="${url}" target="_blank" rel="noopener noreferrer"><img src="https://mirrors.creativecommons.org/presskit/buttons/88x31/svg/${key}.svg" alt="${esc(code)}" height="31"></a>
    <span>Este sitio web está bajo una licencia <a href="${url}" target="_blank" rel="noopener noreferrer">${esc(code)} · ${esc(name)}</a>.<br>Última actualización: <time datetime="${updated()}">${new Date(updated() + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</time></span>
    <span class="edit-only" style="margin-left:auto;display:${document.body.classList.contains('editing') ? 'block' : 'none'}"><label for="f-license" style="font-size:.78rem">Licencia </label><select id="f-license" data-id="license" style="width:auto">${Object.entries(LICENSES).map(([k, v]) => `<option value="${k}" ${k === key ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></span>`;
}

/* ================= Router ================= */
const TITLES = {
  1: ['Página 1 · Presentación', 'Producto Académico 2 · Estrategias y Herramientas Digitales para el Aprendizaje'],
  2: ['Página 2 · Contenido académico', 'Subtemas desarrollados por cada integrante con citas APA 7'],
  3: ['Página 3 · Aprendizaje colaborativo', 'Evidencias de gestión y bitácora reflexiva del equipo'],
  4: ['Página 4 · Conclusiones', 'Una síntesis académica por integrante'],
  5: ['Página 5 · Autoría', 'Perfil profesional del equipo y Entorno Personal de Aprendizaje'],
};
let current = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function show(n) {
  document.querySelectorAll('.page').forEach((p) => p.classList.toggle('active', +p.dataset.p === n));
  document.querySelectorAll('.nav a.link').forEach((a, i) => (i + 1 === n ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.body.dataset.page = n;
  document.getElementById('kicker').textContent = TITLES[n][0];
  document.getElementById('hero-sub').textContent = TITLES[n][1];
  setScene(n);
  document.title = `${TITLES[n][0].replace('Página ', 'P')} — Gestión de inventarios y herramientas digitales en las MYPES`;
  window.scrollTo({ top: 0 });
  current = n;
}
async function route() {
  const n = Math.min(5, Math.max(1, parseInt((location.hash.match(/#\/(\d)/) || [])[1] || '1', 10)));
  if (n === current) return;
  document.getElementById('nav').classList.remove('open');
  if (current && !reduced) await playTransition(current, n, () => show(n));
  else show(n);
}

/* ================= Eventos ================= */
function init() {
  document.getElementById('pages').innerHTML = page1() + page2() + page3() + page4() + page5();
  if (FINAL || !CONFIG.CHECKLIST || (!COLLAB && !DEV)) document.body.classList.add('no-checklist');
  if (FINAL || !CONFIG.EDIT_BUTTON || !COLLAB) { document.getElementById('btn-edit').style.display = 'none'; }
  refreshViews(); renderChecklist(); renderFooter(); applyLogo();

  const pages = document.getElementById('pages');
  const onField = (e) => {
    const t = e.target;
    if (t.dataset.id) { set(t.dataset.id, t.value); }
    else if (t.dataset.bool) { set(t.dataset.bool, t.checked ? '1' : ''); }
    else return;
    refreshViews(); renderChecklist(); renderFooter();
  };
  pages.addEventListener('input', onField); pages.addEventListener('change', onField);
  document.getElementById('site-footer').addEventListener('change', onField);

  document.addEventListener('change', async (e) => {
    const id = e.target.dataset?.up; if (!id || !e.target.files[0]) return;
    try {
      const small = id === 'logo' || id.endsWith('.foto');
      set(id.endsWith('.file') ? id : `${id}.file`, await fileToDataURL(e.target.files[0], id === 'logo' ? 384 : small ? 600 : 1280));
      toast('Imagen cargada y compartida con el equipo.');
    } catch { toast('No se pudo leer esa imagen. Prueba con un JPG o PNG.'); }
    e.target.value = ''; refreshViews(); renderChecklist(); applyLogo();
  });
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-clear]'); if (!c) return;
    const id = c.dataset.clear; set(id.endsWith('.file') ? id : `${id}.file`, ''); refreshViews(); renderChecklist(); applyLogo();
  });

  // Checklist
  document.getElementById('checklist').addEventListener('click', (e) => {
    const b = e.target.closest('button.it'); if (!b) return;
    if (b.dataset.manual) { set(b.dataset.manual, get(b.dataset.manual) === '1' ? '' : '1'); renderChecklist(); refreshViews(); return; }
    const p = +b.dataset.page; if (p && p !== current) location.hash = `#/${p}`;
    setTimeout(() => (document.getElementById(b.dataset.go) || document.getElementById('main')).scrollIntoView({ behavior: 'smooth', block: 'center' }), p && p !== current ? 1700 : 50);
  });
  const clToggle = document.getElementById('cl-toggle'), cl = document.getElementById('checklist');
  clToggle.addEventListener('click', () => { const c = cl.classList.toggle('closed'); clToggle.setAttribute('aria-expanded', String(!c)); });
  if (matchMedia('(max-width:1279px)').matches) { cl.classList.add('closed'); clToggle.setAttribute('aria-expanded', 'false'); }

  // Tema
  const th = document.getElementById('btn-theme');
  const syncTheme = () => { document.getElementById('theme-lbl').textContent = document.documentElement.dataset.theme === 'dark' ? 'Claro' : 'Oscuro'; };
  th.addEventListener('click', () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('pa2.theme', n); } catch {} syncTheme(); });
  syncTheme();

  // Edición
  const eb = document.getElementById('btn-edit');
  eb.addEventListener('click', () => { const on = document.body.classList.toggle('editing'); eb.setAttribute('aria-pressed', String(on)); document.querySelectorAll('footer.site .edit-only').forEach((x) => (x.style.display = on ? 'block' : 'none')); });
  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version: 2, exported: new Date().toISOString(), fields: C.exportFlat() })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `aportes_equipo_${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Descarga lista: incluye textos y fotos de todo el equipo.');
  });
  document.getElementById('file-import').addEventListener('change', async (e) => {
    try { C.importFlat((JSON.parse(await e.target.files[0].text())).fields); toast('Aportes importados y compartidos con el equipo.'); }
    catch { toast('Ese archivo no es un aporte válido.'); }
    e.target.value = ''; syncInputs(); refreshViews(); renderChecklist(); renderFooter(); applyLogo();
  });
  document.getElementById('btn-share').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#sala=${ROOM}`;
    try { await navigator.clipboard.writeText(url); toast('Enlace del equipo copiado. Quien lo abra podrá editar.'); } catch { prompt('Copia este enlace:', url); }
  });

  // Menú móvil
  const bg = document.getElementById('burger');
  bg.addEventListener('click', () => { const o = document.getElementById('nav').classList.toggle('open'); bg.setAttribute('aria-expanded', String(o)); });

  // Figura holográfica
  const card = document.getElementById('holo-card'), holo = document.getElementById('holo');
  if (card && !reduced) {
    holo.addEventListener('pointermove', (e) => { const r = holo.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; card.style.transform = `rotateY(${x * 9}deg) rotateX(${-y * 7}deg)`; });
    holo.addEventListener('pointerleave', () => (card.style.transform = ''));
  }
  const info = document.getElementById('hotinfo');
  document.querySelectorAll('.hot').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.hot').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const h = HOTSPOTS[+b.dataset.hot]; info.innerHTML = `<b>${+b.dataset.hot + 1}. ${esc(h.es)}</b><small>${esc(h.en)}</small><p style="margin:6px 0 0">${esc(h.d)}</p>`;
  }));

  if (COLLAB) wireCollab();
  window.addEventListener('hashchange', route);
  initScene(document.getElementById('scene'), document.getElementById('hero'), { reduced });
  const start = Math.min(5, Math.max(1, parseInt((location.hash.match(/#\/(\d)/) || [])[1] || '1', 10)));
  show(start);
  if (COLLAB) { eb.click(); if (!ME) askWho(); }
}
function applyLogo() {
  const el = document.getElementById('brand-logo'), src = get('logo.file');
  el.innerHTML = src ? `<img src="${esc(src)}" alt="Logotipo del equipo Nexus">` : 'LOGO';
}

function syncInputs() {
  document.querySelectorAll('#pages [data-id], #site-footer [data-id]').forEach((el) => {
    const v = get(el.dataset.id); if (el.value === v) return;
    if (el === document.activeElement && el.setSelectionRange) {
      const old = el.value; let a = 0; while (a < old.length && a < v.length && old[a] === v[a]) a++;
      let b = 0; while (b < old.length - a && b < v.length - a && old[old.length - 1 - b] === v[v.length - 1 - b]) b++;
      const m = (p) => (p <= a ? p : p >= old.length - b ? p + (v.length - old.length) : a);
      const s0 = el.selectionStart, e0 = el.selectionEnd; el.value = v; try { el.setSelectionRange(m(s0), m(e0)); } catch {}
    } else el.value = v;
  });
  document.querySelectorAll('[data-bool]').forEach((el) => { el.checked = get(el.dataset.bool) === '1'; });
}
function wireCollab() {
  const st = document.getElementById('sync-status'), pr = document.getElementById('presence');
  C.on('change', (origin) => { if (origin === 'remote' || origin === 'load') { syncInputs(); refreshViews(); renderChecklist(); renderFooter(); applyLogo(); } });
  C.on('status', ({ state, peers }) => {
    st.dataset.state = state === 'off' ? 'off' : peers ? 'live' : 'wait';
    st.textContent = state === 'off' ? 'Sin conexión: tus cambios quedan en este navegador' : peers ? `Sincronizado en tiempo real con ${peers} ${peers === 1 ? 'persona' : 'personas'}` : 'Buscando compañeros en línea… (tus cambios se guardan aquí y se fusionan al coincidir)';
  });
  C.on('presence', (list) => {
    const on = list.filter((p) => p.name);
    pr.textContent = on.length ? `● ${[ME || 'Tú', ...on.map((p) => p.name)].join(', ')}` : ME ? `● ${ME}` : '';
    document.querySelectorAll('.field[data-by]').forEach((f) => f.removeAttribute('data-by'));
    on.forEach((p) => { if (p.focus) document.querySelector(`[data-id="${CSS.escape(p.focus)}"]`)?.closest('.field')?.setAttribute('data-by', p.name); });
  });
  document.addEventListener('focusin', (e) => { const id = e.target.dataset?.id; if (id) C.setMe({ focus: id }); });
  document.addEventListener('focusout', (e) => { if (e.target.dataset?.id) C.setMe({ focus: '' }); });
  C.setMe({ name: ME || 'Invitado' });
}
function askWho() {
  const d = document.createElement('div'); d.className = 'who';
  d.innerHTML = `<div role="dialog" aria-modal="true" aria-labelledby="who-t"><h3 id="who-t">¿Quién eres?</h3><p>Así tus compañeros verán quién está editando cada campo.</p>
    ${STUDENTS.map((s) => `<button class="btn" data-n="${esc(short(s))}">${esc(short(s))}</button>`).join('')}<button class="btn" data-n="Invitado">Otra persona</button></div>`;
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; ME = b.dataset.n; try { localStorage.setItem(ME_KEY, ME); } catch {} C.setMe({ name: ME }); d.remove(); toast(`Hola, ${ME}. Todo lo que escribas se comparte en vivo.`); });
  document.body.appendChild(d);
}

(async () => {
  if (COLLAB) { await C.start(ROOM); }
  else { try { const r = await fetch('content.json', { cache: 'no-cache' }); if (r.ok) base = (await r.json()).fields || {}; } catch {} }
  init();
})();
