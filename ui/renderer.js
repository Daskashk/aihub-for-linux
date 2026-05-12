document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    sidebar: document.getElementById('sidebar'),
                          toggleSidebarBtn: document.getElementById('btn-toggle-sidebar'),
                          servicesList: document.getElementById('services-list'),
                          allServicesList: document.getElementById('all-services-list'),
                          webviewsContainer: document.getElementById('webviews-container'),
                          welcomeScreen: document.getElementById('welcome-screen'),
                          settingsPanel: document.getElementById('settings-panel'),
                          btnSettings: document.getElementById('btn-settings'),
                          btnUpdate: document.getElementById('btn-update'),
                          toggleBlocking: document.getElementById('toggle-blocking'),
                          maxServicesInput: document.getElementById('max-services'),
                          lastUpdate: document.getElementById('last-update'),
                          btnSaveSettings: document.getElementById('btn-save-settings'),
                          btnCloseSettings: document.getElementById('btn-close-settings'),
                          modalTabs: document.querySelectorAll('.modal-tab'),
                          tabContents: document.querySelectorAll('.tab-content'),
                          btnZoomIn: document.getElementById('btn-zoom-in'),
                          btnZoomOut: document.getElementById('btn-zoom-out'),
                          btnZoomReset: document.getElementById('btn-zoom-reset'),
                          btnOpenBrowser: document.getElementById('btn-open-browser'),
                          blockingIndicator: document.getElementById('blocking-indicator'),
                          blockingText: document.getElementById('blocking-text'),
                          btnClearData: document.getElementById('btn-clear-data'),
                          clearDataModal: document.getElementById('clear-data-modal'),
                          btnCancelClear: document.getElementById('btn-cancel-clear'),
                          btnConfirmClear: document.getElementById('btn-confirm-clear'),
                          btnReloadPage: document.getElementById('btn-reload-page'),
                          serviceSearch: document.getElementById('service-search'),
                          categoryFilter: document.getElementById('category-filter'),
                          activeServicesBadge: document.getElementById('active-services-badge'),
                          sidebarSearchInput: document.getElementById('sidebar-search-input'),
                          sidebarCategories: document.getElementById('sidebar-categories'),
                          errorOverlay: document.getElementById('error-overlay'),
                          errorMessage: document.getElementById('error-message'),
                          btnRetry: document.getElementById('btn-retry'),
                          toggleLoadLast: document.getElementById('toggle-load-last'),
                          defaultServiceSelect: document.getElementById('default-service-select'),
                            fontSizeSelect: document.getElementById('font-size-select'),
                          toggleThirdPartyCookies: document.getElementById('toggle-third-party-cookies'),
                          toggleProxy: document.getElementById('toggle-proxy'),
                          proxyConfigSection: document.getElementById('proxy-config-section'),
                          proxyTypeSelect: document.getElementById('proxy-type-select'),
                          proxyHostInput: document.getElementById('proxy-host-input'),
                          proxyPortInput: document.getElementById('proxy-port-input'),
                          updateFrequencySelect: document.getElementById('update-frequency-select'),
                          customJsEditor: document.getElementById('custom-js-editor'),
                          customCssEditor: document.getElementById('custom-css-editor'),
                          btnSaveInjection: document.getElementById('btn-save-injection'),
                          jsUnsaved: document.getElementById('js-unsaved'),
                          cssUnsaved: document.getElementById('css-unsaved'),
                          btnClearCache: document.getElementById('btn-clear-cache'),
                          btnClearAllData: document.getElementById('btn-clear-all-data'),
                          clearAllDataModal: document.getElementById('clear-all-data-modal'),
                          btnCancelClearAll: document.getElementById('btn-cancel-clear-all'),
                          btnConfirmClearAll: document.getElementById('btn-confirm-clear-all'),
                          updateDetailsModal: document.getElementById('update-details-modal'),
                          updateDetailsBody: document.getElementById('update-details-body'),
                          btnCloseUpdateDetails: document.getElementById('btn-close-update-details'),
                          btnDismissUpdate: document.getElementById('btn-dismiss-update'),
                          btnApplyUpdate: document.getElementById('btn-apply-update')
  };

  let config = {};
  let allServices = [];
  let activeTabs = [];
  let currentTabId = null;
  let currentFilter = 'all';
  let sidebarFilter = 'all';
  let searchQuery = '';
  let sidebarSearchQuery = '';
  let pendingUpdateDetails = null;
  let injectionDirty = { js: false, css: false };

  const formatDate = (isoString) => { if (!isoString) return 'Never'; return new Date(isoString).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }); };
  const generateId = (name) => name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
  const escapeHtml = (unsafe) => unsafe ? unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
  const sanitizeColor = (color) => {
    if (!color) return '#1d99f3'; // Azul Plasma por defecto si no hay color
    const hex = color.replace(/^#/, '');
    // Acepta hex de 3, 4, 6 u 8 caracteres (para colores con transparencia)
    return /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{4}$|^[0-9A-Fa-f]{6}$|^[0-9A-Fa-f]{8}$/.test(hex) ? `#${hex}` : '#1d99f3';
  };
  const getFontSizePercent = (size) => { const map = { 'x-small': 80, 'small': 90, 'medium': 100, 'large': 110, 'x-large': 120 }; return map[size] || 100; };

  const getPrivacyBadge = (privacy) => {
    if (!privacy) return '';
    const n = privacy.toLowerCase().trim();
    if (n === 'privacy focused') return `<span class="privacy-badge privacy-focused">Privacy Focused</span>`;
    if (n === 'privacy friendly') return `<span class="privacy-badge privacy-friendly">Privacy Friendly</span>`;
    if (n === 'not for privacy') return `<span class="privacy-badge not-for-privacy">Not for Privacy</span>`;
    return '';
  };

  const getPricingBadge = (type) => {
    if (!type) return '';
    const n = type.toLowerCase().trim();
    if (n === 'free') return `<span class="pricing-badge pricing-free">Free</span>`;
    if (n === 'freemium') return `<span class="pricing-badge pricing-freemium">Freemium</span>`;
    if (n === 'paid') return `<span class="pricing-badge pricing-paid">Paid</span>`;
    return '';
  };

  const updateBlockingUI = (enabled) => {
    elements.blockingIndicator.className = enabled ? 'indicator active' : 'indicator inactive';
    elements.blockingText.textContent = enabled ? 'Blocking Active' : 'Blocking Inactive';
  };
  const showErrorOverlay = (msg) => { elements.errorMessage.textContent = msg; elements.errorOverlay.classList.add('visible'); };
  const hideErrorOverlay = () => { elements.errorOverlay.classList.remove('visible'); };
  const applyDarkMode = (enabled) => { document.body.classList.toggle('dark-mode', enabled); };
  const updateActiveServicesBadge = () => { if (activeTabs.length > 0) { elements.activeServicesBadge.style.display = 'inline-flex'; elements.activeServicesBadge.textContent = activeTabs.length; } else { elements.activeServicesBadge.style.display = 'none'; } };

  const injectCustomCode = (webview) => {
    if (!webview) return;
    if (config.customCss) { try { const eCss = config.customCss.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$'); webview.executeJavaScript(`(function() { const s=document.createElement('style'); s.id='aihub-custom-css'; const e=document.getElementById('aihub-custom-css'); if(e)e.remove(); s.textContent=\`${eCss}\`; document.head.appendChild(s); })();`).catch(()=>{}); } catch (e) {} }
    if (config.customJs) { try { webview.executeJavaScript(config.customJs).catch(()=>{}); } catch (e) {} }
  };

  const applyFontSize = (webview) => {
    if (!webview) return;
    const p = getFontSizePercent(config.fontSize);
    if (p !== 100) { try { webview.executeJavaScript(`document.documentElement.style.fontSize = '${p}%';`).catch(()=>{}); } catch (e) {} }
  };

  const loadConfig = async () => {
    try {
      config = await window.electronAPI.getConfig();
      elements.toggleBlocking.checked = config.blockingEnabled;
      elements.maxServicesInput.value = config.maxActiveServices;
      elements.lastUpdate.textContent = formatDate(config.lastUpdate);
      updateBlockingUI(config.blockingEnabled);
      applyDarkMode(config.darkMode);

      if (elements.toggleLoadLast) elements.toggleLoadLast.checked = config.loadLastOpenedAI !== false;
      if (elements.toggleThirdPartyCookies) elements.toggleThirdPartyCookies.checked = !!config.thirdPartyCookies;
      if (elements.toggleProxy) elements.toggleProxy.checked = !!config.proxyEnabled;
      if (elements.proxyConfigSection) elements.proxyConfigSection.style.display = config.proxyEnabled ? 'block' : 'none';
      if (elements.proxyTypeSelect) elements.proxyTypeSelect.value = config.proxyType || 'http';
      if (elements.proxyHostInput) elements.proxyHostInput.value = config.proxyHost || '';
      if (elements.proxyPortInput) elements.proxyPortInput.value = config.proxyPort || '';
      if (elements.updateFrequencySelect) elements.updateFrequencySelect.value = String(config.updateFrequencyDays || 3);
      if (elements.fontSizeSelect) elements.fontSizeSelect.value = config.fontSize || 'medium';
      if (elements.customJsEditor) elements.customJsEditor.value = config.customJs || '';
      if (elements.customCssEditor) elements.customCssEditor.value = config.customCss || '';

      injectionDirty = { js: false, css: false };
      if (elements.jsUnsaved) elements.jsUnsaved.classList.remove('visible');
      if (elements.cssUnsaved) elements.cssUnsaved.classList.remove('visible');

      populateDefaultServiceSelect();
      renderSidebarServices();
      renderSettingsServices();
    } catch (error) { console.error(error); }
  };

  const loadServices = async () => {
    try {
      const data = await window.electronAPI.getServices();
      if (data && data.ai_services) {
        allServices = data.ai_services;
        populateCategoryFilter();
        populateSidebarCategories();
        populateDefaultServiceSelect();
        renderSidebarServices();
        renderSettingsServices();
      }
    } catch (error) { console.error(error); }
  };

  const populateDefaultServiceSelect = () => {
    if (!elements.defaultServiceSelect) return;
    const select = elements.defaultServiceSelect;
    const currentValue = config.defaultService || 'chatgpt';
    select.innerHTML = '';
    allServices.filter(s => config.enabledServices.includes(generateId(s[0]))).forEach(service => {
      const id = generateId(service[0]);
      const option = document.createElement('option'); option.value = id; option.textContent = service[0];
      if (id === currentValue) option.selected = true;
      select.appendChild(option);
    });
  };

  const populateCategoryFilter = () => {
    if (!elements.categoryFilter) return;
    const categories = new Set();
    allServices.forEach(s => { if (s[2]) categories.add(s[2]); });
    elements.categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    [...categories].sort().forEach(cat => { const option = document.createElement('option'); option.value = cat.toLowerCase(); option.textContent = cat; elements.categoryFilter.appendChild(option); });
  };

  const populateSidebarCategories = () => {
    if (!elements.sidebarCategories) return;
    const categories = new Set();
    allServices.filter(s => config.enabledServices.includes(generateId(s[0]))).forEach(s => { if (s[2]) categories.add(s[2]); });
    elements.sidebarCategories.innerHTML = '';
    const allChip = document.createElement('span'); allChip.className = 'sidebar-category-chip active'; allChip.textContent = 'All'; allChip.dataset.category = 'all';
    allChip.addEventListener('click', () => { sidebarFilter = 'all'; elements.sidebarCategories.querySelectorAll('.sidebar-category-chip').forEach(c => c.classList.remove('active')); allChip.classList.add('active'); renderSidebarServices(); });
    elements.sidebarCategories.appendChild(allChip);

    if (config.favoriteServices && config.favoriteServices.length > 0) {
      const favChip = document.createElement('span'); favChip.className = 'sidebar-category-chip'; favChip.textContent = '\u2605 Favs'; favChip.dataset.category = 'favorites';
      favChip.addEventListener('click', () => { sidebarFilter = 'favorites'; elements.sidebarCategories.querySelectorAll('.sidebar-category-chip').forEach(c => c.classList.remove('active')); favChip.classList.add('active'); renderSidebarServices(); });
      elements.sidebarCategories.appendChild(favChip);
    }

    [...categories].sort().forEach(cat => {
      const chip = document.createElement('span'); chip.className = 'sidebar-category-chip'; chip.textContent = cat; chip.dataset.category = cat.toLowerCase();
      chip.addEventListener('click', () => { sidebarFilter = cat.toLowerCase(); elements.sidebarCategories.querySelectorAll('.sidebar-category-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); renderSidebarServices(); });
      elements.sidebarCategories.appendChild(chip);
    });
  };

  const sortServicesByOrder = (services) => {
    const order = config.serviceOrder || [];
    if (order.length === 0) return services;
    return [...services].sort((a, b) => { const iA = order.indexOf(generateId(a[0])); const iB = order.indexOf(generateId(b[0])); if (iA !== -1 && iB !== -1) return iA - iB; if (iA !== -1) return -1; if (iB !== -1) return 1; return 0; });
  };

  const renderSidebarServices = () => {
    const enabledServices = allServices.filter(s => config.enabledServices.includes(generateId(s[0])));
    if (enabledServices.length === 0) { elements.servicesList.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 10px;">No active services.<br>Go to Settings.</div>`; return; }

    let filteredServices = enabledServices;
    if (sidebarSearchQuery) { const q = sidebarSearchQuery.toLowerCase(); filteredServices = filteredServices.filter(s => s[0] && s[0].toLowerCase().includes(q)); }
    if (sidebarFilter !== 'all' && sidebarFilter !== 'favorites') { filteredServices = filteredServices.filter(s => s[2] && s[2].toLowerCase() === sidebarFilter); }
    filteredServices = sortServicesByOrder(filteredServices);

    const favorites = filteredServices.filter(s => config.favoriteServices && config.favoriteServices.includes(generateId(s[0])));
    const nonFavorites = filteredServices.filter(s => !config.favoriteServices || !config.favoriteServices.includes(generateId(s[0])));
    const showFavorites = sidebarFilter === 'favorites' ? favorites : (favorites.length > 0 && sidebarFilter === 'all');
    const showNonFavorites = sidebarFilter === 'favorites' ? [] : nonFavorites;

    elements.servicesList.innerHTML = '';
    if (showFavorites && favorites.length > 0) {
      const label = document.createElement('div'); label.className = 'sidebar-section-label'; label.textContent = 'FAVORITES'; elements.servicesList.appendChild(label);
      favorites.forEach(service => elements.servicesList.appendChild(createSidebarItem(service)));
      if (showNonFavorites.length > 0) { const divider = document.createElement('div'); divider.className = 'sidebar-divider'; elements.servicesList.appendChild(divider); }
    }
    if (showNonFavorites.length > 0) {
      if (showFavorites && favorites.length > 0 && sidebarFilter === 'all') { const label = document.createElement('div'); label.className = 'sidebar-section-label'; label.textContent = 'ALL SERVICES'; elements.servicesList.appendChild(label); }
      showNonFavorites.forEach(service => elements.servicesList.appendChild(createSidebarItem(service)));
    }
    updateActiveServicesBadge();
  };

  // FIX 1: LÓGICA DE COLORES DEL SIDEBAR (Sin punto, nombre con color)
  const createSidebarItem = (service) => {
    const [name, url, type, privacy, color] = service;
    const id = generateId(name); const bgColor = sanitizeColor(color);
    const isOpen = activeTabs.some(t => t.id === id); const isActive = id === currentTabId;
    const isFavorite = config.favoriteServices && config.favoriteServices.includes(id);

    const item = document.createElement('div');
    item.className = `service-launcher ${isActive ? 'active' : ''} ${isOpen ? 'is-open' : ''}`;
    item.dataset.id = id;
    item.innerHTML = `
    <div class="launcher-info">
    <div class="service-name" style="color: ${bgColor}">${escapeHtml(name)}</div>
    </div>
    <div style="display:flex; align-items:center; gap:2px;">
    <button class="btn-fav ${isFavorite ? 'is-favorite' : ''}" data-id="${id}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">${isFavorite ? '\u2605' : '\u2606'}</button>
    <div class="launcher-actions"><button class="btn-xs btn-reload" title="Reload">&#8635;</button><button class="btn-xs btn-close" title="Close">&#10005;</button></div>
    </div>`;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.btn-close')) closeTab(id);
      else if (e.target.closest('.btn-reload')) reloadTab(id);
      else if (e.target.closest('.btn-fav')) toggleFavorite(id);
      else { if (isOpen) switchToTab(id); else createTab(id, url, name); }
    });
    return item;
  };

  const toggleFavorite = async (serviceId) => { try { config.favoriteServices = await window.electronAPI.toggleFavorite(serviceId); renderSidebarServices(); populateSidebarCategories(); } catch (error) {} };

  // FIX 2: LÓGICA DE COLORES EN AJUSTES (Punto de color, nombre normal)
  const renderSettingsServices = () => {
    elements.allServicesList.innerHTML = '';
    let filteredServices = allServices;
    if (currentFilter !== 'all') filteredServices = filteredServices.filter(s => s[2] && s[2].toLowerCase() === currentFilter);
    if (searchQuery) { const q = searchQuery.toLowerCase(); filteredServices = filteredServices.filter(s => s[0] && s[0].toLowerCase().includes(q)); }

    if (filteredServices.length === 0) { elements.allServicesList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No services match your filter.</div>'; return; }

    const enabledFiltered = filteredServices.filter(s => config.enabledServices.includes(generateId(s[0])));
    const disabledFiltered = filteredServices.filter(s => !config.enabledServices.includes(generateId(s[0])));
    const sortedAll = [...sortServicesByOrder(enabledFiltered), ...disabledFiltered];

    sortedAll.forEach((service, index) => {
      const [name, url, type, privacy, color] = service;
      const id = generateId(name); const bgColor = sanitizeColor(color);
      const isEnabled = config.enabledServices.includes(id);

      const item = document.createElement('div'); item.className = 'service-setting-item';
      item.innerHTML = `
      <div class="service-info">
      ${isEnabled ? `<div class="service-reorder-controls"><button class="btn-reorder" data-id="${id}" data-dir="up">&#9650;</button><button class="btn-reorder" data-id="${id}" data-dir="down">&#9660;</button></div>` : ''}
      <div class="service-dot" style="background-color: ${bgColor}"></div>
      <div class="service-info-details">
      <div class="service-info-name">${escapeHtml(name)}</div>
      <div class="service-info-badges">${getPricingBadge(type)} ${getPrivacyBadge(privacy)}</div>
      </div>
      </div>
      <label class="toggle-switch material-toggle"><input type="checkbox" ${isEnabled ? 'checked' : ''} data-service-id="${id}"><span class="toggle-slider"></span></label>`;

      item.querySelector('input[type="checkbox"]').addEventListener('change', async (e) => {
        config.enabledServices = await window.electronAPI.toggleService(e.target.dataset.serviceId);
        populateDefaultServiceSelect(); populateSidebarCategories(); renderSidebarServices(); renderSettingsServices();
      });
      item.querySelectorAll('.btn-reorder').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation(); const serviceId = btn.dataset.id; const dir = btn.dataset.dir;
          const order = config.serviceOrder || [...config.enabledServices]; const idx = order.indexOf(serviceId);
          if (idx === -1) return;
          if (dir === 'up' && idx > 0) [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
          else if (dir === 'down' && idx < order.length - 1) [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
          config.serviceOrder = await window.electronAPI.setServiceOrder(order); renderSidebarServices(); renderSettingsServices();
        });
      });
      elements.allServicesList.appendChild(item);
    });
  };

  const setupWebviewListeners = (webview, serviceId) => {
    webview.addEventListener('new-window', async (e) => {
      e.preventDefault();
      if (e.url && (e.url.startsWith('http://') || e.url.startsWith('https://'))) {
        await window.electronAPI.openLoginWindow(e.url, serviceId);
      }
    });
    webview.addEventListener('did-finish-load', () => { if (serviceId === currentTabId) hideErrorOverlay(); injectCustomCode(webview); applyFontSize(webview); });
    webview.addEventListener('did-fail-load', (event) => { if (serviceId === currentTabId) showErrorOverlay(`Error: ${event.errorDescription}`); });

    webview.addEventListener('context-menu', async (e) => {
      e.preventDefault(); const menuItems = [];
      menuItems.push({ label: 'Go Back', action: () => webview.goBack(), enabled: webview.canGoBack() });
      menuItems.push({ label: 'Go Forward', action: () => webview.goForward(), enabled: webview.canGoForward() });
      menuItems.push({ label: 'Reload', action: () => webview.reload() });
      menuItems.push({ type: 'separator' });
      menuItems.push({ label: 'Open Page in Browser', action: async () => { const u = webview.getURL(); if(u) await window.electronAPI.openInBrowser(u); } });
      showContextMenu(menuItems, e);
    });
  };

  const showContextMenu = (items, event) => {
    const existingMenu = document.getElementById('custom-context-menu'); if (existingMenu) existingMenu.remove();
    const menu = document.createElement('div'); menu.id = 'custom-context-menu'; menu.className = 'context-menu';
    items.forEach(item => {
      if (item.type === 'separator') { const sep = document.createElement('div'); sep.className = 'context-menu-separator'; menu.appendChild(sep); }
      else { const menuItem = document.createElement('div'); menuItem.className = 'context-menu-item'; if (item.enabled === false) menuItem.classList.add('disabled'); menuItem.textContent = item.label; menuItem.addEventListener('click', () => { menu.remove(); if (item.enabled !== false && item.action) item.action(); }); menu.appendChild(menuItem); }
    });
    const x = event.clientX || 0; const y = event.clientY || 0; menu.style.left = `${x}px`; menu.style.top = `${y}px`;
    document.body.appendChild(menu);
    requestAnimationFrame(() => { const rect = menu.getBoundingClientRect(); if (rect.right > window.innerWidth) menu.style.left = `${window.innerWidth - rect.width - 5}px`; if (rect.bottom > window.innerHeight) menu.style.top = `${window.innerHeight - rect.height - 5}px`; });
    const closeMenu = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeMenu); } }; setTimeout(() => document.addEventListener('click', closeMenu), 10);
  };

  const createTab = (serviceId, url, title) => {
    if (activeTabs.length >= config.maxActiveServices) { alert(`Limit reached (${config.maxActiveServices}). Close a tab first.`); return; }
    const webview = document.createElement('webview');
    webview.dataset.id = serviceId;
    webview.setAttribute('src', url);
    webview.setAttribute('partition', `persist:${serviceId}`);

    webview.style.display = 'none';
    elements.webviewsContainer.appendChild(webview);
    setupWebviewListeners(webview, serviceId);

    activeTabs.push({ id: serviceId, url, title, webview, zoomLevel: 0 });
    switchToTab(serviceId); window.electronAPI.setActiveService(serviceId); renderSidebarServices();
  };

  const switchToTab = (id) => { currentTabId = id; hideErrorOverlay(); activeTabs.forEach(t => t.webview.style.display = (t.id === id) ? 'flex' : 'none'); elements.welcomeScreen.style.display = 'none'; window.electronAPI.setActiveService(id); renderSidebarServices(); };
  const closeTab = (id) => { const i = activeTabs.findIndex(t => t.id === id); if (i === -1) return; activeTabs[i].webview.remove(); activeTabs.splice(i, 1); if (activeTabs.length > 0) switchToTab(activeTabs[Math.min(i, activeTabs.length - 1)].id); else { currentTabId = null; elements.welcomeScreen.style.display = 'flex'; hideErrorOverlay(); } renderSidebarServices(); };
  const reloadTab = (id) => { const t = activeTabs.find(t => t.id === id); if (t) { hideErrorOverlay(); t.webview.reload(); } };

  const showUpdateDetails = (details) => {
    if (!details || !details.hasChanges) { elements.updateDetailsBody.innerHTML = '<div class="update-no-changes">No changes detected.</div>'; }
    else { let html = ''; const renderCat = (title, items, cssClass) => { if (items.length === 0) return ''; return `<div class="update-category"><div class="update-category-title">${title}</div><ul class="update-category-list">${items.map(i => `<li class="${cssClass}">${escapeHtml(i)}</li>`).join('')}</ul></div>`; }; html += renderCat('AI Services Added', details.servicesAdded || [], 'added'); html += renderCat('AI Services Removed', details.servicesRemoved || [], 'removed'); html += renderCat('AI Services Changed', details.servicesChanged || [], 'changed'); html += renderCat('Domain Rules Added/Updated', details.domainsAdded || [], 'added'); elements.updateDetailsBody.innerHTML = html; }
    elements.updateDetailsModal.classList.remove('hidden');
  };
  const hideUpdateDetails = () => { elements.updateDetailsModal.classList.add('hidden'); pendingUpdateDetails = null; };

  elements.toggleSidebarBtn.addEventListener('click', () => elements.sidebar.classList.toggle('hidden'));
  elements.btnSettings.addEventListener('click', () => { renderSettingsServices(); populateDefaultServiceSelect(); elements.settingsPanel.classList.remove('hidden'); });
  elements.btnCloseSettings.addEventListener('click', () => elements.settingsPanel.classList.add('hidden'));

  elements.btnSaveSettings.addEventListener('click', async () => {
    const newConfig = {
      blockingEnabled: elements.toggleBlocking.checked,
      maxActiveServices: parseInt(elements.maxServicesInput.value) || 3,
                                            darkMode: true,
                                            loadLastOpenedAI: elements.toggleLoadLast ? elements.toggleLoadLast.checked : true,
                                            defaultService: elements.defaultServiceSelect ? elements.defaultServiceSelect.value : 'chatgpt',
                                              thirdPartyCookies: elements.toggleThirdPartyCookies ? elements.toggleThirdPartyCookies.checked : false,
                                              updateFrequencyDays: elements.updateFrequencySelect ? parseInt(elements.updateFrequencySelect.value) : 3,
                                            fontSize: elements.fontSizeSelect ? elements.fontSizeSelect.value : 'medium',
                                            proxyEnabled: elements.toggleProxy ? elements.toggleProxy.checked : false,
                                            proxyType: elements.proxyTypeSelect ? elements.proxyTypeSelect.value : 'http',
                                            proxyHost: elements.proxyHostInput ? elements.proxyHostInput.value : '',
                                            proxyPort: elements.proxyPortInput ? elements.proxyPortInput.value : ''
    };
    try {
      config = await window.electronAPI.saveConfig(newConfig);
      if (elements.toggleProxy) await window.electronAPI.setProxy(newConfig);
      if (elements.toggleThirdPartyCookies) await window.electronAPI.setThirdPartyCookies(newConfig.thirdPartyCookies);
      updateBlockingUI(config.blockingEnabled); applyDarkMode(config.darkMode);
      if (config.fontSize !== 'medium') activeTabs.forEach(tab => applyFontSize(tab.webview));
      elements.settingsPanel.classList.add('hidden');
    } catch (error) { console.error('[Save] Error:', error); }
  });

  if (elements.toggleProxy) elements.toggleProxy.addEventListener('change', () => elements.proxyConfigSection.style.display = elements.toggleProxy.checked ? 'block' : 'none');
  if (elements.btnSaveInjection) elements.btnSaveInjection.addEventListener('click', async () => { const r = await window.electronAPI.saveCustomInjection(elements.customJsEditor.value, elements.customCssEditor.value); config.customJs = r.customJs; config.customCss = r.customCss; injectionDirty = { js: false, css: false }; if(elements.jsUnsaved) elements.jsUnsaved.classList.remove('visible'); if(elements.cssUnsaved) elements.cssUnsaved.classList.remove('visible'); activeTabs.forEach(tab => injectCustomCode(tab.webview)); });
  if (elements.customJsEditor) elements.customJsEditor.addEventListener('input', () => { injectionDirty.js = true; if(elements.jsUnsaved) elements.jsUnsaved.classList.add('visible'); });
  if (elements.customCssEditor) elements.customCssEditor.addEventListener('input', () => { injectionDirty.css = true; if(elements.cssUnsaved) elements.cssUnsaved.classList.add('visible'); });

  if (elements.btnClearCache) elements.btnClearCache.addEventListener('click', async () => { await window.electronAPI.clearCache(); elements.btnClearCache.textContent = 'Cleared!'; setTimeout(() => elements.btnClearCache.textContent = 'Clear Cache', 2000); });
  if (elements.btnClearAllData) elements.btnClearAllData.addEventListener('click', () => elements.clearAllDataModal.classList.remove('hidden'));
  if (elements.btnCancelClearAll) elements.btnCancelClearAll.addEventListener('click', () => elements.clearAllDataModal.classList.add('hidden'));
  if (elements.btnConfirmClearAll) elements.btnConfirmClearAll.addEventListener('click', async () => { elements.clearAllDataModal.classList.add('hidden'); await window.electronAPI.clearAllData(); activeTabs.forEach(tab => tab.webview.reload()); });

  elements.btnZoomIn.addEventListener('click', () => { const t = activeTabs.find(t => t.id === currentTabId); if(t) { t.zoomLevel += 0.5; t.webview.setZoomLevel(t.zoomLevel); }});
  elements.btnZoomOut.addEventListener('click', () => { const t = activeTabs.find(t => t.id === currentTabId); if(t) { t.zoomLevel -= 0.5; t.webview.setZoomLevel(t.zoomLevel); }});
  elements.btnZoomReset.addEventListener('click', () => { const t = activeTabs.find(t => t.id === currentTabId); if(t) { t.zoomLevel = 0; t.webview.setZoomLevel(0); }});
  elements.btnOpenBrowser.addEventListener('click', async () => { const t = activeTabs.find(t => t.id === currentTabId); if(t) await window.electronAPI.openInBrowser(t.webview.src); });
  elements.btnReloadPage.addEventListener('click', () => { if (currentTabId) reloadTab(currentTabId); });
  if (elements.btnRetry) elements.btnRetry.addEventListener('click', () => { if (currentTabId) { hideErrorOverlay(); reloadTab(currentTabId); } });

  elements.btnClearData.addEventListener('click', () => elements.clearDataModal.classList.remove('hidden'));
  elements.btnCancelClear.addEventListener('click', () => elements.clearDataModal.classList.add('hidden'));
  elements.btnConfirmClear.addEventListener('click', async () => { elements.clearDataModal.classList.add('hidden'); if(currentTabId) { await window.electronAPI.clearServiceData(currentTabId); reloadTab(currentTabId); } });

  elements.btnUpdate.addEventListener('click', async () => {
    elements.blockingText.textContent = 'Updating...';
    const result = await window.electronAPI.updateRemoteData();
    if (result.success) { if (result.updated) { await loadServices(); config.lastUpdate = new Date().toISOString(); elements.lastUpdate.textContent = formatDate(config.lastUpdate); elements.blockingText.textContent = 'Updated!'; } else { elements.blockingText.textContent = 'Up to date'; } } else { elements.blockingText.textContent = 'Update Failed'; }
    setTimeout(() => updateBlockingUI(config.blockingEnabled), 2500);
  });

  if (elements.btnCloseUpdateDetails) elements.btnCloseUpdateDetails.addEventListener('click', hideUpdateDetails);
  if (elements.btnDismissUpdate) elements.btnDismissUpdate.addEventListener('click', hideUpdateDetails);
  if (elements.btnApplyUpdate) elements.btnApplyUpdate.addEventListener('click', () => { hideUpdateDetails(); activeTabs.forEach(tab => tab.webview.reload()); renderSidebarServices(); });

  elements.modalTabs.forEach(tab => { tab.addEventListener('click', (e) => { elements.modalTabs.forEach(t => t.classList.remove('active')); elements.tabContents.forEach(c => c.classList.remove('active')); e.target.classList.add('active'); document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active'); }); });
  document.querySelectorAll('.about-link-btn').forEach(link => { link.addEventListener('click', async (e) => { e.preventDefault(); if(e.target.dataset.url) await window.electronAPI.openInBrowser(e.target.dataset.url); }); });

  if (elements.serviceSearch) elements.serviceSearch.addEventListener('input', (e) => { searchQuery = e.target.value.trim(); renderSettingsServices(); });
  if (elements.categoryFilter) elements.categoryFilter.addEventListener('change', (e) => { currentFilter = e.target.value; renderSettingsServices(); });
  if (elements.sidebarSearchInput) elements.sidebarSearchInput.addEventListener('input', (e) => { sidebarSearchQuery = e.target.value.trim(); renderSidebarServices(); });

  window.electronAPI.onLoginWindowClosed((serviceId) => { const tab = activeTabs.find(t => t.id === serviceId); if (tab) tab.webview.reload(); });
  window.electronAPI.onAutoUpdateAvailable((details) => { if (details && details.hasChanges) { pendingUpdateDetails = details; loadServices(); showUpdateDetails(details); } });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { elements.settingsPanel.classList.add('hidden'); elements.clearDataModal.classList.add('hidden'); if(elements.clearAllDataModal) elements.clearAllDataModal.classList.add('hidden'); if(elements.updateDetailsModal) elements.updateDetailsModal.classList.add('hidden'); }
    if (e.ctrlKey && e.key === '=') { e.preventDefault(); elements.btnZoomIn.click(); }
    if (e.ctrlKey && e.key === '-') { e.preventDefault(); elements.btnZoomOut.click(); }
    if (e.ctrlKey && e.key === '0') { e.preventDefault(); elements.btnZoomReset.click(); }
  });

  const init = async () => {
    await loadConfig(); await loadServices();
    if (!config.serviceOrder || config.serviceOrder.length === 0) { config.serviceOrder = [...config.enabledServices]; await window.electronAPI.setServiceOrder(config.serviceOrder); }
    let serviceToOpen = null;
    if (config.loadLastOpenedAI !== false && config.lastActiveService && config.enabledServices.includes(config.lastActiveService)) serviceToOpen = allServices.find(s => generateId(s[0]) === config.lastActiveService);
    if (!serviceToOpen && config.defaultService && config.enabledServices.includes(config.defaultService)) serviceToOpen = allServices.find(s => generateId(s[0]) === config.defaultService);
    if (serviceToOpen) createTab(generateId(serviceToOpen[0]), serviceToOpen[1], serviceToOpen[0]);
  };
    init();
});
