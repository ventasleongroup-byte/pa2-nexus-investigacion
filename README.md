# PA2 research website (team Nexus)

Static site, no build step. Three.js r170 is vendored in `vendor/`.

## Run locally
`python -m http.server 8765` in this folder, then open http://127.0.0.1:8765 (ES modules do not run from `file://`).

## Fill in
- Team members: **Editar** button (top right) -> fields appear. Saved in the browser (localStorage).
- **Exportar mi contenido** downloads a JSON; the coordinator uses **Importar contenido** to merge the four files,
  then exports once more and saves the result as `content.json` next to `index.html` (it is the base content for everyone).
- Page 1 paragraphs (p1-p4) and the page 4 conclusions are meant to be written last.
- Logo: upload it in page 1 -> "Logotipo del equipo" (edit mode), or hand it over and it can be set as default.

## Final delivery
- Open the site with `?final=1`: hides the checklist and the edit button.
- To remove the checklist for good: set `CHECKLIST: false` in `js/app.js` (CONFIG) and delete `<aside id="checklist">` and `#cl-toggle` in `index.html`.
- The public link must be tested from another account or an incognito window.

## Files
`index.html` shell · `css/styles.css` · `js/app.js` content model, edit mode, checklist, router · `js/scenes.js` 5 WebGL header scenes ·
`js/transitions.js` 4 hologram interludes · `assets/wms.png` figure (Wikimedia Commons, CC BY 4.0) · `guias/` page 2 guide.

## Known limits
- Symbaloo: shared links (`/shared/...`) cannot be framed; use Symbaloo's Embed code.
- `prefers-reduced-motion` shows a static frame instead of animation (by design).
