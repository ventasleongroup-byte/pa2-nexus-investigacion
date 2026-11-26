# PA2 research website (team Nexus)

Static site, no build step. Three.js r170 is vendored in `vendor/`.

## Run locally
`python -m http.server 8765` in this folder, then open http://127.0.0.1:8765 (ES modules do not run from `file://`).

## Real-time collaboration (no server, no database)
- Team link = site URL + `#sala=<secret key>` (the key lives in `.sala.txt`, git-ignored; never commit it).
- Every browser holds a Yjs CRDT document, synced peer-to-peer over WebRTC (Trystero/Nostr relays only help peers find each other;
  the room id sent to the relays is a SHA-256 hash, the key encrypts the signalling). Local copy in IndexedDB.
- Edits made while alone are kept locally and merge automatically the next time two people are online at once.
- **Descargar aportes** exports every text and photo (JSON, photos as base64) for the final build; **Importar aportes** merges a JSON back in.
- Without a key the site is read-only and shows `content.json` (the baked final content).
- Rebuild vendor bundle: `esbuild` entry exporting `yjs` + `@trystero-p2p/nostr` (trystero 0.27.0, yjs 13.6.33) -> `vendor/collab.js`.

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
