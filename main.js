const { app, BrowserWindow, ipcMain, session, shell, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// --- PATHS ---
const configPath = path.join(app.getPath('userData'), 'config.json');
const dataDir = path.join(app.getPath('userData'), 'data');
const servicesPath = path.join(dataDir, 'remote_services.json');
const rulesPath = path.join(dataDir, 'remote_rules.json');

// ──────────────────────────────────────────────────────────
// LECCIONES DE FERDIUM Y CHERRY STUDIO:
//
// 1. Ferdium desactiva CrossOriginOpenerPolicy globalmente
// 2. Cherry Studio desactiva webSecurity y allowRunningInsecureContent
// 3. Ambos usan allowpopups en los webviews
// 4. Ambos setean UA limpio a nivel de sesion y app.userAgentFallback
// 5. Ferdium tiene setPermissionRequestHandler con allowlist
// 6. Cherry Studio elimina X-Frame-Options Y Content-Security-Policy completos
// 7. Ferdium permite new-window popups como BrowserWindow hijos
// 8. NINGUNO usa sandbox:true en el BrowserWindow principal
// ──────────────────────────────────────────────────────────

// STEALTH: User-Agent sin "Electron" (como hacen Ferdium y Cherry Studio)
let STEALTH_USER_AGENT = '';
function computeStealthUA() {
  try {
    const realUA = session.defaultSession.getUserAgent();
    // Quitar "Electron/x.x.x" del UA
    STEALTH_USER_AGENT = realUA.replace(/\sElectron\/[\d.]+/, '');
    // Setear como fallback global (como hace Ferdium)
    app.userAgentFallback = STEALTH_USER_AGENT;
  } catch (e) {
    const p = process.platform;
    const uaPlatform = p === 'win32' ? 'Windows NT 10.0; Win64; x64' : p === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7' : 'X11; Linux x86_64';
    STEALTH_USER_AGENT = `Mozilla/5.0 (${uaPlatform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
    app.userAgentFallback = STEALTH_USER_AGENT;
  }
}

// STEALTH: Desactivar SameSite por defecto (necesario para captcha cross-domain)
app.commandLine.appendSwitch('disable-features', 'SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure,CrossOriginOpenerPolicy');

// --- DEFAULT CONFIG ---
const defaultConfig = {
  lastUpdate: null, lastUpdateCheck: null, blockingEnabled: true, maxActiveServices: 3,
  darkMode: true, enabledServices: ['chatgpt', 'claude', 'gemini'], favoriteServices: [],
  serviceOrder: [], lastActiveService: null, defaultService: 'chatgpt', loadLastOpenedAI: true,
  customJs: '', customCss: '', thirdPartyCookies: true, updateFrequencyDays: 3, fontSize: 'medium',
  proxyEnabled: false, proxyType: 'http', proxyHost: '', proxyPort: '',
  remoteUrls: {
    services: "https://raw.githubusercontent.com/SilentCoderHere/aihub-config-data/main/ai_services_list.json",
    rules: "https://raw.githubusercontent.com/SilentCoderHere/aihub-config-data/main/domain_filtering_rules.json"
  }
};

let config = { ...defaultConfig };
let commonAuthDomains = new Set();
let alwaysBlockedDomains = {};
let trackingParams = [];
let rulesCache = null;
const initializedSessions = new Set();
let mainWindow = null;

// --- CONFIG LOAD / SAVE ---
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config = { ...defaultConfig, ...savedConfig, remoteUrls: { ...defaultConfig.remoteUrls, ...(savedConfig.remoteUrls || {}) } };
    }
    saveConfig();
  } catch (error) { config = { ...defaultConfig }; saveConfig(); }
}

function saveConfig() {
  try { fs.writeFileSync(configPath, JSON.stringify(config, null, 2)); } catch (error) { console.error('[Config] Error saving:', error); }
}

// --- REMOTE DATA FETCHING ---
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    if (!url.startsWith('https://') && !url.startsWith('http://')) return reject(new Error('Invalid URL scheme'));
      const protocol = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => req.destroy(new Error('Request timeout')), 15000);
    const req = protocol.get(url, (response) => {
      clearTimeout(timeout);
      if (response.statusCode === 301 || response.statusCode === 302) { if (response.headers.location) return fetchUrl(response.headers.location).then(resolve).catch(reject); }
      if (response.statusCode !== 200) return reject(new Error(`HTTP Status ${response.statusCode}`));
      let data = ''; response.on('data', chunk => data += chunk); response.on('end', () => resolve(data));
    }).on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
}

// --- SERVICE & RULE LOADING ---
function loadServices() {
  try { if (fs.existsSync(servicesPath)) { const data = fs.readFileSync(servicesPath, 'utf8'); return data ? JSON.parse(data) : null; } } catch (error) {}
  return null;
}

function loadRules() {
  try {
    if (rulesCache) return rulesCache;
    if (fs.existsSync(rulesPath)) {
      const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      rulesCache = rules;
      if (rules.common_auth_domains) commonAuthDomains = new Set(rules.common_auth_domains);
      if (rules.always_blocked_domains) alwaysBlockedDomains = rules.always_blocked_domains;
      if (rules.tracking_params) trackingParams = rules.tracking_params;
      return rules;
    }
  } catch (error) {}
  return null;
}

function isDomainAllowed(hostname, serviceDomains, serviceId) {
  if (!config.blockingEnabled) return true;
  if (alwaysBlockedDomains[serviceId] && alwaysBlockedDomains[serviceId].some(b => hostname === b || hostname.endsWith('.' + b))) return false;
  for (const domain of commonAuthDomains) { if (hostname === domain || hostname.endsWith('.' + domain)) return true; }
  if (serviceDomains && serviceDomains.length > 0) { for (const domain of serviceDomains) { if (hostname === domain || hostname.endsWith('.' + domain)) return true; } }
  return false;
}

// ──────────────────────────────────────────────────────────
// CONFIGURACION DE SESION POR SERVICIO
// Basado en Ferdium y Cherry Studio:
// - UA limpio a nivel de sesion
// - Permission handler con allowlist (como Ferdium)
// - CSP/XFO stripping (como Cherry Studio)
// - Sec-CH-UA limpio (quitar "Electron")
// ──────────────────────────────────────────────────────────
function setupSessionBlocking(serviceId) {
  if (!serviceId) return;
  const partitionName = `persist:${serviceId}`;
  if (initializedSessions.has(partitionName)) return;
  const ses = session.fromPartition(partitionName);
  initializedSessions.add(partitionName);

  // UA limpio en la sesion (como Cherry Studio)
  if (STEALTH_USER_AGENT) {
    ses.setUserAgent(STEALTH_USER_AGENT);
  }

  // ──────────────────────────────────────────────────────────
  // Permission handler con allowlist (copiado de Ferdium)
  // Sin esto, los permisos se auto-deniegan y el captcha se cuelga
  // ──────────────────────────────────────────────────────────
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = [
      'media', 'notifications', 'fullscreen', 'pointerLock',
      'display-capture', 'idle-detection', 'clipboard-read',
      'clipboard-sanitized-write', 'speaker-selection'
    ];
    callback(allowed.includes(permission));
  });

  ses.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = [
      'media', 'notifications', 'fullscreen', 'pointerLock',
      'display-capture', 'idle-detection', 'clipboard-read',
      'clipboard-sanitized-write', 'speaker-selection'
    ];
    return allowed.includes(permission);
  });

  // ──────────────────────────────────────────────────────────
  // CSP/XFO stripping (como Cherry Studio)
  // Eliminar X-Frame-Options Y Content-Security-Policy completos
  // Cherry Studio hace esto y le funciona con todos los servicios de IA
  // ──────────────────────────────────────────────────────────
  ses.webRequest.onHeadersReceived((details, callback) => {
    let responseHeaders = details.responseHeaders;
    if (responseHeaders) {
      // Eliminar X-Frame-Options (ambas capitalizaciones)
      delete responseHeaders['x-frame-options'];
      delete responseHeaders['X-Frame-Options'];

      // Eliminar Content-Security-Policy completo (como Cherry Studio)
      // Esto permite que los iframes del captcha funcionen sin restricciones
      delete responseHeaders['content-security-policy'];
      delete responseHeaders['Content-Security-Policy'];

      // Eliminar COOP y COEP
      delete responseHeaders['cross-origin-opener-policy'];
      delete responseHeaders['cross-origin-embedder-policy'];
      delete responseHeaders['Cross-Origin-Opener-Policy'];
      delete responseHeaders['Cross-Origin-Embedder-Policy'];
    }
    callback({ responseHeaders });
  });

  // ──────────────────────────────────────────────────────────
  // Sec-CH-UA limpio (quitar "Electron" de Client Hints)
  // ──────────────────────────────────────────────────────────
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = details.requestHeaders || {};
    for (const key of Object.keys(headers)) {
      const val = headers[key];
      const isArr = Array.isArray(val);
      const items = isArr ? val : [val];

      if (key.toLowerCase() === 'sec-ch-ua') {
        const cleaned = items.map(v => String(v).replace(/,?\s*"Electron[^"]*";v="[^"]*"/g, '').replace(/^\s*,\s*/, ''));
        headers[key] = isArr ? cleaned : cleaned[0];
      }
      if (key.toLowerCase() === 'sec-ch-ua-full-version-list') {
        const cleaned = items.map(v => String(v).replace(/,?\s*"Electron[^"]*";v="[^"]*"/g, '').replace(/^\s*,\s*/, ''));
        headers[key] = isArr ? cleaned : cleaned[0];
      }
    }
    callback({ requestHeaders: headers });
  });

  if (config.proxyEnabled && config.proxyHost && config.proxyPort) {
    ses.setProxy({ proxyRules: `${config.proxyType}://${config.proxyHost}:${config.proxyPort}` }).catch(() => {});
  }

  // Domain blocking (original de AI Hub - mantener intacto)
  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    try {
      const url = new URL(details.url);
      if (details.url.startsWith('devtools://') || details.url.startsWith('file://') || details.url.startsWith('chrome-extension://')) return callback({});
        const rules = loadRules();
        let serviceDomains = rules?.service_domains?.[serviceId] || [];
        if (config.blockingEnabled && !rules) return callback({});
        if (isDomainAllowed(url.hostname, serviceDomains, serviceId)) {
          if (trackingParams.length > 0) {
            let modified = false;
            trackingParams.forEach(param => { if (url.searchParams.has(param)) { url.searchParams.delete(param); modified = true; } });
            if (modified) return callback({ redirectURL: url.toString() });
          }
          callback({});
        } else { callback({ cancel: true }); }
    } catch (e) { callback({}); }
  });
}

