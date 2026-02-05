/**
 * TimeVault - Work Hours Tracker PWA
 * Production-ready application with auto-save, sync, and offline support
 * @version 2.1.0
 */

(function () {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    STORAGE_PREFIX: 'timeVault_',
    SCHEMA_VERSION: '2.1.0',
    DEBOUNCE_DELAY: 800,
    SYNC_INTERVAL: 60000,
    API_TIMEOUT: 10000,
    MAX_TOAST_DURATION: 4000,
    ANIMATION_DURATION: 300,
    SYNC_API_URL: 'https://api.jsonbin.io/v3/b',
    SYNC_API_KEY: '$2a$10$YOUR_API_KEY_HERE',
    SYNC_ENABLED: false
  };

  // Sync check: Disable if key is placeholder
  if (CONFIG.SYNC_API_KEY && !CONFIG.SYNC_API_KEY.includes('YOUR_API_KEY')) {
    CONFIG.SYNC_ENABLED = true;
  }

  const STORAGE_KEYS = {
    SETTINGS: 'timeVault_settings',
    ENTRIES: 'timeVault_entries',
    USER_EMAIL: 'timeVault_userEmail',
    USER_ID: 'timeVault_userId',
    LAST_SYNC: 'timeVault_lastSync',
    THEME: 'timeVault_theme',
    SYNC_BIN_ID: 'timeVault_syncBinId',
    SCHEMA_VER: 'timeVault_schemaVersion'
  };

  // ============================================
  // DEFAULT STATE
  // ============================================
  const DEFAULT_SETTINGS = {
    hourlyRate: 35,
    overtimeRate: 1.5,
    overtimeThreshold: 40,
    defaultBreak: 30,
    weekStart: 1 // Monday
  };

  // ============================================
  // APPLICATION STATE
  // ============================================
  let state = {
    settings: { ...DEFAULT_SETTINGS },
    entries: {},
    userEmail: null,
    userId: null,
    currentWeekStart: null,
    editingDate: null,
    isOnline: navigator.onLine,
    lastSyncTime: null,
    theme: 'dark',
    syncBinId: null,
    isSyncing: false
  };

  // ============================================
  // DOM CACHE
  // ============================================
  const DOM = {};

  function cacheDOM() {
    DOM.emailModal = document.getElementById('email-modal');
    DOM.settingsModal = document.getElementById('settings-modal');
    DOM.editModal = document.getElementById('edit-modal');
    DOM.installBanner = document.getElementById('install-banner');
    DOM.loading = document.querySelector('.loading');
    DOM.appContainer = document.querySelector('.app-container');
    DOM.userEmailInput = document.getElementById('user-email');
    DOM.saveEmailBtn = document.getElementById('save-email');
    DOM.skipEmailBtn = document.getElementById('skip-email');
    DOM.closeEmailModalBtn = document.getElementById('close-email-modal');
    DOM.settingsBtn = document.getElementById('settings-btn');
    DOM.closeSettingsBtn = document.getElementById('close-settings');
    DOM.saveSettingsBtn = document.getElementById('save-settings');
    DOM.resetSettingsBtn = document.getElementById('reset-settings');
    DOM.hourlyRateInput = document.getElementById('hourly-rate');
    DOM.overtimeRateInput = document.getElementById('overtime-rate');
    DOM.overtimeThresholdInput = document.getElementById('overtime-threshold');
    DOM.defaultBreakInput = document.getElementById('default-break');
    DOM.weekStartSelect = document.getElementById('week-start');
    DOM.closeEditBtn = document.getElementById('close-edit');
    DOM.saveEntryBtn = document.getElementById('save-entry');
    DOM.deleteEntryBtn = document.getElementById('delete-entry');
    DOM.editDateLabel = document.getElementById('edit-date-label');
    DOM.editStart = document.getElementById('edit-start');
    DOM.editEnd = document.getElementById('edit-end');
    DOM.editBreak = document.getElementById('edit-break');
    DOM.editCalculatedHours = document.getElementById('edit-calculated-hours');
    DOM.quickAddForm = document.getElementById('quick-add-form');
    DOM.quickStart = document.getElementById('quick-start');
    DOM.quickEnd = document.getElementById('quick-end');
    DOM.quickBreak = document.getElementById('quick-break');
    DOM.calculatedHours = document.getElementById('calculated-hours');
    DOM.addTodayBtn = document.getElementById('add-today');
    DOM.adjustDay = document.getElementById('adjust-day');
    DOM.adjHours = document.getElementById('adj-hours');
    DOM.adjMinus = document.getElementById('adj-minus');
    DOM.adjPlus = document.getElementById('adj-plus');
    DOM.prevWeekBtn = document.getElementById('prev-week');
    DOM.nextWeekBtn = document.getElementById('next-week');
    DOM.todayBtn = document.getElementById('today-btn');
    DOM.weekLabel = document.getElementById('week-label');
    DOM.weekDates = document.getElementById('week-dates');
    DOM.weekGrid = document.getElementById('week-grid');
    DOM.barChart = document.getElementById('bar-chart');
    DOM.syncStatus = document.getElementById('sync-status');
    DOM.syncText = document.getElementById('sync-text');
    DOM.userInfo = document.getElementById('user-info');
    DOM.userEmailDisplay = document.getElementById('user-email-display');
    DOM.logoutBtn = document.getElementById('logout-btn');
    DOM.weeklyHours = document.getElementById('weekly-hours');
    DOM.overtimeHours = document.getElementById('overtime-hours');
    DOM.weeklyEarnings = document.getElementById('weekly-earnings');
    DOM.daysWorked = document.getElementById('days-worked');
    DOM.exportBtn = document.getElementById('export-btn');
    DOM.exportPdfBtn = document.getElementById('export-pdf-btn');
    DOM.clearWeekBtn = document.getElementById('clear-week-btn');
    DOM.installBtn = document.getElementById('install-btn');
    DOM.dismissInstallBtn = document.getElementById('dismiss-install');
    DOM.toastContainer = document.getElementById('toast-container');
    DOM.themeToggle = document.getElementById('theme-toggle');
  }

  // ============================================
  // STORAGE UTILITIES
  // ============================================
  const Storage = {
    save(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          showToast('Storage full. Please clear some data.', 'error');
        }
        return false;
      }
    },
    load(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    },
    getString(key) {
      return localStorage.getItem(key);
    },
    setString(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  // ============================================
  // THEME MANAGER
  // ============================================
  const ThemeManager = {
    themes: ['nebula', 'glassmorph', 'abstract'],
    init() {
      const saved = Storage.getString(STORAGE_KEYS.THEME);
      state.theme = this.themes.includes(saved) ? saved : 'nebula';
      this.apply(state.theme);
    },
    apply(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      state.theme = theme;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
        meta.content = bg || '#0f0c29';
      }
    },
    toggle() {
      const idx = (this.themes.indexOf(state.theme) + 1) % this.themes.length;
      const newTheme = this.themes[idx];
      Storage.setString(STORAGE_KEYS.THEME, newTheme);
      this.apply(newTheme);
      showToast(`Theme: ${newTheme.toUpperCase()}`, 'info');
    }
  };

  // ============================================
  // CLOUD SYNC MANAGER (Hardened)
  // ============================================
  const CloudSync = {
    syncInterval: null,
    async init() {
      if (!CONFIG.SYNC_ENABLED) {
        updateSyncStatus('offline', 'Local mode');
        return;
      }
      if (!state.userId || !state.userEmail) return;
      state.syncBinId = Storage.getString(STORAGE_KEYS.SYNC_BIN_ID);
      if (state.syncBinId && state.isOnline) await this.pull();
      this.startAutoSync();
    },
    startAutoSync() {
      if (!CONFIG.SYNC_ENABLED) return;
      if (this.syncInterval) clearInterval(this.syncInterval);
      this.syncInterval = setInterval(() => {
        if (state.isOnline && state.userId && !state.isSyncing) this.push();
      }, CONFIG.SYNC_INTERVAL);
    },
    stopAutoSync() {
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
    },
    getSyncData() {
      return {
        version: CONFIG.SCHEMA_VERSION,
        userId: state.userId,
        email: state.userEmail,
        lastModified: new Date().toISOString(),
        entries: state.entries,
        settings: state.settings
      };
    },
    async push() {
      if (!CONFIG.SYNC_ENABLED || !state.userId || state.isSyncing || !state.isOnline) return false;
      state.isSyncing = true;
      updateSyncStatus('syncing', 'Syncing...');
      try {
        const syncData = this.getSyncData();
        const syncKey = `timeVault_cloudData_${state.userId}`;
        Storage.save(syncKey, syncData);
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('timevault_sync');
          channel.postMessage({ type: 'sync_update', data: syncData });
          channel.close();
        }
        state.lastSyncTime = new Date().toISOString();
        Storage.setString(STORAGE_KEYS.LAST_SYNC, state.lastSyncTime);
        updateSyncStatus('synced', 'Synced');
        return true;
      } catch (error) {
        updateSyncStatus('error', 'Sync failed');
        return false;
      } finally {
        state.isSyncing = false;
      }
    },
    async pull() {
      if (!CONFIG.SYNC_ENABLED || !state.userId || state.isSyncing || !state.isOnline) return false;
      state.isSyncing = true;
      updateSyncStatus('syncing', 'Updating...');
      try {
        const syncKey = `timeVault_cloudData_${state.userId}`;
        const remoteData = Storage.load(syncKey, null);
        if (remoteData && remoteData.entries) {
          state.entries = this.mergeData(state.entries, remoteData.entries);
          if (remoteData.settings) state.settings = { ...DEFAULT_SETTINGS, ...remoteData.settings };
          saveEntries();
          saveSettings();
          updateSyncStatus('synced', 'Up to date');
          return true;
        }
        updateSyncStatus('synced', 'Ready');
        return false;
      } catch (error) {
        updateSyncStatus('error', 'Update failed');
        return false;
      } finally {
        state.isSyncing = false;
      }
    },
    mergeData(local, remote) {
      if (!remote) return local || {};
      if (!local) return remote || {};
      const merged = { ...local };
      for (const [dateKey, remoteEntry] of Object.entries(remote)) {
        const localEntry = local[dateKey];
        if (!localEntry || (remoteEntry.updatedAt && new Date(remoteEntry.updatedAt) > new Date(localEntry.updatedAt))) {
          merged[dateKey] = remoteEntry;
        }
      }
      return merged;
    },
    setupBroadcastListener() {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('timevault_sync');
        channel.onmessage = (event) => {
          if (event.data.type === 'sync_update' && event.data.data.userId === state.userId) {
            state.entries = this.mergeData(state.entries, event.data.data.entries);
            renderWeekGrid(); renderBarChart(); updateStats();
            showToast('Sync updated from other tab', 'info');
          }
        };
      }
    },
    async forceSync() {
      if (!CONFIG.SYNC_ENABLED) { showToast('Sync disabled', 'warning'); return; }
      if (!state.userId) { showToast('Setup email first', 'warning'); return; }
      showToast('Syncing...', 'info');
      await this.push();
      showToast('Sync complete', 'success');
    }
  };

  // ============================================
  // DATE UTILITIES
  // ============================================
  const DateUtils = {
    getWeekStart(date, weekStartDay = state.settings.weekStart) {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day < weekStartDay ? weekStartDay - 7 : weekStartDay);
      const res = new Date(d.setDate(diff));
      res.setHours(0, 0, 0, 0);
      return res;
    },
    getWeekDays(weekStart) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        days.push(d);
      }
      return days;
    },
    formatDate(date) { return date.toISOString().split('T')[0]; },
    formatDisplayDate(date) { return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); },
    formatShortDate(date) { return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); },
    formatDayName(date) { return date.toLocaleDateString('en-US', { weekday: 'short' }); },
    isToday(date) { return date.toDateString() === new Date().toDateString(); },
    isCurrentWeek(weekStart) { return weekStart.getTime() === this.getWeekStart(new Date()).getTime(); }
  };

  // ============================================
  // TIME CALC
  // ============================================
  const TimeCalc = {
    calculateHours(start, end, breakMins = 0) {
      if (!start || !end) return 0;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let s = sh * 60 + sm, e = eh * 60 + em;
      if (e < s) e += 1440;
      return Math.max(0, (e - s - breakMins) / 60);
    },
    calculateWeeklyStats(entries, weekStart, settings) {
      const days = DateUtils.getWeekDays(weekStart);
      let total = 0, worked = 0;
      days.forEach(d => {
        const k = DateUtils.formatDate(d);
        if (entries[k]?.hours > 0) { total += entries[k].hours; worked++; }
      });
      const ot = Math.max(0, total - settings.overtimeThreshold);
      const reg = total - ot;
      const earn = (reg * settings.hourlyRate) + (ot * settings.hourlyRate * settings.overtimeRate);
      return { totalHours: total, overtimeHours: ot, earnings: earn, daysWorked: worked };
    }
  };

  // ============================================
  // UI UTILITIES
  // ============================================
  function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${msg}</span><button class="toast-close">&times;</button>`;
    DOM.toastContainer?.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'toastSlideIn 0.3s reverse'; setTimeout(() => toast.remove(), 300); }, CONFIG.MAX_TOAST_DURATION);
    toast.querySelector('.toast-close').onclick = () => toast.remove();
  }

  const Modal = {
    open(el) { if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; } },
    close(el) { if (el) { el.classList.remove('active'); document.body.style.overflow = ''; } },
    closeAll() { document.querySelectorAll('.modal-overlay.active').forEach(m => this.close(m)); }
  };

  function updateSyncStatus(status, msg) {
    if (!DOM.syncStatus) return;
    DOM.syncStatus.className = `sync-status ${status}`;
    DOM.syncText.textContent = msg;
  }

  async function generateUserId(email) {
    const cleaned = email.toLowerCase().trim();
    if (!window.crypto?.subtle) return 'user_' + btoa(cleaned).substring(0, 16);
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cleaned));
    return 'user_' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  function saveEntries() {
    Storage.save(STORAGE_KEYS.ENTRIES, state.entries);
    updateStats(); renderWeekGrid(); renderBarChart();
    if (state.userId && state.isOnline && CONFIG.SYNC_ENABLED) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => CloudSync.push(), CONFIG.DEBOUNCE_DELAY);
    }
  }

  function saveSettings() {
    Storage.save(STORAGE_KEYS.SETTINGS, state.settings);
    updateStats();
    if (state.userId && state.isOnline && CONFIG.SYNC_ENABLED) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => CloudSync.push(), CONFIG.DEBOUNCE_DELAY);
    }
  }

  function loadState() {
    state.settings = Storage.load(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    state.entries = Storage.load(STORAGE_KEYS.ENTRIES, {});
    state.userEmail = Storage.getString(STORAGE_KEYS.USER_EMAIL);
    state.userId = Storage.getString(STORAGE_KEYS.USER_ID);
    state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
    state.currentWeekStart = DateUtils.getWeekStart(new Date(), state.settings.weekStart);
    const ver = Storage.getString(STORAGE_KEYS.SCHEMA_VER);
    if (ver !== CONFIG.SCHEMA_VERSION) Storage.setString(STORAGE_KEYS.SCHEMA_VER, CONFIG.SCHEMA_VERSION);
  }

  function renderWeekNavigation() {
    const end = new Date(state.currentWeekStart); end.setDate(end.getDate() + 6);
    DOM.weekDates.textContent = `${DateUtils.formatShortDate(state.currentWeekStart)} - ${DateUtils.formatShortDate(end)}, ${end.getFullYear()}`;
    DOM.weekLabel.textContent = DateUtils.isCurrentWeek(state.currentWeekStart) ? 'This Week' : DateUtils.formatShortDate(state.currentWeekStart);
  }

  function renderWeekGrid() {
    const days = DateUtils.getWeekDays(state.currentWeekStart);
    DOM.weekGrid.innerHTML = days.map(d => {
      const k = DateUtils.formatDate(d), h = state.entries[k]?.hours || 0;
      return `<div class="day-card ${DateUtils.isToday(d) ? 'today' : ''} ${h > 0 ? 'has-entry' : ''}" data-date="${k}">
        <div class="day-name">${DateUtils.formatDayName(d)}</div>
        <div class="day-date">${d.getDate()}</div>
        <div class="day-hours">${h.toFixed(1)}h</div>
      </div>`;
    }).join('');
    DOM.weekGrid.querySelectorAll('.day-card').forEach(c => c.onclick = () => openEditModal(c.dataset.date));
  }

  function renderBarChart() {
    const days = DateUtils.getWeekDays(state.currentWeekStart), max = 12;
    DOM.barChart.innerHTML = days.map(d => {
      const h = state.entries[DateUtils.formatDate(d)]?.hours || 0;
      return `<div class="bar-wrapper">
        <div class="bar-value">${h > 0 ? h.toFixed(1) : ''}</div>
        <div class="bar ${h > 8 ? 'has-overtime' : ''}" style="height:${Math.min(100, (h / max) * 100)}%"></div>
        <div class="bar-label">${DateUtils.formatDayName(d)}</div>
      </div>`;
    }).join('');
  }

  function updateStats() {
    const s = TimeCalc.calculateWeeklyStats(state.entries, state.currentWeekStart, state.settings);
    DOM.weeklyHours.textContent = s.totalHours.toFixed(1);
    DOM.overtimeHours.textContent = s.overtimeHours.toFixed(1);
    DOM.weeklyEarnings.textContent = `$${s.earnings.toFixed(0)}`;
    DOM.daysWorked.textContent = s.daysWorked;
  }

  function populateAdjustmentDays() {
    DOM.adjustDay.innerHTML = DateUtils.getWeekDays(state.currentWeekStart).map(d => {
      const k = DateUtils.formatDate(d);
      return `<option value="${k}" ${DateUtils.isToday(d) ? 'selected' : ''}>${DateUtils.formatDayName(d)} ${d.getDate()}</option>`;
    }).join('');
  }

  function openEditModal(k) {
    state.editingDate = k;
    const e = state.entries[k] || {};
    DOM.editDateLabel.textContent = DateUtils.formatDisplayDate(new Date(k + 'T00:00:00'));
    DOM.editStart.value = e.start || '09:00';
    DOM.editEnd.value = e.end || '17:30';
    DOM.editBreak.value = e.breakMins || state.settings.defaultBreak;
    DOM.editCalculatedHours.textContent = e.hours?.toFixed(1) || '0.0';
    Modal.open(DOM.editModal);
  }

  function saveEntry() {
    const h = TimeCalc.calculateHours(DOM.editStart.value, DOM.editEnd.value, parseInt(DOM.editBreak.value) || 0);
    state.entries[state.editingDate] = { start: DOM.editStart.value, end: DOM.editEnd.value, breakMins: parseInt(DOM.editBreak.value) || 0, hours: h, updatedAt: new Date().toISOString() };
    saveEntries(); Modal.close(DOM.editModal); showToast('Saved', 'success');
  }

  function addTodayHours(e) {
    if (e) e.preventDefault();
    const k = DateUtils.formatDate(new Date()), h = TimeCalc.calculateHours(DOM.quickStart.value, DOM.quickEnd.value, parseInt(DOM.quickBreak.value) || 0);
    state.entries[k] = { start: DOM.quickStart.value, end: DOM.quickEnd.value, breakMins: parseInt(DOM.quickBreak.value) || 0, hours: h, updatedAt: new Date().toISOString() };
    saveEntries(); showToast(`Added ${h.toFixed(1)}h`, 'success');
  }

  function adjustHours(dir) {
    const k = DOM.adjustDay.value, adj = parseFloat(DOM.adjHours.value) || 0.5;
    if (!state.entries[k]) state.entries[k] = { hours: 0, updatedAt: new Date().toISOString() };
    state.entries[k].hours = Math.max(0, (state.entries[k].hours || 0) + (dir * adj));
    state.entries[k].updatedAt = new Date().toISOString();
    saveEntries();
  }

  function exportToPDF() {
    const end = new Date(state.currentWeekStart); end.setDate(end.getDate() + 6);
    document.getElementById('print-week-range').textContent = `${state.currentWeekStart.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    const b = document.getElementById('print-table-body'); b.innerHTML = '';
    let t = 0;
    DateUtils.getWeekDays(state.currentWeekStart).forEach(d => {
      const k = DateUtils.formatDate(d), e = state.entries[k];
      if (e?.hours > 0) {
        t += e.hours;
        b.innerHTML += `<tr><td>${k}</td><td>${DateUtils.formatDayName(d)}</td><td>${e.start || '-'}</td><td>${e.end || '-'}</td><td>${e.breakMins || 0}m</td><td>${e.hours.toFixed(1)}</td><td>$${state.settings.hourlyRate}</td><td>$${(e.hours * state.settings.hourlyRate).toFixed(2)}</td></tr>`;
      }
    });
    document.getElementById('print-table-footer').innerHTML = `<tr><td colspan="5"></td><td>${t.toFixed(1)}h</td><td>TOTAL:</td><td>$${(t * state.settings.hourlyRate).toFixed(2)}</td></tr>`;
    window.print();
  }

  function setupEventListeners() {
    DOM.saveEmailBtn?.addEventListener('click', handleSaveEmail);
    DOM.skipEmailBtn?.addEventListener('click', handleSkipEmail);
    DOM.settingsBtn?.addEventListener('click', () => {
      DOM.hourlyRateInput.value = state.settings.hourlyRate;
      DOM.overtimeRateInput.value = state.settings.overtimeRate;
      DOM.overtimeThresholdInput.value = state.settings.overtimeThreshold;
      DOM.defaultBreakInput.value = state.settings.defaultBreak;
      DOM.weekStartSelect.value = state.settings.weekStart;
      Modal.open(DOM.settingsModal);
    });
    DOM.saveSettingsBtn?.addEventListener('click', () => {
      state.settings.hourlyRate = parseFloat(DOM.hourlyRateInput.value);
      state.settings.overtimeRate = parseFloat(DOM.overtimeRateInput.value);
      state.settings.overtimeThreshold = parseInt(DOM.overtimeThresholdInput.value);
      state.settings.defaultBreak = parseInt(DOM.defaultBreakInput.value);
      state.settings.weekStart = parseInt(DOM.weekStartSelect.value);
      saveSettings(); Modal.close(DOM.settingsModal);
    });
    DOM.saveEntryBtn?.addEventListener('click', saveEntry);
    DOM.deleteEntryBtn?.addEventListener('click', () => { if (confirm('Delete?')) { delete state.entries[state.editingDate]; saveEntries(); Modal.close(DOM.editModal); } });
    DOM.addTodayBtn?.addEventListener('click', addTodayHours);
    DOM.adjMinus?.addEventListener('click', () => adjustHours(-1));
    DOM.adjPlus?.addEventListener('click', () => adjustHours(1));
    DOM.prevWeekBtn?.addEventListener('click', () => navigateWeek(-1));
    DOM.nextWeekBtn?.addEventListener('click', () => navigateWeek(1));
    DOM.todayBtn?.addEventListener('click', goToToday);
    DOM.exportBtn?.addEventListener('click', () => {
      let c = 'Date,Hours\n'; Object.keys(state.entries).forEach(k => { if (state.entries[k].hours > 0) c += `${k},${state.entries[k].hours}\n`; });
      const b = new Blob([c], { type: 'text/csv' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'timevault.csv'; a.click();
    });
    DOM.exportPdfBtn?.addEventListener('click', exportToPDF);
    DOM.logoutBtn?.addEventListener('click', handleLogout);
    DOM.themeToggle?.addEventListener('click', () => ThemeManager.toggle());
    DOM.installBtn?.addEventListener('click', () => { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; DOM.installBanner.classList.remove('active'); } });
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; DOM.installBanner?.classList.add('active'); });
    window.addEventListener('online', () => { state.isOnline = true; updateSyncStatus('synced', 'Online'); });
    window.addEventListener('offline', () => { state.isOnline = false; updateSyncStatus('offline', 'Offline'); });
  }

  function navigateWeek(dir) { state.currentWeekStart.setDate(state.currentWeekStart.getDate() + (dir * 7)); initUI(); }
  function goToToday() { state.currentWeekStart = DateUtils.getWeekStart(new Date()); initUI(); }
  function initUI() { renderWeekNavigation(); renderWeekGrid(); renderBarChart(); updateStats(); populateAdjustmentDays(); }

  function updateUserDisplay() {
    if (state.userEmail && DOM.userEmailDisplay) {
      DOM.userEmailDisplay.textContent = state.userEmail;
      DOM.userInfo?.classList.remove('hidden');
    } else {
      DOM.userInfo?.classList.add('hidden');
    }
  }

  async function handleSaveEmail() {
    const email = DOM.userEmailInput.value.trim();
    if (!email.includes('@')) return;
    state.userId = await generateUserId(email); state.userEmail = email;
    Storage.setString(STORAGE_KEYS.USER_EMAIL, email); Storage.setString(STORAGE_KEYS.USER_ID, state.userId);
    updateUserDisplay(); Modal.close(DOM.emailModal); CloudSync.init();
  }

  function handleSkipEmail() { Modal.close(DOM.emailModal); updateSyncStatus('offline', 'Local mode'); }
  function handleLogout() { Storage.remove(STORAGE_KEYS.USER_EMAIL); Storage.remove(STORAGE_KEYS.USER_ID); location.reload(); }

  function handleShortcuts() {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'quick-add') {
      setTimeout(() => {
        DOM.quickStart?.focus();
        DOM.quickStart?.scrollIntoView({ behavior: 'smooth' });
      }, 1000);
    } else if (action === 'summary') {
      setTimeout(() => {
        DOM.barChart?.scrollIntoView({ behavior: 'smooth' });
      }, 1000);
    }
  }

  function init() {
    cacheDOM(); loadState(); setupEventListeners();
    if (!state.userId) setTimeout(() => Modal.open(DOM.emailModal), 500);
    else { updateUserDisplay(); CloudSync.init(); CloudSync.setupBroadcastListener(); }
    initUI();
    handleShortcuts();
    setTimeout(() => { DOM.loading?.classList.add('hidden'); DOM.appContainer?.classList.add('ready'); }, 500);
  }

  init();
})();
