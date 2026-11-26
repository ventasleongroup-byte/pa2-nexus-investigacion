// Capa de colaboración en tiempo real: documento CRDT (Yjs) sincronizado entre navegadores (WebRTC, Trystero/Nostr).
// - Sin servidor propio ni base de datos externa. La clave de sala cifra la señalización y nunca se publica (solo su hash).
// - Cada navegador guarda una copia local (IndexedDB) y se vuelve a fusionar solo cuando coincide con otro integrante en línea.
import { Y, joinRoom } from '../vendor/collab.js';

const APP_ID = 'pa2-nexus-investigacion-2026';
export const doc = new Y.Doc();
const files = doc.getMap('files');     // imágenes (dataURL), checkboxes, licencia
const touched = doc.getMap('touched'); // campos con valor por defecto que alguien ya editó
const meta = doc.getMap('meta');
let DEFAULTS = {};
export const setDefaults = (d) => { DEFAULTS = d; };

const kindOf = (id) => (id.endsWith('.file') || id === 'license' || id === 'symbaloo.cat' || id.startsWith('chk.') ? 'map' : 'text');
const hasDefault = (id) => id in DEFAULTS;
let cache = new Map();
const listeners = { change: new Set(), status: new Set(), presence: new Set() };
export const on = (type, fn) => listeners[type].add(fn);
const emit = (type, ...a) => listeners[type].forEach((fn) => { try { fn(...a); } catch (e) { console.error(e); } });

/* ---------- Lectura / escritura ---------- */
export function getVal(id) {
  if (cache.has(id)) return cache.get(id);
  let v;
  if (kindOf(id) === 'map') v = files.has(id) ? files.get(id) : DEFAULTS[id] ?? '';
  else v = hasDefault(id) && !touched.has(id) ? DEFAULTS[id] : doc.getText(id).toString();
  cache.set(id, v);
  return v;
}
export function setVal(id, v) {
  doc.transact(() => {
    if (kindOf(id) === 'map') files.set(id, v);
    else {
      const t = doc.getText(id), old = hasDefault(id) && !touched.has(id) ? '' : t.toString();
      if (old !== v) {
        let a = 0; while (a < old.length && a < v.length && old[a] === v[a]) a++;
        let b = 0; while (b < old.length - a && b < v.length - a && old[old.length - 1 - b] === v[v.length - 1 - b]) b++;
        if (old.length - a - b > 0) t.delete(a, old.length - a - b);
        if (v.length - a - b > 0) t.insert(a, v.slice(a, v.length - b));
      }
    }
    if (hasDefault(id)) touched.set(id, 1);
    meta.set('u', new Date().toISOString());
  }, 'local');
}
export const lastUpdate = () => (meta.get('u') || '').slice(0, 10);

/* ---------- Exportar / importar (JSON plano con fotos incluidas) ---------- */
export function exportFlat() {
  const out = {};
  doc.share.forEach((_, name) => {
    if (['files', 'touched', 'meta'].includes(name)) return;
    const s = doc.getText(name).toString();
    if (s || touched.has(name)) out[name] = s;
  });
  files.forEach((v, k) => { out[k] = v; });
  out._u = meta.get('u') || '';
  return out;
}
export function importFlat(obj) {
  Object.entries(obj || {}).forEach(([k, v]) => { if (k !== '_u' && typeof v === 'string') setVal(k, v); });
}

/* ---------- Copia local (IndexedDB) ---------- */
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('pa2-collab', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idbGet = async (k) => { try { const d = await idb(); return await new Promise((r) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => r(q.result); q.onerror = () => r(undefined); }); } catch { return undefined; } };
const idbSet = async (k, v) => { try { const d = await idb(); await new Promise((r) => { const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = r; tx.onerror = r; }); } catch { /* modo privado: sin copia local */ } };

/* ---------- Red ---------- */
let room = null, dbKey = '', persistT = 0, sendUpd = null, sendPres = null, me = { name: 'Invitado', focus: '' };
const presence = new Map();
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
const peerCount = () => { try { return Object.keys(room?.getPeers() || {}).length; } catch { return 0; } };
const pushStatus = () => emit('status', { state: room ? 'on' : 'off', peers: peerCount() });
const pushPresence = () => { const now = Date.now(); presence.forEach((p, id) => { if (now - p.t > 30000) presence.delete(id); }); emit('presence', [...presence.values()]); };

doc.on('update', (u, origin) => {
  cache = new Map();
  clearTimeout(persistT);
  persistT = setTimeout(() => idbSet(dbKey, Y.encodeStateAsUpdate(doc)), 700);
  if (origin !== 'remote' && sendUpd) sendUpd.send(u).catch(() => {});
  emit('change', origin);
});

export async function start(roomKey) {
  const digest = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(roomKey)));
  dbKey = 'doc:' + digest.slice(0, 16);
  const saved = await idbGet(dbKey);
  if (saved) Y.applyUpdate(doc, saved, 'load');
  try {
    room = joinRoom({ appId: APP_ID, password: roomKey }, digest.slice(0, 24));
    sendUpd = room.makeAction('upd'); sendPres = room.makeAction('pres');
    sendUpd.onMessage((data) => { try { Y.applyUpdate(doc, data instanceof Uint8Array ? data : new Uint8Array(data), 'remote'); } catch (e) { console.error('update inválido', e); } });
    sendPres.onMessage((d, ctx) => { presence.set(ctx.peerId, { ...d, t: Date.now() }); pushPresence(); });
    room.onPeerJoin(({ peerId }) => {
      sendUpd.send(Y.encodeStateAsUpdate(doc), { target: peerId }).catch(() => {});
      sendPres.send(me, { target: peerId }).catch(() => {});
      pushStatus();
    });
    room.onPeerLeave(({ peerId }) => { presence.delete(peerId); pushStatus(); pushPresence(); });
    setInterval(() => { sendPres.send(me).catch(() => {}); pushStatus(); pushPresence(); }, 8000);
  } catch (e) { console.error('No se pudo abrir la sala', e); room = null; }
  pushStatus();
}
export function setMe(patch) {
  me = { ...me, ...patch };
  if (sendPres) sendPres.send(me).catch(() => {});
}