async function updateRemoteData() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    let updated = false;
    const remoteServicesData = await fetchUrl(config.remoteUrls.services);
    const localServicesData = fs.existsSync(servicesPath) ? fs.readFileSync(servicesPath, 'utf8') : null;
    if (remoteServicesData !== localServicesData) { fs.writeFileSync(servicesPath, remoteServicesData); updated = true; }

    const remoteRulesData = await fetchUrl(config.remoteUrls.rules);
    const localRulesData = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, 'utf8') : null;
    if (remoteRulesData !== localRulesData) { fs.writeFileSync(rulesPath, remoteRulesData); rulesCache = null; initializedSessions.clear(); updated = true; }

    if (updated) { config.lastUpdate = new Date().toISOString(); loadRules(); }
    config.lastUpdateCheck = new Date().toISOString();
    saveConfig();
    return { success: true, updated };
  } catch (error) { return { success: false, error: error.message, updated: false }; }
}

// --- MAIN WINDOW CREATION ---
// ──────────────────────────────────────────────────────────
// CRUCIAL: sandbox:false y webSecurity:false
// Ferdium usa sandbox:false, Cherry Studio usa ambos.
// sandbox:true bloquea APIs que el captcha necesita.
// webSecurity:false permite requests cross-origin del captcha.
// ──────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 600,
    title: 'AI Hub Desktop', backgroundColor: '#1a1b1e', autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,              // CRUCIAL: como Ferdium y Cherry Studio
      webSecurity: false,          // CRUCIAL: como Cherry Studio - permite cross-origin
      webviewTag: true,
      allowRunningInsecureContent: true,  // Como Cherry Studio
      disableHtmlFullscreenWindowResize: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

  // ──────────────────────────────────────────────────────────
  // setWindowOpenHandler del mainWindow (como Ferdium)
  // Ferdium permite new-window como BrowserWindow hijo
  // que comparte la sesion del servicio. Esto es CRITICO
  // para que los popups del captcha/OAuth funcionen.
  // ──────────────────────────────────────────────────────────
  mainWindow.webContents.setWindowOpenHandler(({ url, disposition }) => {
    // Si es un popup (window.open, target=_blank desde JS), permitirlo
    // como BrowserWindow hijo con la misma sesion
    if (disposition === 'new-window') {
      return {
        action: 'allow',
        outlivesOpener: false,
        overrideBrowserWindowOptions: {
          parent: mainWindow,
          fullscreenable: false,
        }
      };
    }
    // Links normales → abrir en navegador externo
    try {
      const u = new URL(url);
      if (u.protocol === 'https:' || u.protocol === 'http:') shell.openExternal(url);
    } catch (e) {}
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ──────────────────────────────────────────────────────────
// Global web-contents-created handler (como Ferdium)
// Configura TODOS los webContents (incluidos los de webviews)
// con el handler correcto de popups.
// ──────────────────────────────────────────────────────────
app.on('web-contents-created', (_event, contents) => {
  // No interceptar el mainWindow (ya tiene su propio handler)
  if (contents === mainWindow?.webContents) return;

  // Para webviews y otros webContents:
  // Permitir popups (new-window) como BrowserWindow hijos
  // Esto es lo que Ferdium hace y es CRITICO para el captcha
  contents.setWindowOpenHandler(({ url, disposition }) => {
    if (disposition === 'new-window') {
      return {
        action: 'allow',
        outlivesOpener: false,
        overrideBrowserWindowOptions: {
          parent: mainWindow,
          fullscreenable: false,
          webPreferences: {
            session: contents.session  // Compartir sesion con el webview padre
          }
        }
      };
    }
    // Links normales → navegador externo
    try {
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url);
      }
    } catch (e) {}
    return { action: 'deny' };
  });
});

