// MAI Studio desktop shell: a native window around the hosted MAI Studio web app.
const { app, BrowserWindow, Menu, shell, screen } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const envs = require("../config/environments.json");

const envKey = process.env.STUDIO_ENV || require("../package.json").studioEnv || "prod";
const ENV = envs[envKey];
if (!ENV) { console.error(`Unknown STUDIO_ENV "${envKey}". Use dev, qa or prod.`); app.exit(1); }
const START_URL = process.env.STUDIO_URL || ENV.url;
const TITLE = ENV.label ? `MAI Studio [${ENV.label}]` : "MAI Studio";

// Separate data per environment so QA and production never share sign-in.
if (envKey !== "prod") app.setPath("userData", path.join(app.getPath("appData"), `MAI Studio ${ENV.label}`));

let win = null;
const origin = (u) => { try { return new URL(u).origin; } catch { return ""; } };
const isInternal = (u) => origin(u) === origin(START_URL);
const openExternal = (u) => { if (/^(https?:|mailto:|tel:)/i.test(u)) shell.openExternal(u); };

const statePath = () => path.join(app.getPath("userData"), "window-state.json");
function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(statePath(), "utf8"));
    const ok = screen.getAllDisplays().some(({ bounds: b }) => s.x >= b.x - 50 && s.y >= b.y - 50 && s.x < b.x + b.width && s.y < b.y + b.height);
    return ok ? s : { width: s.width, height: s.height, maximized: s.maximized };
  } catch { return {}; }
}
function saveState() {
  try { fs.writeFileSync(statePath(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() })); } catch {}
}

const offlinePage = (desc) => `data:text/html;charset=utf-8,${encodeURIComponent(`<body style="font-family:system-ui;background:#0f1115;color:#eee;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h2>Can't reach ${TITLE}</h2><p>${desc}</p><p style="opacity:.6">${START_URL}</p><button onclick="location.href='${START_URL}'" style="padding:8px 16px">Try again</button></div></body>`)}`;

function createWindow() {
  const st = loadState();
  win = new BrowserWindow({
    width: st.width || 1440, height: st.height || 900, x: st.x, y: st.y, minWidth: 1024, minHeight: 680,
    show: false, backgroundColor: "#0f1115", title: TITLE, autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  if (st.maximized) win.maximize();
  if (ENV.label) win.on("page-title-updated", (e, t) => { e.preventDefault(); win.setTitle(`${t} [${ENV.label}]`); });
  win.once("ready-to-show", () => win.show());
  win.on("close", saveState);
  win.on("closed", () => { win = null; });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) return { action: "allow", overrideBrowserWindowOptions: { autoHideMenuBar: true, webPreferences: { sandbox: true, contextIsolation: true } } };
    openExternal(url); return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => { if (!isInternal(url) && !url.startsWith("data:")) { e.preventDefault(); openExternal(url); } });
  win.webContents.on("did-fail-load", (_e, code, desc, _u, isMain) => { if (isMain && code !== -3) win.loadURL(offlinePage(desc)); });
  win.loadURL(START_URL);
}

function buildMenu() {
  const mac = process.platform === "darwin";
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(mac ? [{ role: "appMenu" }] : []),
    { label: "File", submenu: [mac ? { role: "close" } : { role: "quit" }] },
    { role: "editMenu" },
    { label: "View", submenu: [
      { label: "Back", accelerator: "Alt+Left", click: () => win?.webContents.navigationHistory.canGoBack() && win.webContents.navigationHistory.goBack() },
      { label: "Forward", accelerator: "Alt+Right", click: () => win?.webContents.navigationHistory.canGoForward() && win.webContents.navigationHistory.goForward() },
      { type: "separator" }, { role: "reload" }, { role: "forceReload" }, { type: "separator" },
      { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" },
      ...(app.isPackaged ? [] : [{ type: "separator" }, { role: "toggleDevTools" }]),
    ] },
    { role: "windowMenu" },
  ]));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => { buildMenu(); createWindow(); app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
