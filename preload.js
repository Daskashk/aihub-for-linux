const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
  getServices: () => ipcRenderer.invoke("get-services"),
  getRules: () => ipcRenderer.invoke("get-rules"),
  updateRemoteData: () => ipcRenderer.invoke("update-remote-data"),
  toggleService: (serviceId) => ipcRenderer.invoke("toggle-service", serviceId),
  setActiveService: (serviceId) =>
    ipcRenderer.send("set-active-service", serviceId),
  clearServiceData: (serviceId) =>
    ipcRenderer.invoke("clear-service-data", serviceId),
  clearAllData: () => ipcRenderer.invoke("clear-all-data"),
  clearCache: () => ipcRenderer.invoke("clear-cache"),
  openInBrowser: (url) => ipcRenderer.invoke("open-in-browser", url),
  openLoginWindow: (url, serviceId) =>
    ipcRenderer.invoke("open-login-window", url, serviceId),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  cleanUrlTracking: (url) => ipcRenderer.invoke("clean-url-tracking", url),
  onLoginWindowClosed: (callback) =>
    ipcRenderer.on("login-window-closed", (event, serviceId) =>
      callback(serviceId),
    ),

  // STEALTH: Obtener el user-agent limpio del proceso principal
  getStealthUserAgent: () => ipcRenderer.invoke("get-stealth-user-agent"),

  // Favorites
  toggleFavorite: (serviceId) =>
    ipcRenderer.invoke("toggle-favorite", serviceId),

  // Service ordering
  setServiceOrder: (order) => ipcRenderer.invoke("set-service-order", order),

  // Custom JS/CSS injection
  saveCustomInjection: (js, css) =>
    ipcRenderer.invoke("save-custom-injection", js, css),

  // Update details
  getUpdateDetails: () => ipcRenderer.invoke("get-update-details"),

  // Proxy
  setProxy: (proxyConfig) => ipcRenderer.invoke("set-proxy", proxyConfig),

  // Apply proxy to session
  applyProxyToSession: (serviceId) =>
    ipcRenderer.invoke("apply-proxy-to-session", serviceId),

  // Third-party cookies
  setThirdPartyCookies: (enabled) =>
    ipcRenderer.invoke("set-third-party-cookies", enabled),

  // Auto-update notification from main process
  onAutoUpdateAvailable: (callback) =>
    ipcRenderer.on("auto-update-available", (event, details) =>
      callback(details),
    ),
});