// --- IPC HANDLERS ---
ipcMain.handle('get-config', () => config);
ipcMain.handle('get-services', () => loadServices());
ipcMain.handle('get-rules', () => loadRules());
ipcMain.handle('update-remote-data', async () => await updateRemoteData());
ipcMain.handle('get-stealth-user-agent', () => STEALTH_USER_AGENT);

ipcMain.handle('save-config', (event, newConfig) => {
  if (!newConfig) return config;
  for (const [key, value] of Object.entries(newConfig)) {
    if (key in defaultConfig) { config[key] = value; }
  }
  if (newConfig.enabledServices) config.enabledServices = [...new Set(newConfig.enabledServices)];
  saveConfig();
  return config;
});

ipcMain.handle('toggle-service', (event, serviceId) => {
  const index = config.enabledServices.indexOf(serviceId);
  if (index === -1) { config.enabledServices.push(serviceId); if (!config.serviceOrder.includes(serviceId)) config.serviceOrder.push(serviceId); }
  else { if (config.enabledServices.length <= 1) return config.enabledServices; config.enabledServices.splice(index, 1); }
  saveConfig(); return config.enabledServices;
});

ipcMain.on('set-active-service', (event, serviceId) => { config.lastActiveService = serviceId; setupSessionBlocking(serviceId); saveConfig(); });
ipcMain.handle('toggle-favorite', (event, serviceId) => { const i = config.favoriteServices.indexOf(serviceId); if (i === -1) config.favoriteServices.push(serviceId); else config.favoriteServices.splice(i, 1); saveConfig(); return config.favoriteServices; });
ipcMain.handle('set-service-order', (event, order) => { config.serviceOrder = order; saveConfig(); return config.serviceOrder; });
ipcMain.handle('save-custom-injection', (event, js, css) => { config.customJs = js || ''; config.customCss = css || ''; saveConfig(); return { success: true, customJs: config.customJs, customCss: config.customCss }; });
ipcMain.handle('set-proxy', (event, p) => { config.proxyEnabled = !!p.proxyEnabled; config.proxyType = p.proxyType; config.proxyHost = p.proxyHost; config.proxyPort = p.proxyPort; saveConfig(); return { success: true }; });
ipcMain.handle('set-third-party-cookies', (event, enabled) => { config.thirdPartyCookies = !!enabled; saveConfig(); return { success: true }; });
ipcMain.handle('clear-service-data', async (event, serviceId) => { const s = session.fromPartition(`persist:${serviceId}`); await s.clearStorageData(); await s.clearCache(); return { success: true }; });
ipcMain.handle('clear-all-data', async () => { for(const id of config.enabledServices){ try { const s = session.fromPartition(`persist:${id}`); await s.clearStorageData(); await s.clearCache(); } catch(e){} } return { success: true }; });
ipcMain.handle('clear-cache', async () => { for(const id of config.enabledServices){ try { await session.fromPartition(`persist:${id}`).clearCache(); } catch(e){} } return { success: true }; });
ipcMain.handle('open-in-browser', async (event, url) => { await shell.openExternal(url); return { success: true }; });

// Ventana de login con sesion compartida (como Ferdium)
ipcMain.handle('open-login-window', async (event, url, serviceId) => {
  const loginWindow = new BrowserWindow({
    width: 900, height: 700,
    parent: mainWindow,
    fullscreenable: false,
    webPreferences: {
      partition: `persist:${serviceId}`,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });
  if (STEALTH_USER_AGENT) {
    loginWindow.webContents.setUserAgent(STEALTH_USER_AGENT);
  }
  loginWindow.loadURL(url);
  loginWindow.on('closed', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('login-window-closed', serviceId); });
  return { success: true };
});

ipcMain.handle('get-app-version', () => { try { return require('./package.json').version || '0.6.1-beta'; } catch (e) { return '0.6.1-beta'; } });
ipcMain.handle('clean-url-tracking', async (event, url) => { return { cleanedUrl: url, wasModified: false }; });

// --- APP LIFECYCLE ---
app.whenReady().then(() => {
  computeStealthUA();
  loadConfig();
  loadRules();
  createMainWindow();
  setTimeout(() => updateRemoteData(), 3000);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
