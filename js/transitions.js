// Interludios holográficos entre páginas (SVG animado, tema: inventario)
const C = '#65d9df', A = '#e9b96e';
const glow = `<defs><filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<pattern id="sc" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="${C}" opacity=".12"/></pattern></defs>`;
const wrap = (inner) => `<svg viewBox="0 0 560 300" role="presentation" fill="none" stroke-linecap="round" stroke-linejoin="round">${glow}<g filter="url(#g)">${inner}</g><rect width="560" height="300" fill="url(#sc)"/></svg>`;
const fade = (begin, dur = '.3s') => `<animate attributeName="opacity" from="0" to="1" begin="${begin}" dur="${dur}" fill="freeze"/>`;

// 1 → 2 · un haz recorre el código de una caja y la etiqueta se vuelve ficha académica
const bars = Array.from({ length: 17 }, (_, i) => { const x = 212 + i * 8.4; return `<line x1="${x}" y1="118" x2="${x}" y2="170" stroke="${C}" stroke-width="${1 + (i * 7 % 3)}"/>`; }).join('');
const V1 = wrap(`
  <rect x="190" y="70" width="180" height="150" rx="6" stroke="${C}" stroke-width="2" opacity="0"><animate attributeName="opacity" from="0" to="1" dur=".25s" fill="freeze"/></rect>
  <path d="M190 70l30-22h180l-30 22M400 48v150l-30 22" stroke="${C}" stroke-width="1.5" opacity=".6"/>
  <g opacity="0">${fade('.15s')}${bars}</g>
  <line x1="196" x2="364" y1="100" y2="100" stroke="${A}" stroke-width="3"><animate attributeName="y1" values="100;190;100" dur=".9s" begin=".2s" fill="freeze"/><animate attributeName="y2" values="100;190;100" dur=".9s" begin=".2s" fill="freeze"/></line>
  <g opacity="0"><animate attributeName="opacity" from="0" to="1" begin=".75s" dur=".3s" fill="freeze"/>
    <rect x="130" y="40" width="300" height="220" rx="10" stroke="${A}" stroke-width="2"/>
    <line x1="154" y1="76" x2="320" y2="76" stroke="${A}" stroke-width="3"/>
    ${[110, 136, 162, 188].map((y, i) => `<line x1="154" y1="${y}" x2="${i % 2 ? 360 : 400}" y2="${y}" stroke="${C}" stroke-width="2" opacity=".8"/>`).join('')}
    <rect x="154" y="212" width="70" height="26" rx="5" stroke="${C}"/></g>`);

// 2 → 3 · una guía de entrega recibe un sello; la hora abre la bitácora
const V2 = wrap(`
  <g><rect x="170" y="36" width="220" height="228" rx="8" stroke="${C}" stroke-width="2"/>
  <line x1="196" y1="72" x2="320" y2="72" stroke="${C}" stroke-width="3"/>
  ${[104, 128, 152, 176].map((y) => `<line x1="196" y1="${y}" x2="364" y2="${y}" stroke="${C}" opacity=".6"/>`).join('')}
  <animate attributeName="opacity" from="0" to="1" dur=".3s" fill="freeze"/></g>
  <g transform="translate(300 200)" opacity="0"><animate attributeName="opacity" from="0" to="1" begin=".35s" dur=".12s" fill="freeze"/>
    <animateTransform attributeName="transform" type="translate" values="300 120;300 200" begin=".35s" dur=".18s" fill="freeze"/>
    <g transform="rotate(-12)"><circle r="46" stroke="${A}" stroke-width="3"/><circle r="38" stroke="${A}" stroke-width="1"/>
    <text y="6" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="17" fill="${A}" stroke="none">RECIBIDO</text></g></g>
  <g opacity="0"><animate attributeName="opacity" from="0" to="1" begin=".8s" dur=".3s" fill="freeze"/>
    <rect x="196" y="224" width="86" height="24" rx="5" stroke="${C}"/><text x="239" y="241" text-anchor="middle" font-family="Inter,sans-serif" font-size="12" fill="${C}" stroke="none">20:00 h</text></g>`);

