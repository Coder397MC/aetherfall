# Aetherfall — Echoes of the Sky

A playable, single-player 3D open-world fantasy RPG for the browser. Explore a floating island, free its ancient guardians, awaken three beacons in any order, and face the Hollow Warden.

The complete first chapter includes a continuous explorable island, third-person combat, a keeper NPC, sword and health upgrades, experience levels, 45 collectible shards, healing flasks, a world map with custom waypoints, and a conclusion that lets you keep exploring. Progress is saved automatically in the current browser.

## Play locally

You need **Node.js 20 or newer**. No package installation is needed.

```sh
npm start
```

Open **http://127.0.0.1:4173**. Without npm, use `node scripts/serve.mjs`. Opening `index.html` directly as a file will not work because browsers restrict JavaScript module loading from `file://`.

A modern browser with WebGL 2 and hardware acceleration is required. Desktop keyboard and mouse are recommended. Touch devices receive a movement joystick, camera dragging, and action buttons. Use Pause → Visual quality → Performance on slower devices.

## Controls

| Action | Control |
| --- | --- |
| Move | WASD or arrow keys |
| Orbit camera | Drag with mouse or finger |
| Zoom | Mouse wheel |
| Strike | J, click, or sword button |
| Dodge | Space or dodge button |
| Sprint | Hold Shift |
| Jump | F |
| Interact | E or touch interaction button |
| Healing flask | Q or flask button |
| World map | M or minimap |
| Journal | Tab or journal button |
| Pause | Escape or pause button |

Talk to **Elowen beside the campfire**. Defeat all three guardians at a sanctuary, approach its crystal, then press E. Each beacon restores health, refills flasks, and awards shards. Spend shards with Elowen to improve your sword or maximum health.

Enemies show a red circle before striking. Dodge out of it or time your dodge through the attack. After all three beacons awaken, defeat the Warden at the central gate and return to Elowen to finish the chapter.

Defeat returns you to camp without removing discoveries or upgrades. Pause → Return to camp is available if you get turned around. A new journey replaces the current save after confirmation. Saves are local to the browser and origin; moving from localhost to GitHub Pages starts a separate save.

## Publish on GitHub Pages

The included `.github/workflows/pages.yml` tests the game, builds it, and publishes to GitHub Pages on pushes to `main`.

1. Create an empty **public** GitHub repository, for example `aetherfall`.
2. Put this folder's contents at the repository root, including `.github`. From this folder, run the following commands, replacing `YOUR-USERNAME` with your account:

   ```sh
   git init -b main
   git add .
   git commit -m "Launch Aetherfall"
   git remote add origin https://github.com/YOUR-USERNAME/aetherfall.git
   git push -u origin main
   ```

3. Go to **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions**.
4. Open **Actions → Publish Aetherfall**. If the first run happened before Pages was enabled, rerun it or choose **Run workflow**.
5. Share the successful deployment URL from Settings → Pages, normally `https://YOUR-USERNAME.github.io/aetherfall/`.

If Git asks for an author identity, set your own name and email before committing. Authenticate using your normal Git credential manager or GitHub CLI; do not put tokens in game files.

Relative paths support both repository subpaths and custom domains. The game needs no backend, API keys, player accounts, or paid service.

See GitHub's [custom Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) for current hosting instructions.

## Build and test

```sh
npm test
npm run build
node scripts/serve.mjs --dist
```

`dist/` contains the complete deployable game. Fonts and Three.js are bundled locally, with no runtime CDN requests. Build and server scripts use Node's standard library and need no dependency installation or lockfile.

Tests cover all six beacon orders, duplicate rewards, upgrade costs/caps, healing, leveling, dead-save recovery, edge-position saves, malformed saves, and victory persistence. Browser checks cover rendering, journal/map interactions, waypoints, pause/resume, quality settings, and narrow/desktop layouts.

## Project guide

- `src/world.js` — deterministic terrain, scenery, character and guardian models.
- `src/game.js` — controls, camera, combat, quests, interface, saving, synthesized sound.
- `src/state.js` — progression rules and save validation.
- `src/post.js` — HDR highlight glow and color output.
- `src/style.css` — interface and responsive layouts.
- `scripts/` — local server and static build.
- `tests/` — progression and recovery tests.
- `vendor/` — pinned renderer, fonts, and licenses.

This is a compact, complete first chapter designed to be expanded. It is single-player, with no analytics, paid assets, account services, or external AI services.

## License and credits

Original game code, procedural geometry, and synthesized audio use the [MIT license](LICENSE).

- [Three.js](https://threejs.org/), version 0.170.0 — MIT; `vendor/THREE-LICENSE.txt`.
- Cormorant Garamond and DM Sans — SIL Open Font License; license files in `vendor/fonts/`.
