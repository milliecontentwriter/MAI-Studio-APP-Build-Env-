# MAI Studio desktop app

A native window around the hosted MAI Studio web app (Electron only, no web code in this repo).
Web URLs per environment are in `config/environments.json`; edit them there.

| Env | URL | Command |
|---|---|---|
| dev | http://localhost:3005 (run the web app's `npm run dev` first) | `npm run dev` |
| qa | https://qa.myproject.design | `npm run qa` |
| prod | https://myproject.design | `npm run prod` |

```bash
npm install
npm run qa                  # run against QA
npm run pack:prod           # unpacked app in dist/prod/
npm run dist:prod:win       # installer: run on Windows (.exe); :mac -> .dmg; :linux -> AppImage + .deb
npm run dist:qa:win         # same for QA
```

Build each installer on its own OS. QA and production have different app ids and data folders, so they
install side by side. Links to other sites open in the normal browser. `STUDIO_URL=<url>` overrides the
address for a one-off run. Replace `build/icon.png` with a 1024x1024 PNG for best results.

## Building for all platforms (GitHub Actions)

`.github/workflows/build-desktop.yml` builds Windows, macOS and Linux installers on GitHub's own
machines. Push the project to GitHub, then Actions > "Build desktop apps" > Run workflow (choose qa,
prod or both), or push a `v*` tag. Download the installers from the run's Artifacts.
The macOS .dmg is unsigned until Apple Developer ID credentials are added as repository secrets, so Macs show an
"unidentified developer" warning (right-click > Open the first time).
