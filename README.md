# PA2 research website (team Nexus)

Static site, no build step. Three.js r170 is vendored in `vendor/`.

## Run locally
`python -m http.server 8765 --bind 127.0.0.1` in this folder (loopback only), then open http://127.0.0.1:8765/#sala=<a random key you generate locally> (ES modules do not run from `file://`).

## Real-time collaboration (no server, no database)
- Team link = site URL + `#sala=<secret key>` (the key lives OUTSIDE this folder, in `../.sala_web.txt`; never commit it or put it in the served folder).
- Every browser holds a Yjs CRDT document, synced peer-to-peer over WebRTC (Trystero/Nostr relays only help peers find each other;
  the room id sent to the relays is a SHA-256 hash, the key encrypts the signalling). Local copy in IndexedDB.
- Edits made while alone are kept locally and merge automatically the next time two people are online at once.
- **Descargar aportes** exports every text and photo (JSON, photos as base64) for the final build; **Importar aportes** restores a JSON (it OVERWRITES the fields it contains, for everyone).
- Without a key the site is read-only and shows `content.json` (the baked final content).
- Rebuild vendor bundle: `esbuild` entry exporting `yjs` + `@trystero-p2p/nostr` (trystero 0.27.0, yjs 13.6.33) -> `vendor/collab.js`.

## Final delivery
- Open the site with `?final=1`: always the read-only public view (content.json), no checklist, no edit mode, even on browsers that joined the room.
- To remove the checklist for good: set `CHECKLIST: false` in `js/app.js` (CONFIG); the markup can stay (the code tolerates its absence).
- The public link must be tested from another account or an incognito window.

## Files
`index.html` shell · `css/styles.css` · `js/app.js` content model, edit mode, checklist, router · `js/scenes.js` 5 WebGL header scenes ·
`js/transitions.js` 4 hologram interludes · `assets/wms.png` figure (Wikimedia Commons, CC BY 4.0) · `guias/` page 2 guide.

## Known limits
- Symbaloo: shared links (`/shared/...`) cannot be framed; use Symbaloo's Embed code.
- `prefers-reduced-motion` shows a static frame instead of animation (by design).

## Known limits (from the audit)
- Peers connect through STUN only (no TURN): strict NATs (some campus or mobile networks) may never connect; use Download/Import as the fallback.
- Import overwrites the fields it contains for everyone; it is a restore tool, not a merge tool.
