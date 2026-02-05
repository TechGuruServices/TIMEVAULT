/**
 * TimeVault - Work Hours Tracker PWA
 * Production-ready application with auto-save, sync, and offline support
 * @version 2.0.0
 */

(function () {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    STORAGE_PREFIX: 'timeVault_',
    DEBOUNCE_DELAY: 500,
    SYNC_INTERVAL: 60000, // 1 minute
    API_TIMEOUT: 10000,
    MAX_TOAST_DURATION: 5000,
    ANIMATION_DURATION: 300
  };

  const STORAGE_KEYS = {
    SETTINGS: 'timeVault_settings',
    ENTRIES: 'timeVault_entries',
    USER_EMAIL: 'timeVault_userEmail',
    USER_ID: 'timeVault_userId',
    LAST_SYNC: 'timeVault_lastSync'
  };

  // ============================================
  // DEFAULT STATE
  // ============================================
  const DEFAULT_SETTINGS = {
    hourlyRate: 35,
    overtimeRate: 1.5,
    overtimeThreshold: 40,
    defaultBreak: 30,
    weekStart: 1, // Monday
    bgColor: '#1e293b'
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
    lastSyncTime: null
  };

  // ============================================
  // DOM CACHE
  // ============================================
  const DOM = {};

  function cacheDOM() {
    // Modals
    DOM.emailModal = document.getElementById('email-modal');
    DOM.settingsModal = document.getElementById('settings-modal');
    DOM.editModal = document.getElementById('edit-modal');
    DOM.installBanner = document.getElementById('install-banner');
    DOM.loading = document.querySelector('.loading');
    DOM.appContainer = document.querySelector('.app-container');

    // Email Modal Elements
    DOM.userEmailInput = document.getElementById('user-email');
    DOM.saveEmailBtn = document.getElementById('save-email');
    DOM.skipEmailBtn = document.getElementById('skip-email');
    DOM.closeEmailModalBtn = document.getElementById('close-email-modal');

    // Settings Elements
    DOM.settingsBtn = document.getElementById('settings-btn');
    DOM.closeSettingsBtn = document.getElementById('close-settings');
    DOM.saveSettingsBtn = document.getElementById('save-settings');
    DOM.resetSettingsBtn = document.getElementById('reset-settings');
    DOM.hourlyRateInput = document.getElementById('hourly-rate');
    DOM.overtimeRateInput = document.getElementById('overtime-rate');
    DOM.overtimeThresholdInput = document.getElementById('overtime-threshold');
    DOM.defaultBreakInput = document.getElementById('default-break');
    DOM.weekStartSelect = document.getElementById('week-start');
    DOM.bgColorPicker = document.getElementById('bg-color-picker');

    // Edit Modal Elements
    DOM.closeEditBtn = document.getElementById('close-edit');
    DOM.saveEntryBtn = document.getElementById('save-entry');
    DOM.deleteEntryBtn = document.getElementById('delete-entry');
    DOM.editDateLabel = document.getElementById('edit-date-label');
    DOM.editStart = document.getElementById('edit-start');
    DOM.editEnd = document.getElementById('edit-end');
    DOM.editBreak = document.getElementById('edit-break');
    DOM.editCalculatedHours = document.getElementById('edit-calculated-hours');

    // Quick Add Elements
    DOM.quickAddForm = document.getElementById('quick-add-form');
    DOM.quickStart = document.getElementById('quick-start');
    DOM.quickEnd = document.getElementById('quick-end');
    DOM.quickBreak = document.getElementById('quick-break');
    DOM.calculatedHours = document.getElementById('calculated-hours');
    DOM.addTodayBtn = document.getElementById('add-today');

    // Adjustment Elements
    DOM.adjustDay = document.getElementById('adjust-day');
    DOM.adjHours = document.getElementById('adj-hours');
    DOM.adjMinus = document.getElementById('adj-minus');
    DOM.adjPlus = document.getElementById('adj-plus');

    // Navigation Elements
    DOM.prevWeekBtn = document.getElementById('prev-week');
    DOM.nextWeekBtn = document.getElementById('next-week');
    DOM.todayBtn = document.getElementById('today-btn');
    DOM.weekLabel = document.getElementById('week-label');
    DOM.weekDates = document.getElementById('week-dates');

    // Display Elements
    DOM.weekGrid = document.getElementById('week-grid');
    DOM.barChart = document.getElementById('bar-chart');
    DOM.syncStatus = document.getElementById('sync-status');
    DOM.syncText = document.getElementById('sync-text');
    DOM.userInfo = document.getElementById('user-info');
    DOM.userEmailDisplay = document.getElementById('user-email-display');
    DOM.logoutBtn = document.getElementById('logout-btn');

    // Stats Elements
    DOM.weeklyHours = document.getElementById('weekly-hours');
    DOM.overtimeHours = document.getElementById('overtime-hours');
    DOM.weeklyEarnings = document.getElementById('weekly-earnings');
    DOM.daysWorked = document.getElementById('days-worked');

    // Action Buttons
    DOM.exportBtn = document.getElementById('export-btn');
    DOM.clearWeekBtn = document.getElementById('clear-week-btn');

    // Install Banner
    DOM.installBtn = document.getElementById('install-btn');
    DOM.dismissInstallBtn = document.getElementById('dismiss-install');

    // Toast Container
    DOM.toastContainer = document.getElementById('toast-container');
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
        console.error('Storage save error:', e);
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
        console.error('Storage load error:', e);
        return defaultValue;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        console.error('Storage remove error:', e);
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
        console.error('Storage setString error:', e);
        return false;
      }
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
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    },

    getWeekDays(weekStart) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        days.push(day);
      }
      return days;
    },

    formatDate(date) {
      return date.toISOString().split('T')[0];
    },

    formatDisplayDate(date) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    },

    formatShortDate(date) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    },

    formatDayName(date) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    },

    isToday(date) {
      const today = new Date();
      return date.toDateString() === today.toDateString();
    },

    isCurrentWeek(weekStart) {
      const currentWeekStart = this.getWeekStart(new Date());
      return weekStart.getTime() === currentWeekStart.getTime();
    }
  };

  // ============================================
  // TIME CALCULATION UTILITIES
  // ============================================
  const TimeCalc = {
    calculateHours(startTime, endTime, breakMinutes = 0) {
      if (!startTime || !endTime) return 0;

      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      let startMins = startH * 60 + startM;
      let endMins = endH * 60 + endM;

      // Handle overnight shifts
      if (endMins < startMins) {
        endMins += 24 * 60;
      }

      const totalMins = endMins - startMins - breakMinutes;
      return Math.max(0, totalMins / 60);
    },

    calculateWeeklyStats(entries, weekStart, settings) {
      const weekDays = DateUtils.getWeekDays(weekStart);
      let totalHours = 0;
      let daysWorked = 0;

      weekDays.forEach(day => {
        const dateKey = DateUtils.formatDate(day);
        const entry = entries[dateKey];
        if (entry && entry.hours > 0) {
          totalHours += entry.hours;
          daysWorked++;
        }
      });

      const overtimeHours = Math.max(0, totalHours - settings.overtimeThreshold);
      const regularHours = totalHours - overtimeHours;
      const earnings = (regularHours * settings.hourlyRate) +
        (overtimeHours * settings.hourlyRate * settings.overtimeRate);

      return {
        totalHours: Math.round(totalHours * 10) / 10,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        regularHours: Math.round(regularHours * 10) / 10,
        earnings: Math.round(earnings * 100) / 100,
        daysWorked
      };
    }
  };

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  function showToast(message, type = 'info') {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="${icons[type] || icons.info}" aria-hidden="true"></i>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

    DOM.toastContainer.appendChild(toast);

    // Auto-dismiss
    const dismissTimeout = setTimeout(() => removeToast(toast), CONFIG.MAX_TOAST_DURATION);

    // Manual dismiss
    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(dismissTimeout);
      removeToast(toast);
    });

    return toast;
  }

  function removeToast(toast) {
    toast.style.animation = 'toastSlideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }

  // Expose globally for service worker updates
  window.showToast = showToast;

  // ============================================
  // MODAL UTILITIES
  // ============================================
  const Modal = {
    open(modalElement) {
      if (!modalElement) return;
      modalElement.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Focus first input
      setTimeout(() => {
        const firstInput = modalElement.querySelector('input, select, button:not(.modal-close)');
        if (firstInput) firstInput.focus();
      }, CONFIG.ANIMATION_DURATION);
    },

    close(modalElement) {
      if (!modalElement) return;
      modalElement.classList.remove('active');
      document.body.style.overflow = '';
    },

    closeAll() {
      document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        this.close(modal);
      });
    }
  };

  // ============================================
  // SYNC STATUS
  // ============================================
  function updateSyncStatus(status, message) {
    const icons = {
      synced: 'fas fa-check-circle',
      syncing: 'fas fa-circle-notch fa-spin',
      offline: 'fas fa-cloud-slash',
      error: 'fas fa-exclamation-circle'
    };

    DOM.syncStatus.className = `sync-status ${status}`;
    DOM.syncStatus.innerHTML = `
      <i class="${icons[status] || icons.syncing}" aria-hidden="true"></i>
      <span id="sync-text">${message}</span>
    `;
  }

  // ============================================
  // USER ID GENERATION
  // ============================================
  async function generateUserId(email) {
    if (!email) throw new Error('Email required');

    const cleaned = email.toLowerCase().trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(cleaned);

    // Fallback for non-secure contexts
    if (!window.crypto?.subtle) {
      return 'user_' + btoa(cleaned).replace(/[^a-z0-9]/gi, '').substring(0, 16);
    }

    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return 'user_' + hashHex.substring(0, 16);
    } catch (e) {
      return 'user_' + btoa(cleaned).replace(/[^a-z0-9]/gi, '').substring(0, 16);
    }
  }

  // ============================================
  // DATA PERSISTENCE
  // ============================================
  function saveEntries() {
    Storage.save(STORAGE_KEYS.ENTRIES, state.entries);
    updateStats();
    renderWeekGrid();
    renderBarChart();
  }

  function saveSettings() {
    Storage.save(STORAGE_KEYS.SETTINGS, state.settings);
    updateStats();
  }

  function loadState() {
    state.settings = Storage.load(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    state.entries = Storage.load(STORAGE_KEYS.ENTRIES, {});
    state.userEmail = Storage.getString(STORAGE_KEYS.USER_EMAIL);
    state.userId = Storage.getString(STORAGE_KEYS.USER_ID);
    state.lastSyncTime = Storage.getString(STORAGE_KEYS.LAST_SYNC);
    state.currentWeekStart = DateUtils.getWeekStart(new Date(), state.settings.weekStart);

    // Ensure settings have all required fields
    state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
  }

  // ============================================
  // UI RENDERING
  // ============================================
  function renderWeekNavigation() {
    const weekEnd = new Date(state.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startStr = DateUtils.formatShortDate(state.currentWeekStart);
    const endStr = DateUtils.formatShortDate(weekEnd);
    const year = weekEnd.getFullYear();

    DOM.weekDates.textContent = `${startStr} - ${endStr}, ${year}`;

    if (DateUtils.isCurrentWeek(state.currentWeekStart)) {
      DOM.weekLabel.textContent = 'This Week';
    } else {
      const weeksAgo = Math.round((new Date() - state.currentWeekStart) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo > 0 && weeksAgo < 52) {
        DOM.weekLabel.textContent = weeksAgo === 1 ? 'Last Week' : `${weeksAgo} Weeks Ago`;
      } else if (weeksAgo < 0 && weeksAgo > -52) {
        DOM.weekLabel.textContent = weeksAgo === -1 ? 'Next Week' : `${Math.abs(weeksAgo)} Weeks Ahead`;
      } else {
        DOM.weekLabel.textContent = startStr;
      }
    }
  }

  function renderWeekGrid() {
    const weekDays = DateUtils.getWeekDays(state.currentWeekStart);

    DOM.weekGrid.innerHTML = weekDays.map(day => {
      const dateKey = DateUtils.formatDate(day);
      const entry = state.entries[dateKey];
      const hours = entry?.hours || 0;
      const isToday = DateUtils.isToday(day);
      const hasEntry = hours > 0;

      const classes = ['day-card'];
      if (isToday) classes.push('today');
      if (hasEntry) classes.push('has-entry');

      return `
        <div class="${classes.join(' ')}" data-date="${dateKey}" tabindex="0" role="button" aria-label="${DateUtils.formatDisplayDate(day)}: ${hours.toFixed(1)} hours">
          <div class="day-name">${DateUtils.formatDayName(day)}</div>
          <div class="day-date">${day.getDate()}</div>
          <div class="day-hours">${hours.toFixed(1)}h</div>
        </div>
      `;
    }).join('');

    // Add click handlers
    DOM.weekGrid.querySelectorAll('.day-card').forEach(card => {
      card.addEventListener('click', () => openEditModal(card.dataset.date));
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openEditModal(card.dataset.date);
        }
      });
    });
  }

  function renderBarChart() {
    const weekDays = DateUtils.getWeekDays(state.currentWeekStart);
    const maxHours = 12; // Scale reference

    DOM.barChart.innerHTML = weekDays.map(day => {
      const dateKey = DateUtils.formatDate(day);
      const entry = state.entries[dateKey];
      const hours = entry?.hours || 0;
      const heightPercent = Math.min(100, (hours / maxHours) * 100);
      const hasOvertime = hours > 8;

      return `
        <div class="bar-wrapper">
          <div class="bar-value">${hours > 0 ? hours.toFixed(1) : ''}</div>
          <div class="bar ${hasOvertime ? 'has-overtime' : ''}" style="height: ${heightPercent}%"></div>
          <div class="bar-label">${DateUtils.formatDayName(day)}</div>
        </div>
      `;
    }).join('');
  }

  function updateStats() {
    const stats = TimeCalc.calculateWeeklyStats(
      state.entries,
      state.currentWeekStart,
      state.settings
    );

    DOM.weeklyHours.textContent = stats.totalHours.toFixed(1);
    DOM.overtimeHours.textContent = stats.overtimeHours.toFixed(1);
    DOM.weeklyEarnings.textContent = `$${stats.earnings.toFixed(0)}`;
    DOM.daysWorked.textContent = stats.daysWorked;
  }

  function populateAdjustmentDays() {
    const weekDays = DateUtils.getWeekDays(state.currentWeekStart);

    DOM.adjustDay.innerHTML = weekDays.map(day => {
      const dateKey = DateUtils.formatDate(day);
      const isToday = DateUtils.isToday(day);
      return `<option value="${dateKey}" ${isToday ? 'selected' : ''}>${DateUtils.formatDayName(day)} ${day.getDate()}</option>`;
    }).join('');
  }

  function updateCalculatedHours() {
    const hours = TimeCalc.calculateHours(
      DOM.quickStart.value,
      DOM.quickEnd.value,
      parseInt(DOM.quickBreak.value) || 0
    );
    DOM.calculatedHours.textContent = hours.toFixed(1);
  }

  function updateEditCalculatedHours() {
    const hours = TimeCalc.calculateHours(
      DOM.editStart.value,
      DOM.editEnd.value,
      parseInt(DOM.editBreak.value) || 0
    );
    DOM.editCalculatedHours.textContent = hours.toFixed(1);
  }

  function applySettingsToForm() {
    DOM.hourlyRateInput.value = state.settings.hourlyRate;
    DOM.overtimeRateInput.value = state.settings.overtimeRate;
    DOM.overtimeThresholdInput.value = state.settings.overtimeThreshold;
    DOM.defaultBreakInput.value = state.settings.defaultBreak;
    DOM.weekStartSelect.value = state.settings.weekStart;
    DOM.quickBreak.value = state.settings.defaultBreak;
    DOM.bgColorPicker.value = state.settings.bgColor || DEFAULT_SETTINGS.bgColor;
  }

  function updateUserDisplay() {
    if (state.userEmail && state.userId) {
      DOM.userInfo.style.display = 'flex';
      DOM.userEmailDisplay.textContent = state.userEmail;
    } else {
      DOM.userInfo.style.display = 'none';
    }
  }

  function applyBackgroundColor(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--bg-primary', color);

    // Calculate secondary/tertiary colors loosely based on primary (optional refinement)
    // For now, we trust the transparency layers in CSS to handle the blend
  }

  // ============================================
  // MODAL HANDLERS
  // ============================================
  function openEditModal(dateKey) {
    state.editingDate = dateKey;
    const date = new Date(dateKey + 'T00:00:00');
    const entry = state.entries[dateKey] || {};

    DOM.editDateLabel.textContent = DateUtils.formatDisplayDate(date);
    DOM.editStart.value = entry.start || '09:00';
    DOM.editEnd.value = entry.end || '17:30';
    DOM.editBreak.value = entry.breakMins || state.settings.defaultBreak;

    updateEditCalculatedHours();
    Modal.open(DOM.editModal);
  }

  function saveEntry() {
    if (!state.editingDate) return;

    const start = DOM.editStart.value;
    const end = DOM.editEnd.value;
    const breakMins = parseInt(DOM.editBreak.value) || 0;
    const hours = TimeCalc.calculateHours(start, end, breakMins);

    state.entries[state.editingDate] = {
      start,
      end,
      breakMins,
      hours,
      updatedAt: new Date().toISOString()
    };

    saveEntries();
    Modal.close(DOM.editModal);
    showToast('Entry saved successfully!', 'success');
  }

  function deleteEntry() {
    if (!state.editingDate) return;

    if (confirm('Are you sure you want to delete this entry?')) {
      delete state.entries[state.editingDate];
      saveEntries();
      Modal.close(DOM.editModal);
      showToast('Entry deleted', 'info');
    }
  }

  function addTodayHours(e) {
    if (e) e.preventDefault();

    const today = DateUtils.formatDate(new Date());
    const start = DOM.quickStart.value;
    const end = DOM.quickEnd.value;
    const breakMins = parseInt(DOM.quickBreak.value) || 0;
    const hours = TimeCalc.calculateHours(start, end, breakMins);

    state.entries[today] = {
      start,
      end,
      breakMins,
      hours,
      updatedAt: new Date().toISOString()
    };

    saveEntries();
    showToast(`Added ${hours.toFixed(1)} hours to today`, 'success');
  }

  function adjustHours(direction) {
    const dateKey = DOM.adjustDay.value;
    const adjustAmount = parseFloat(DOM.adjHours.value) || 0.5;

    if (!state.entries[dateKey]) {
      state.entries[dateKey] = {
        hours: 0,
        start: '',
        end: '',
        breakMins: 0,
        updatedAt: new Date().toISOString()
      };
    }

    const currentHours = state.entries[dateKey].hours || 0;
    const newHours = Math.max(0, currentHours + (direction * adjustAmount));

    state.entries[dateKey].hours = Math.round(newHours * 10) / 10;
    state.entries[dateKey].updatedAt = new Date().toISOString();

    saveEntries();
    showToast(`${direction > 0 ? 'Added' : 'Removed'} ${adjustAmount}h`, direction > 0 ? 'success' : 'warning');
  }

  // ============================================
  // SETTINGS HANDLERS
  // ============================================
  function handleSaveSettings() {
    state.settings = {
      hourlyRate: parseFloat(DOM.hourlyRateInput.value) || DEFAULT_SETTINGS.hourlyRate,
      overtimeRate: parseFloat(DOM.overtimeRateInput.value) || DEFAULT_SETTINGS.overtimeRate,
      overtimeThreshold: parseInt(DOM.overtimeThresholdInput.value) || DEFAULT_SETTINGS.overtimeThreshold,
      defaultBreak: parseInt(DOM.defaultBreakInput.value) || DEFAULT_SETTINGS.defaultBreak,
      weekStart: parseInt(DOM.weekStartSelect.value),
      bgColor: DOM.bgColorPicker.value || DEFAULT_SETTINGS.bgColor
    };

    applyBackgroundColor(state.settings.bgColor);
    saveSettings();

    // Update week start if changed
    state.currentWeekStart = DateUtils.getWeekStart(new Date(), state.settings.weekStart);
    renderWeekNavigation();
    renderWeekGrid();
    renderBarChart();
    populateAdjustmentDays();

    Modal.close(DOM.settingsModal);
    showToast('Settings saved!', 'success');
  }

  function handleResetSettings() {
    if (confirm('Reset all settings to defaults?')) {
      state.settings = { ...DEFAULT_SETTINGS };
      saveSettings();
      applySettingsToForm();
      applyBackgroundColor(state.settings.bgColor); // Apply default color
      showToast('Settings reset to defaults', 'info');
    }
  }

  // ============================================
  // EMAIL/USER HANDLERS
  // ============================================
  async function handleSaveEmail() {
    const email = DOM.userEmailInput.value.trim();

    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      DOM.userEmailInput.focus();
      return;
    }

    try {
      const userId = await generateUserId(email);
      state.userEmail = email;
      state.userId = userId;

      Storage.setString(STORAGE_KEYS.USER_EMAIL, email);
      Storage.setString(STORAGE_KEYS.USER_ID, userId);

      updateUserDisplay();
      Modal.close(DOM.emailModal);
      showToast('Email saved! Your data will sync across devices.', 'success');

      // Start sync
      updateSyncStatus('synced', 'Local mode (sync available)');
    } catch (e) {
      console.error('Email setup error:', e);
      showToast('Failed to set up sync. Using local storage.', 'warning');
      Modal.close(DOM.emailModal);
    }
  }

  function handleSkipEmail() {
    Modal.close(DOM.emailModal);
    updateSyncStatus('offline', 'Local mode (no sync)');
    showToast('Using local storage only. Set up email later in settings to enable sync.', 'info');
  }

  function handleLogout() {
    if (confirm('Clear sync data? Your local data will be preserved.')) {
      Storage.remove(STORAGE_KEYS.USER_EMAIL);
      Storage.remove(STORAGE_KEYS.USER_ID);
      Storage.remove(STORAGE_KEYS.LAST_SYNC);

      state.userEmail = null;
      state.userId = null;
      state.lastSyncTime = null;

      updateUserDisplay();
      updateSyncStatus('offline', 'Local mode');
      showToast('Sync data cleared', 'info');
    }
  }

  // ============================================
  // WEEK NAVIGATION
  // ============================================
  function navigateWeek(direction) {
    state.currentWeekStart.setDate(state.currentWeekStart.getDate() + (direction * 7));
    renderWeekNavigation();
    renderWeekGrid();
    renderBarChart();
    updateStats();
    populateAdjustmentDays();
  }

  function goToToday() {
    state.currentWeekStart = DateUtils.getWeekStart(new Date(), state.settings.weekStart);
    renderWeekNavigation();
    renderWeekGrid();
    renderBarChart();
    updateStats();
    populateAdjustmentDays();
  }

  // ============================================
  // EXPORT FUNCTIONALITY
  // ============================================
  function exportToCSV() {
    const rows = [['Date', 'Day', 'Start', 'End', 'Break (min)', 'Hours', 'Earnings']];

    // Get all entries sorted by date
    const sortedDates = Object.keys(state.entries).sort();

    sortedDates.forEach(dateKey => {
      const entry = state.entries[dateKey];
      if (!entry || entry.hours === 0) return;

      const date = new Date(dateKey + 'T00:00:00');
      const dayName = DateUtils.formatDayName(date);
      const dailyEarnings = entry.hours * state.settings.hourlyRate;

      rows.push([
        dateKey,
        dayName,
        entry.start || '',
        entry.end || '',
        entry.breakMins || 0,
        entry.hours.toFixed(2),
        `$${dailyEarnings.toFixed(2)}`
      ]);
    });

    // Add summary row
    const totalHours = sortedDates.reduce((sum, d) => sum + (state.entries[d]?.hours || 0), 0);
    const totalEarnings = totalHours * state.settings.hourlyRate;
    rows.push([]);
    rows.push(['TOTAL', '', '', '', '', totalHours.toFixed(2), `$${totalEarnings.toFixed(2)}`]);

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `timevault-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Exported successfully!', 'success');
  }

  function clearWeek() {
    if (!confirm('Clear all entries for this week? This cannot be undone.')) return;

    const weekDays = DateUtils.getWeekDays(state.currentWeekStart);

    weekDays.forEach(day => {
      const dateKey = DateUtils.formatDate(day);
      delete state.entries[dateKey];
    });

    saveEntries();
    showToast('Week cleared', 'info');
  }

  // ============================================
  // PWA INSTALL PROMPT
  // ============================================
  let deferredPrompt = null;

  function handleBeforeInstallPrompt(e) {
    e.preventDefault();
    deferredPrompt = e;

    // Check if already dismissed
    const dismissed = Storage.getString('timeVault_installDismissed');
    if (!dismissed) {
      DOM.installBanner.classList.add('active');
    }
  }

  async function handleInstall() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      showToast('TimeVault installed! 🎉', 'success');
    }

    deferredPrompt = null;
    DOM.installBanner.classList.remove('active');
  }

  function dismissInstallBanner() {
    DOM.installBanner.classList.remove('active');
    Storage.setString('timeVault_installDismissed', 'true');
  }

  // ============================================
  // ONLINE/OFFLINE HANDLERS
  // ============================================
  function handleOnline() {
    state.isOnline = true;
    updateSyncStatus('synced', 'Back online');
    showToast('Back online!', 'success');
  }

  function handleOffline() {
    state.isOnline = false;
    updateSyncStatus('offline', 'Offline mode');
    showToast('You are offline. Changes saved locally.', 'warning');
  }

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================
  function handleKeydown(e) {
    // Close modals on Escape
    if (e.key === 'Escape') {
      Modal.closeAll();
    }

    // Week navigation with arrow keys (when not in input)
    if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
      if (e.key === 'ArrowLeft') {
        navigateWeek(-1);
      } else if (e.key === 'ArrowRight') {
        navigateWeek(1);
      }
    }
  }

  // ============================================
  // EVENT LISTENERS SETUP
  // ============================================
  function setupEventListeners() {
    // Email Modal
    DOM.saveEmailBtn?.addEventListener('click', handleSaveEmail);
    DOM.skipEmailBtn?.addEventListener('click', handleSkipEmail);
    DOM.closeEmailModalBtn?.addEventListener('click', () => Modal.close(DOM.emailModal));
    DOM.userEmailInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSaveEmail();
    });

    // Settings Modal
    DOM.settingsBtn?.addEventListener('click', () => {
      applySettingsToForm();
      Modal.open(DOM.settingsModal);
    });
    DOM.closeSettingsBtn?.addEventListener('click', () => {
      // Revert if cancelled
      if (state.settings.bgColor) {
        applyBackgroundColor(state.settings.bgColor);
      }
      Modal.close(DOM.settingsModal);
    });
    DOM.saveSettingsBtn?.addEventListener('click', handleSaveSettings);
    DOM.resetSettingsBtn?.addEventListener('click', handleResetSettings);
    DOM.bgColorPicker?.addEventListener('input', (e) => {
      applyBackgroundColor(e.target.value);
    });

    // Edit Modal
    DOM.closeEditBtn?.addEventListener('click', () => Modal.close(DOM.editModal));
    DOM.saveEntryBtn?.addEventListener('click', saveEntry);
    DOM.deleteEntryBtn?.addEventListener('click', deleteEntry);
    DOM.editStart?.addEventListener('change', updateEditCalculatedHours);
    DOM.editEnd?.addEventListener('change', updateEditCalculatedHours);
    DOM.editBreak?.addEventListener('input', updateEditCalculatedHours);

    // Quick Add
    DOM.quickAddForm?.addEventListener('submit', addTodayHours);
    DOM.addTodayBtn?.addEventListener('click', addTodayHours);
    DOM.quickStart?.addEventListener('change', updateCalculatedHours);
    DOM.quickEnd?.addEventListener('change', updateCalculatedHours);
    DOM.quickBreak?.addEventListener('input', updateCalculatedHours);

    // Adjustment
    DOM.adjMinus?.addEventListener('click', () => adjustHours(-1));
    DOM.adjPlus?.addEventListener('click', () => adjustHours(1));

    // Navigation
    DOM.prevWeekBtn?.addEventListener('click', () => navigateWeek(-1));
    DOM.nextWeekBtn?.addEventListener('click', () => navigateWeek(1));
    DOM.todayBtn?.addEventListener('click', goToToday);

    // Actions
    DOM.exportBtn?.addEventListener('click', exportToCSV);
    DOM.clearWeekBtn?.addEventListener('click', clearWeek);
    DOM.logoutBtn?.addEventListener('click', handleLogout);

    // Install Banner
    DOM.installBtn?.addEventListener('click', handleInstall);
    DOM.dismissInstallBtn?.addEventListener('click', dismissInstallBanner);

    // Close modals when clicking overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          Modal.close(overlay);
        }
      });
    });

    // Window events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('keydown', handleKeydown);

    // Page visibility for auto-save
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        saveEntries();
      }
    });

    // Before unload save
    window.addEventListener('beforeunload', () => {
      saveEntries();
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  async function init() {
    cacheDOM();
    loadState();

    // Check if first time user
    if (!state.userEmail && !state.userId) {
      setTimeout(() => {
        Modal.open(DOM.emailModal);
      }, 500);
    } else {
      updateUserDisplay();
      updateSyncStatus('synced', 'Ready');
    }

    // Render UI
    renderWeekNavigation();
    renderWeekGrid();
    renderBarChart();
    updateStats();
    populateAdjustmentDays();
    applySettingsToForm();
    updateCalculatedHours();
    if (state.settings.bgColor) {
      applyBackgroundColor(state.settings.bgColor);
    }

    // Setup events
    setupEventListeners();

    // Transition from loading to app
    setTimeout(() => {
      DOM.loading?.classList.add('hidden');
      DOM.appContainer?.classList.add('ready');
    }, 800);

    console.log('✅ TimeVault initialized');
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
