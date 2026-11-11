// FormatPro3 Workflow — application de bureau (Windows, macOS, Linux).
// Le relais local (server.mjs) démarre dans le processus principal : toutes les
// intégrations, y compris la catégorie Vidéo, fonctionnent sans « npm start ».

import { app, BrowserWindow, Menu, shell, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(__dirname, '..');
const DIST = path.join(APP_ROOT, 'dist');
const REPO = 'https://github.com/ck526438-lgtm/formatpro3-workflow';

// Port fixe de préférence : le localStorage (flux + identifiants) est lié à l'origine
// http://127.0.0.1:<port>. Changer de port ferait « disparaître » les flux enregistrés.
const PREFERRED_PORTS = [51740, 51741, 51742, 51743, 51744];

let mainWindow = null;
let relay = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(boot);
}

if (process.platform === 'win32') app.setAppUserModelId('com.formatpro3.workflow');

async function startRelay() {
  for (const port of PREFERRED_PORTS) {
    try {
      return await startServer({ port, dist: DIST });
    } catch (e) {
      if (e?.code !== 'EADDRINUSE') throw e;
    }
  }
  return startServer({ port: 0, dist: DIST });
}

async function boot() {
  try {
    relay = await startRelay();
  } catch (e) {
    dialog.showErrorBox('FormatPro3 Workflow', `Le relais local n’a pas pu démarrer :\n${e?.message ?? e}`);
    app.quit();
    return;
  }
  if (relay.port !== PREFERRED_PORTS[0]) {
    console.warn(`Port ${PREFERRED_PORTS[0]} occupé — relais démarré sur ${relay.port}.`);
  }
  Menu.setApplicationMenu(buildMenu());
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

function isAppUrl(url) {
  return relay && (url === relay.url || url.startsWith(`${relay.url}/`));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: 'FormatPro3 Workflow',
    backgroundColor: '#0f111a',
    icon: path.join(APP_ROOT, 'build', 'icon.png'),
    show: false,
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Tout lien externe s'ouvre dans le navigateur par défaut, jamais dans l'app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) && !isAppUrl(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
  });

  void mainWindow.loadURL(`${relay.url}/`);
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about', label: 'À propos de FormatPro3 Workflow' },
            { type: 'separator' },
            { role: 'hide', label: 'Masquer' },
            { role: 'hideOthers', label: 'Masquer les autres' },
            { role: 'unhide', label: 'Tout afficher' },
            { type: 'separator' },
            { role: 'quit', label: 'Quitter' },
          ],
        }]
      : []),
    {
      label: 'Fichier',
      submenu: [
        isMac ? { role: 'close', label: 'Fermer' } : { role: 'quit', label: 'Quitter' },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        // Rôles natifs : indispensables sur macOS pour copier/coller dans les champs.
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Taille réelle' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        { label: 'Guide d’utilisation (PDF)', click: () => shell.openExternal(`${REPO}/blob/main/docs/guide-utilisation.pdf`) },
        { label: 'Signaler un problème', click: () => shell.openExternal(`${REPO}/issues/new/choose`) },
        { label: 'Code source sur GitHub', click: () => shell.openExternal(REPO) },
        { type: 'separator' },
        {
          label: 'À propos',
          click: () =>
            dialog.showMessageBox({
              type: 'info',
              title: 'FormatPro3 Workflow',
              message: `FormatPro3 Workflow ${app.getVersion()}`,
              detail: `Automatisation visuelle de workflows.\nRelais local : ${relay?.url ?? '—'}\nElectron ${process.versions.electron} · Node ${process.versions.node}\nLicence MIT`,
            }),
        },
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  relay?.server.close();
});