// 3 → 4 · marcas de conteo bajo las cajas de un estante; la última subraya la conclusión
const tally = (x, d) => `<g stroke="${C}" stroke-width="2.5">${[0, 1, 2, 3].map((i) => `<line x1="${x + i * 9}" y1="188" x2="${x + i * 9}" y2="216" stroke-dasharray="30" stroke-dashoffset="30"><animate attributeName="stroke-dashoffset" to="0" begin="${d + i * 0.07}s" dur=".12s" fill="freeze"/></line>`).join('')}
  <line x1="${x - 4}" y1="212" x2="${x + 32}" y2="194" stroke-dasharray="44" stroke-dashoffset="44"><animate attributeName="stroke-dashoffset" to="0" begin="${d + 0.3}s" dur=".12s" fill="freeze"/></line></g>`;
const V3 = wrap(`
  <line x1="90" y1="170" x2="470" y2="170" stroke="${C}" stroke-width="3"/><line x1="100" y1="170" x2="100" y2="240" stroke="${C}" stroke-width="2"/><line x1="460" y1="170" x2="460" y2="240" stroke="${C}" stroke-width="2"/>
  ${[120, 235, 350].map((x) => `<rect x="${x}" y="108" width="90" height="62" rx="4" stroke="${C}" stroke-width="2"><animate attributeName="opacity" from="0" to="1" dur=".3s" fill="freeze"/></rect><line x1="${x + 10}" y1="124" x2="${x + 80}" y2="124" stroke="${C}" opacity=".5"/>`).join('')}
  ${tally(130, 0.25)}${tally(245, 0.55)}${tally(360, 0.85)}
  <line x1="350" y1="232" x2="450" y2="232" stroke="${A}" stroke-width="3" stroke-dasharray="100" stroke-dashoffset="100"><animate attributeName="stroke-dashoffset" to="0" begin="1.05s" dur=".3s" fill="freeze"/></line>`);

// 4 → 5 · una ficha de inventario gira hacia el campo «Responsable»
const V4 = wrap(`
  <g transform="translate(280 150)"><g><animateTransform attributeName="transform" type="scale" values="0.02 1;1 1" dur=".55s" fill="freeze"/>
    <rect x="-150" y="-100" width="300" height="200" rx="10" stroke="${C}" stroke-width="2"/>
    <line x1="-124" y1="-70" x2="30" y2="-70" stroke="${C}" stroke-width="3"/>
    ${[-40, -10, 20].map((y) => `<line x1="-124" y1="${y}" x2="110" y2="${y}" stroke="${C}" opacity=".55"/>`).join('')}
    <text x="-124" y="64" font-family="Inter,sans-serif" font-size="11" fill="${C}" stroke="none" opacity=".8">RESPONSABLE</text></g></g>
  <rect x="146" y="196" width="190" height="34" rx="6" stroke="${A}" stroke-width="2.5" opacity="0"><animate attributeName="opacity" from="0" to="1" begin=".6s" dur=".25s" fill="freeze"/></rect>`);

const VARIANTS = [
  { svg: V1, ms: 1200, label: 'Escaneando existencias' },
  { svg: V2, ms: 1400, label: 'Registrando recepción' },
  { svg: V3, ms: 1500, label: 'Contando inventario' },
  { svg: V4, ms: 1200, label: 'Asignando responsable' },
];

export function playTransition(from, to, swap) {
  const v = VARIANTS[(Math.min(from, to) - 1) % 4];
  const el = document.getElementById('tr'), art = document.getElementById('tr-art'), lbl = document.getElementById('tr-lbl');
  art.innerHTML = v.svg; lbl.textContent = v.label;
  el.classList.remove('off'); el.classList.add('on');
  return new Promise((res) => {
    setTimeout(() => swap(), v.ms * 0.55);
    setTimeout(() => { el.classList.remove('on'); el.classList.add('off'); setTimeout(() => { art.innerHTML = ''; res(); }, 450); }, v.ms);
  });
}
