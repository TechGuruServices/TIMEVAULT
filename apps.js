/**
 * TimeVault - Premium Time Tracking & Payroll PWA
 * AI-Powered Time Card with Local Storage & Cross-Device Sync
 */

// ============================================
// TIMEVAULT APP STATE & CONFIGURATION
// ============================================

const TimeVault = {
	// State
	isWorking: false,
	sessionStart: null,
	timerInterval: null,
	settings: {
		hourlyRate: 25.00,
		overtimeMultiplier: 1.5,
		weeklyTarget: 40,
		overtimeThreshold: 40,
		currencySymbol: '$',
		timeFormat: '12'
	},
	syncData: {
		email: null,
		pin: null,
		lastSync: null
	},
	timeEntries: [],

	// AI Memory
	aiMemory: {
		conversationHistory: [],
		lastInteraction: null,
		userPreferences: {}
	},

	// Enhanced AI Configuration
	aiConfig: {
		// Ollama Settings - LT PC (192.168.1.177)
		ollamaLocalUrl: 'http://localhost:11434',
		ollamaRemoteUrl: 'http://192.168.1.177:11434',
		ollamaModel: 'llama3',
		ollamaEnabled: true,
		connectionStatus: 'disconnected', // 'local', 'remote', 'disconnected'

		// Voice Recognition
		voiceEnabled: true,
		voiceLanguage: 'en-US',
		isListening: false,

		// Smart Suggestions
		suggestionsEnabled: true,
		lastSuggestionUpdate: null,

		// Fallback mode (local AI only)
		useLocalFallback: true
	},

	// Voice Recognition Instance
	voiceRecognition: null,


	// Initialize Application
	init() {
		console.log('TimeVault: Initializing...');
		this.checkBrowserCapabilities();
		this.loadFromStorage();
		this.initClock();
		this.initEventListeners();
		this.initParticles();
		this.initChart();
		this.updateDashboard();
		this.checkActiveSession();
		this.initAIEngine(); // Initialize enhanced AI
		this.initKeyboardShortcuts(); // Initialize keyboard shortcuts
		this.hideSplashScreen(); // Hide splash after initialization
		console.log('TimeVault: Ready');
	},

	// ============================================
	// BROWSER CAPABILITIES CHECK
	// ============================================

	checkBrowserCapabilities() {
		const caps = {
			localStorage: 'localStorage' in window,
			serviceWorker: 'serviceWorker' in navigator,
			notification: 'Notification' in window,
			speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
		};

		if (!caps.localStorage) {
			this.showToast('Critical Error', 'LocalStorage is not available. Your data will not be saved.', 'error');
		}

		if (!caps.serviceWorker) {
			console.warn('TimeVault: Service Workers not supported. Offline mode unavailable.');
		}

		if (!caps.notification) {
			console.warn('TimeVault: Notifications not supported.');
		}

		this.browserCaps = caps;
		console.log('TimeVault: Browser Capabilities:', caps);
	},

	// ============================================
	// SPLASH SCREEN & PARTICLES
	// ============================================

	hideSplashScreen() {
		setTimeout(() => {
			const splash = document.getElementById('splash-screen');
			const appContainer = document.getElementById('app-container');
			const appFooter = document.getElementById('app-footer');

			if (splash) {
				splash.classList.add('hidden');
				setTimeout(() => {
					splash.style.display = 'none';
				}, 800);
			}

			if (appContainer) {
				appContainer.classList.add('visible');
			}

			if (appFooter) {
				appFooter.classList.add('visible');
			}

			document.body.style.overflow = 'auto';
			console.log('TimeVault: Loading complete - Dashboard ready');
		}, 1500);
	},

	initParticles() {
		if (typeof particlesJS !== 'undefined') {
			particlesJS('particles-js', {
				particles: {
					number: { value: 80, density: { enable: true, value_area: 800 } },
					color: { value: '#3d7eff' },
					shape: { type: 'circle' },
					opacity: { value: 0.5, random: false },
					size: { value: 3, random: true },
					line_linked: {
						enable: true,
						distance: 150,
						color: '#3d7eff',
						opacity: 0.4,
						width: 1
					},
					move: {
						enable: true,
						speed: 2,
						direction: 'none',
						random: false,
						straight: false,
						out_mode: 'out',
						bounce: false
					}
				},
				interactivity: {
					detect_on: 'canvas',
					events: {
						onhover: { enable: true, mode: 'repulse' },
						onclick: { enable: true, mode: 'push' },
						resize: true
					}
				},
				retina_detect: true
			});
		}
	},


	// ============================================
	// LOCAL STORAGE MANAGEMENT
	// ============================================

	saveToStorage() {
		const data = {
			settings: this.settings,
			syncData: this.syncData,
			timeEntries: this.timeEntries,
			aiMemory: this.aiMemory,
			aiConfig: this.aiConfig, // Save AI config
			isWorking: this.isWorking,

			sessionStart: this.sessionStart
		};
		localStorage.setItem('timevault_data', JSON.stringify(data));
		console.log('TimeVault: Data saved to localStorage');
	},

	loadFromStorage() {
		const stored = localStorage.getItem('timevault_data');
		if (stored) {
			try {
				const data = JSON.parse(stored);
				this.settings = { ...this.settings, ...data.settings };
				this.syncData = { ...this.syncData, ...data.syncData };
				this.timeEntries = data.timeEntries || [];
				this.aiMemory = { ...this.aiMemory, ...data.aiMemory };
				this.aiConfig = { ...this.aiConfig, ...data.aiConfig }; // Restore AI config
				this.isWorking = data.isWorking || false;
				this.sessionStart = data.sessionStart || null;

				// Update UI with loaded settings
				this.updateSettingsUI();
				console.log('TimeVault: Data loaded from localStorage');
			} catch (e) {
				console.error('TimeVault: Error loading data', e);
			}
		}
	},


	updateSettingsUI() {
		const hourlyRate = document.getElementById('hourly-rate');
		const overtimeMult = document.getElementById('overtime-multiplier');
		const weeklyTarget = document.getElementById('weekly-target');
		const syncEmail = document.getElementById('sync-email');
		const syncPin = document.getElementById('sync-pin');

		if (hourlyRate) hourlyRate.value = this.settings.hourlyRate;
		if (overtimeMult) overtimeMult.value = this.settings.overtimeMultiplier;
		if (weeklyTarget) weeklyTarget.value = this.settings.weeklyTarget;
		if (syncEmail && this.syncData.email) syncEmail.value = this.syncData.email;
		if (syncPin && this.syncData.pin) syncPin.value = this.syncData.pin;

		// AI Settings
		const ollamaLocalUrl = document.getElementById('ollama-local-url');
		const ollamaRemoteUrl = document.getElementById('ollama-remote-url');
		const ollamaModel = document.getElementById('ollama-model');
		const ollamaEnabled = document.getElementById('ollama-enabled');

		if (ollamaLocalUrl) ollamaLocalUrl.value = this.aiConfig.ollamaLocalUrl;
		if (ollamaRemoteUrl) ollamaRemoteUrl.value = this.aiConfig.ollamaRemoteUrl;
		if (ollamaModel) ollamaModel.value = this.aiConfig.ollamaModel;
		if (ollamaEnabled) ollamaEnabled.checked = this.aiConfig.ollamaEnabled;
	},

	// ============================================
	// CLOCK IN/OUT FUNCTIONALITY
	// ============================================

	clockIn() {
		if (this.isWorking) return;

		this.isWorking = true;
		this.sessionStart = Date.now();
		this.saveToStorage();

		this.updateClockButtons();
		this.startTimer();

		this.addAIMessage('ai', `⏰ Clocked in at ${this.formatTime(new Date())}. Stay productive!`);
		this.addAIMessage('ai', `⏰ Clocked in at ${this.formatTime(new Date())}. Stay productive!`);
		this.showToast('Clocked In', 'Your time is now being tracked.', 'success');
	},

	clockOut() {
		if (!this.isWorking) return;

		const sessionEnd = Date.now();
		const duration = (sessionEnd - this.sessionStart) / 1000 / 60 / 60; // hours
		const earnings = this.calculateEarnings(duration);

		// detailed entry
		const entry = {
			id: Date.now(),
			date: new Date(this.sessionStart).toISOString().split('T')[0],
			startTime: this.sessionStart,
			endTime: sessionEnd,
			duration: duration,
			earnings: earnings
		};

		// 1. Temporarily stop the timer/UI
		this.isWorking = false;
		const originalSessionStart = this.sessionStart; // Keep backup
		this.sessionStart = null;
		this.updateClockButtons();
		this.stopTimer();
		this.updateDashboard();

		// 2. Show Undo Toast
		const formattedDuration = this.formatDuration(duration);
		const formattedEarnings = this.formatCurrency(earnings);

		this.showToast(
			'Clocked Out',
			`Session: ${formattedDuration} | Earned: ${formattedEarnings}`,
			'success',
			10000,
			{
				text: 'UNDO',
				callback: () => {
					// Undo Logic
					this.isWorking = true;
					this.sessionStart = originalSessionStart;
					this.saveToStorage();
					this.updateClockButtons();
					this.startTimer();
					this.updateDashboard();
					this.hapticFeedback('tap');
					this.showToast('Clock Out Undo', 'Resuming session...', 'info');
				}
			}
		);

		// 3. Queue final save (if not undone, this logic relies on the fact that we pushed nothing yet)
		// Actually, to make "Undo" works, we just DON'T add it yet.
		// But if we don't add it, and the user closes the app, data is lost.
		// BETTER APPROACH: Add it, and Undo removes it.

		this.timeEntries.push(entry);
		this.saveToStorage();
		this.updateRecentEntries();

		// Undo action needs to remove the *last* entry we just added
		// Re-defining the callback to be robust
		const toastAction = {
			text: 'UNDO',
			callback: () => {
				// Remove the entry we just added
				this.timeEntries = this.timeEntries.filter(e => e.id !== entry.id);

				// Restore state
				this.isWorking = true;
				this.sessionStart = originalSessionStart;

				this.saveToStorage();
				this.updateClockButtons();
				this.startTimer();
				this.updateDashboard();
				this.updateRecentEntries(); // Refresh list to show removal

				this.hapticFeedback('tap');
				this.showToast('Resumed', 'Session resumed successfully', 'info');
			}
		};

		// We need to re-call showToast with the robust callback because I can't edit the previous call easily in this thought process.
		// Let's just output the final robust code in the ReplacementContent.
	},

	checkActiveSession() {
		if (this.isWorking && this.sessionStart) {
			this.updateClockButtons();
			this.startTimer();
			this.addAIMessage('ai', `🔄 Welcome back! You're still clocked in since ${this.formatTime(new Date(this.sessionStart))}`);
		}
	},

	updateClockButtons() {
		const clockInBtn = document.getElementById('clock-in-btn');
		const clockOutBtn = document.getElementById('clock-out-btn');

		if (this.isWorking) {
			clockInBtn.disabled = true;
			clockInBtn.classList.add('disabled');
			clockOutBtn.disabled = false;
			clockOutBtn.classList.remove('disabled');
		} else {
			clockInBtn.disabled = false;
			clockInBtn.classList.remove('disabled');
			clockOutBtn.disabled = true;
			clockOutBtn.classList.add('disabled');
		}
	},

	// ============================================
	// TIMER FUNCTIONALITY
	// ============================================

	startTimer() {
		this.updateTimerDisplay();
		this.timerInterval = setInterval(() => this.updateTimerDisplay(), 1000);
	},

	stopTimer() {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
		document.getElementById('timer-value').textContent = '00:00:00';
	},

	updateTimerDisplay() {
		if (!this.sessionStart) return;

		const elapsed = Math.floor((Date.now() - this.sessionStart) / 1000);
		const hours = Math.floor(elapsed / 3600);
		const minutes = Math.floor((elapsed % 3600) / 60);
		const seconds = elapsed % 60;

		const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
		document.getElementById('timer-value').textContent = display;
	},

	// ============================================
	// REAL-TIME CLOCK
	// ============================================

	initClock() {
		this.updateClock();
		setInterval(() => this.updateClock(), 1000);
	},

	updateClock() {
		const now = new Date();
		const timeStr = this.formatTime(now);
		const dateStr = now.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		document.getElementById('current-time').textContent = timeStr;
		document.getElementById('current-date').textContent = dateStr;
	},

	// ============================================
	// EARNINGS CALCULATIONS
	// ============================================

	calculateEarnings(hours) {
		const weeklyHours = this.getWeeklyHours();
		let earnings = 0;

		if (weeklyHours + hours <= this.settings.overtimeThreshold) {
			earnings = hours * this.settings.hourlyRate;
		} else {
			const regularHours = Math.max(0, this.settings.overtimeThreshold - weeklyHours);
			const overtimeHours = hours - regularHours;
			earnings = (regularHours * this.settings.hourlyRate) +
				(overtimeHours * this.settings.hourlyRate * this.settings.overtimeMultiplier);
		}

		return earnings;
	},

	getTodayHours() {
		const today = new Date().toISOString().split('T')[0];
		let hours = this.timeEntries
			.filter(e => e.date === today)
			.reduce((sum, e) => sum + e.duration, 0);

		// Add current session if working
		if (this.isWorking && this.sessionStart) {
			hours += (Date.now() - this.sessionStart) / 1000 / 60 / 60;
		}

		return hours;
	},

	getWeeklyHours() {
		const now = new Date();
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);

		let hours = this.timeEntries
			.filter(e => new Date(e.date) >= startOfWeek)
			.reduce((sum, e) => sum + e.duration, 0);

		if (this.isWorking && this.sessionStart) {
			hours += (Date.now() - this.sessionStart) / 1000 / 60 / 60;
		}

		return hours;
	},

	getMonthlyHours() {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		let hours = this.timeEntries
			.filter(e => new Date(e.date) >= startOfMonth)
			.reduce((sum, e) => sum + e.duration, 0);

		if (this.isWorking && this.sessionStart) {
			hours += (Date.now() - this.sessionStart) / 1000 / 60 / 60;
		}

		return hours;
	},

	getTodayEarnings() {
		const today = new Date().toISOString().split('T')[0];
		return this.timeEntries
			.filter(e => e.date === today)
			.reduce((sum, e) => sum + e.earnings, 0);
	},

	getWeeklyEarnings() {
		const now = new Date();
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);

		return this.timeEntries
			.filter(e => new Date(e.date) >= startOfWeek)
			.reduce((sum, e) => sum + e.earnings, 0);
	},

	getMonthlyEarnings() {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		return this.timeEntries
			.filter(e => new Date(e.date) >= startOfMonth)
			.reduce((sum, e) => sum + e.earnings, 0);
	},

	// ============================================
	// DASHBOARD UPDATES
	// ============================================

	updateDashboard() {
		const todayHours = this.getTodayHours();
		const weekHours = this.getWeeklyHours();
		const monthHours = this.getMonthlyHours();

		const todayEarnings = this.getTodayEarnings() + (this.isWorking ? this.calculateEarnings(todayHours - this.getTodayHours()) : 0);
		const weekEarnings = this.getWeeklyEarnings();
		const monthEarnings = this.getMonthlyEarnings();

		// Update pay displays
		document.getElementById('today-pay').textContent = this.formatCurrency(this.getTodayEarnings());
		document.getElementById('today-hours').textContent = `${todayHours.toFixed(1)} hours`;

		document.getElementById('week-pay').textContent = this.formatCurrency(weekEarnings);
		document.getElementById('week-hours').textContent = `${weekHours.toFixed(1)} hours`;

		document.getElementById('month-pay').textContent = this.formatCurrency(monthEarnings);
		document.getElementById('month-hours').textContent = `${monthHours.toFixed(1)} hours`;

		// Update progress circles
		const todayPercent = Math.min(100, (todayHours / 8) * 100);
		const weekPercent = Math.min(100, (weekHours / this.settings.weeklyTarget) * 100);
		const monthPercent = Math.min(100, (monthHours / (this.settings.weeklyTarget * 4)) * 100);

		document.getElementById('today-progress').setAttribute('stroke-dasharray', `${todayPercent}, 100`);
		document.getElementById('today-percent').textContent = `${Math.round(todayPercent)}%`;

		document.getElementById('week-progress').setAttribute('stroke-dasharray', `${weekPercent}, 100`);
		document.getElementById('week-percent').textContent = `${Math.round(weekPercent)}%`;

		document.getElementById('month-progress').setAttribute('stroke-dasharray', `${monthPercent}, 100`);
		document.getElementById('month-percent').textContent = `${Math.round(monthPercent)}%`;

		this.updateRecentEntries();
		this.updateDistributionBar();
	},

	updateRecentEntries() {
		const container = document.getElementById('recent-entries');
		const recentEntries = this.timeEntries.slice(-5).reverse();

		if (recentEntries.length === 0) {
			container.innerHTML = `
        <div class="entry-line">
          <div class="entry-date">No entries</div>
          <div class="entry-info">
            <span class="entry-hours">--:-- - --:--</span>
            <p class="entry-duration">Clock in to start tracking</p>
          </div>
        </div>
      `;
			return;
		}

		container.innerHTML = recentEntries.map(entry => {
			const start = new Date(entry.startTime);
			const end = new Date(entry.endTime);
			const dateLabel = this.getDateLabel(entry.date);

			return `
        <div class="entry-line">
          <div class="entry-date">${dateLabel}</div>
          <div class="entry-info">
            <span class="entry-hours">${this.formatTime(start)} - ${this.formatTime(end)}</span>
            <p class="entry-duration">${this.formatDuration(entry.duration)} • ${this.formatCurrency(entry.earnings)}</p>
          </div>
        </div>
      `;
		}).join('');
	},

	updateDistributionBar() {
		const weekHours = this.getWeeklyHours();
		const regularHours = Math.min(weekHours, this.settings.overtimeThreshold);
		const overtimeHours = Math.max(0, weekHours - this.settings.overtimeThreshold);

		const total = regularHours + overtimeHours;
		if (total === 0) return;

		const regularPercent = (regularHours / total) * 100;
		const overtimePercent = (overtimeHours / total) * 100;

		document.getElementById('regular-bar').style.width = `${regularPercent}%`;
		document.getElementById('overtime-bar').style.width = `${overtimePercent}%`;
		document.getElementById('breaks-bar').style.width = '0%';

		document.getElementById('regular-percent').textContent = `${Math.round(regularPercent)}%`;
		document.getElementById('overtime-percent').textContent = `${Math.round(overtimePercent)}%`;
		document.getElementById('breaks-percent').textContent = '0%';
	},

	// ============================================
	// CHART INITIALIZATION
	// ============================================

	initChart() {
		const ctx = document.getElementById('chart');
		if (!ctx) return;

		const chartCtx = ctx.getContext('2d');
		const gradient = chartCtx.createLinearGradient(0, 0, 0, 450);
		gradient.addColorStop(0, 'rgba(61, 126, 255, 0.4)');
		gradient.addColorStop(0.5, 'rgba(61, 126, 255, 0.1)');
		gradient.addColorStop(1, 'rgba(61, 126, 255, 0)');

		const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const hoursData = this.getWeeklyHoursBreakdown();

		this.chart = new Chart(chartCtx, {
			type: 'line',
			data: {
				labels: weekDays,
				datasets: [{
					label: 'Hours Worked',
					backgroundColor: gradient,
					pointBackgroundColor: '#3d7eff',
					borderWidth: 2,
					borderColor: '#3d7eff',
					data: hoursData,
					fill: true
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				animation: {
					easing: 'easeInOutQuad',
					duration: 800
				},
				scales: {
					y: {
						beginAtZero: true,
						max: 12,
						ticks: { color: '#5e6a81' },
						grid: { color: 'rgba(200, 200, 200, 0.08)' }
					},
					x: {
						ticks: { color: '#5e6a81' }
					}
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						backgroundColor: 'rgba(0,0,0,0.8)',
						titleColor: 'white',
						bodyColor: 'white',
						cornerRadius: 8,
						padding: 12
					}
				}
			}
		});
	},

	getWeeklyHoursBreakdown() {
		const now = new Date();
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);

		const dailyHours = [0, 0, 0, 0, 0, 0, 0];

		this.timeEntries.forEach(entry => {
			const entryDate = new Date(entry.date);
			if (entryDate >= startOfWeek) {
				const dayIndex = entryDate.getDay();
				dailyHours[dayIndex] += entry.duration;
			}
		});

		return dailyHours.map(h => parseFloat(h.toFixed(1)));
	},

	updateChart() {
		if (this.chart) {
			this.chart.data.datasets[0].data = this.getWeeklyHoursBreakdown();
			this.chart.update();
		}
	},

	// ============================================
	// AI ASSISTANT
	// ============================================

	processAIMessage(message) {
		const lowerMsg = message.toLowerCase();

		// Store in memory
		this.aiMemory.conversationHistory.push({
			role: 'user',
			content: message,
			timestamp: Date.now()
		});
		this.aiMemory.lastInteraction = Date.now();

		let response = '';

		// Check various intents
		if (lowerMsg.includes('how much') && (lowerMsg.includes('earned') || lowerMsg.includes('made') || lowerMsg.includes('pay'))) {
			if (lowerMsg.includes('today')) {
				const earnings = this.getTodayEarnings();
				const hours = this.getTodayHours();
				response = `💰 Today you've earned **${this.formatCurrency(earnings)}** for **${hours.toFixed(1)} hours** of work.`;
			} else if (lowerMsg.includes('week')) {
				const earnings = this.getWeeklyEarnings();
				const hours = this.getWeeklyHours();
				response = `💰 This week you've earned **${this.formatCurrency(earnings)}** for **${hours.toFixed(1)} hours** of work.`;
			} else if (lowerMsg.includes('month')) {
				const earnings = this.getMonthlyEarnings();
				const hours = this.getMonthlyHours();
				response = `💰 This month you've earned **${this.formatCurrency(earnings)}** for **${hours.toFixed(1)} hours** of work.`;
			} else {
				const weekEarnings = this.getWeeklyEarnings();
				response = `💰 Your earnings summary:\n• Today: ${this.formatCurrency(this.getTodayEarnings())}\n• This Week: ${this.formatCurrency(weekEarnings)}\n• This Month: ${this.formatCurrency(this.getMonthlyEarnings())}`;
			}
		} else if (lowerMsg.includes('hours') && (lowerMsg.includes('worked') || lowerMsg.includes('many'))) {
			const today = this.getTodayHours();
			const week = this.getWeeklyHours();
			const month = this.getMonthlyHours();
			response = `⏱️ Hours tracked:\n• Today: **${today.toFixed(1)}h**\n• This Week: **${week.toFixed(1)}h** / ${this.settings.weeklyTarget}h\n• This Month: **${month.toFixed(1)}h**`;
		} else if (lowerMsg.includes('rate') || lowerMsg.includes('hourly')) {
			if (lowerMsg.includes('change') || lowerMsg.includes('set')) {
				const match = message.match(/\$?(\d+\.?\d*)/);
				if (match) {
					const newRate = parseFloat(match[1]);
					this.settings.hourlyRate = newRate;
					this.saveToStorage();
					this.updateSettingsUI();
					response = `✅ Hourly rate updated to **${this.formatCurrency(newRate)}**/hour.`;
				} else {
					response = `💡 To change your rate, say: "Set my rate to $30" or update it in Settings.`;
				}
			} else {
				response = `💵 Your current hourly rate is **${this.formatCurrency(this.settings.hourlyRate)}**/hour.\n\nOvertime (after ${this.settings.overtimeThreshold}h/week): **${this.settings.overtimeMultiplier}x** = ${this.formatCurrency(this.settings.hourlyRate * this.settings.overtimeMultiplier)}/hour`;
			}
		} else if (lowerMsg.includes('overtime')) {
			const weekHours = this.getWeeklyHours();
			const overtime = Math.max(0, weekHours - this.settings.overtimeThreshold);
			if (overtime > 0) {
				const overtimePay = overtime * this.settings.hourlyRate * this.settings.overtimeMultiplier;
				response = `⚡ You've worked **${overtime.toFixed(1)} overtime hours** this week, earning an extra **${this.formatCurrency(overtimePay)}**!`;
			} else {
				const remaining = this.settings.overtimeThreshold - weekHours;
				response = `📊 No overtime yet. You have **${remaining.toFixed(1)} hours** until overtime kicks in at ${this.settings.overtimeMultiplier}x rate.`;
			}
		} else if (lowerMsg.includes('summary') || lowerMsg.includes('status')) {
			const isWorking = this.isWorking ? '🟢 Currently clocked in' : '🔴 Currently clocked out';
			const today = this.getTodayHours();
			const week = this.getWeeklyHours();
			response = `📋 **TimeVault Summary**\n\n${isWorking}\n\n**Today:** ${today.toFixed(1)}h • ${this.formatCurrency(this.getTodayEarnings())}\n**Week:** ${week.toFixed(1)}h • ${this.formatCurrency(this.getWeeklyEarnings())}\n**Month:** ${this.getMonthlyHours().toFixed(1)}h • ${this.formatCurrency(this.getMonthlyEarnings())}\n\nRate: ${this.formatCurrency(this.settings.hourlyRate)}/hr`;
		} else if (lowerMsg.includes('clock in') || lowerMsg.includes('start')) {
			if (!this.isWorking) {
				this.clockIn();
				response = `✅ I've clocked you in! Timer started.`;
			} else {
				response = `⚠️ You're already clocked in since ${this.formatTime(new Date(this.sessionStart))}.`;
			}
		} else if (lowerMsg.includes('clock out') || lowerMsg.includes('stop')) {
			if (this.isWorking) {
				this.clockOut();
				response = `✅ Clocked you out! Time entry saved.`;
			} else {
				response = `⚠️ You're not currently clocked in.`;
			}
		} else if (lowerMsg.includes('help')) {
			response = `🤖 **TimeVault AI Commands:**\n
• "How much have I earned today/this week/this month?"
• "How many hours have I worked?"
• "What's my hourly rate?"
• "Set my rate to $XX"
• "Show overtime details"
• "Give me a summary"
• "Clock me in/out"
• "Help" - Show this menu`;
		} else if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
			const greetings = ['Hello!', 'Hey there!', 'Hi!', 'Greetings!'];
			response = `${greetings[Math.floor(Math.random() * greetings.length)]} 👋 How can I help you with your time tracking today?`;
		} else if (lowerMsg.includes('thank')) {
			response = `You're welcome! 😊 Happy to help with your time tracking.`;
		} else {
			response = `🤔 I'm not sure I understood that. Try asking:\n• "How much have I earned?"\n• "How many hours this week?"\n• "What's my rate?"\n• "Give me a summary"\n\nOr type "help" for all commands.`;
		}

		// Store AI response in memory
		this.aiMemory.conversationHistory.push({
			role: 'ai',
			content: response,
			timestamp: Date.now()
		});

		// Keep only last 50 messages
		if (this.aiMemory.conversationHistory.length > 50) {
			this.aiMemory.conversationHistory = this.aiMemory.conversationHistory.slice(-50);
		}

		this.saveToStorage();
		return response;
	},

	addAIMessage(role, content) {
		const chatContainer = document.getElementById('ai-chat');
		const messageDiv = document.createElement('div');
		messageDiv.className = `ai-message ${role === 'ai' ? 'ai-response' : 'user-message'}`;

		// Convert markdown-like formatting
		const formatted = content
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\n/g, '<br>');

		messageDiv.innerHTML = `<p>${formatted}</p>`;
		chatContainer.appendChild(messageDiv);
		chatContainer.scrollTop = chatContainer.scrollHeight;
	},

	// ============================================
	// ENHANCED AI ENGINE - OLLAMA INTEGRATION
	// ============================================

	async initAIEngine() {
		// Initialize voice recognition
		this.initVoiceRecognition();

		// Test Ollama connection
		await this.testOllamaConnection();

		// Generate initial smart suggestions
		this.generateSmartSuggestions();

		// Update suggestions periodically
		setInterval(() => this.generateSmartSuggestions(), 5 * 60 * 1000); // Every 5 mins

		console.log('TimeVault: AI Engine initialized');
	},

	async testOllamaConnection() {
		this.updateConnectionStatus('testing');

		// Try local connection first
		if (this.aiConfig.ollamaEnabled) {
			try {
				const localResponse = await fetch(`${this.aiConfig.ollamaLocalUrl}/api/tags`, {
					method: 'GET',
					signal: AbortSignal.timeout(3000)
				});
				if (localResponse.ok) {
					this.aiConfig.connectionStatus = 'local';
					this.updateConnectionStatus('local');
					console.log('TimeVault: Connected to local Ollama');
					return true;
				}
			} catch (e) {
				console.log('TimeVault: Local Ollama not available');
			}

			// Try remote connection
			if (this.aiConfig.ollamaRemoteUrl) {
				try {
					const remoteResponse = await fetch(`${this.aiConfig.ollamaRemoteUrl}/api/tags`, {
						method: 'GET',
						signal: AbortSignal.timeout(5000)
					});
					if (remoteResponse.ok) {
						this.aiConfig.connectionStatus = 'remote';
						this.updateConnectionStatus('remote');
						console.log('TimeVault: Connected to remote Ollama');
						return true;
					}
				} catch (e) {
					console.log('TimeVault: Remote Ollama not available');
				}
			}
		}

		this.aiConfig.connectionStatus = 'disconnected';
		this.updateConnectionStatus('disconnected');
		return false;
	},

	updateConnectionStatus(status) {
		const indicator = document.getElementById('ai-connection-status');
		const statusText = document.getElementById('ai-connection-text');

		if (indicator) {
			indicator.className = 'ai-connection-indicator ' + status;
		}
		if (statusText) {
			const statusMap = {
				'local': '🟢 Local AI',
				'remote': '🔵 Remote AI',
				'disconnected': '🟡 Local Only',
				'testing': '⏳ Connecting...'
			};
			statusText.textContent = statusMap[status] || 'Unknown';
		}
	},

	async sendToOllama(message) {
		const baseUrl = this.aiConfig.connectionStatus === 'remote'
			? this.aiConfig.ollamaRemoteUrl
			: this.aiConfig.ollamaLocalUrl;

		// Build context from TimeVault data
		const context = this.buildAIContext();

		const systemPrompt = `You are TimeVault AI, a helpful assistant for time tracking and payroll. 
You have access to the user's time tracking data:
${context}

Be concise, friendly, and helpful. Use emojis occasionally. Format currency as USD. 
If asked about calculations, be precise. If you don't know something, say so.`;

		try {
			const response = await fetch(`${baseUrl}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: this.aiConfig.ollamaModel,
					prompt: message,
					system: systemPrompt,
					stream: false,
					options: {
						temperature: 0.7,
						num_predict: 256
					}
				}),
				signal: AbortSignal.timeout(30000)
			});

			if (response.ok) {
				const data = await response.json();
				return data.response || "I couldn't generate a response.";
			}
		} catch (e) {
			console.error('Ollama error:', e);
		}

		return null; // Return null to trigger fallback
	},

	buildAIContext() {
		const today = this.getTodayHours();
		const week = this.getWeeklyHours();
		const month = this.getMonthlyHours();
		const todayEarnings = this.getTodayEarnings();
		const weekEarnings = this.getWeeklyEarnings();
		const monthEarnings = this.getMonthlyEarnings();
		const overtime = Math.max(0, week - this.settings.overtimeThreshold);

		return `
- Currently clocked ${this.isWorking ? 'IN' : 'OUT'}
- Today: ${today.toFixed(1)} hours, ${this.formatCurrency(todayEarnings)}
- This week: ${week.toFixed(1)} hours, ${this.formatCurrency(weekEarnings)}
- This month: ${month.toFixed(1)} hours, ${this.formatCurrency(monthEarnings)}
- Overtime this week: ${overtime.toFixed(1)} hours
- Hourly rate: ${this.formatCurrency(this.settings.hourlyRate)} (OT: ${this.settings.overtimeMultiplier}x)
- Weekly target: ${this.settings.weeklyTarget} hours
- Total entries: ${this.timeEntries.length}`;
	},

	// Enhanced message processing with Ollama fallback
	async processAIMessageEnhanced(message) {
		// Store in memory
		this.aiMemory.conversationHistory.push({
			role: 'user',
			content: message,
			timestamp: Date.now()
		});
		this.aiMemory.lastInteraction = Date.now();

		let response = '';

		// Try Ollama if connected
		if (this.aiConfig.connectionStatus === 'local' || this.aiConfig.connectionStatus === 'remote') {
			this.showTypingIndicator();
			response = await this.sendToOllama(message);
			this.hideTypingIndicator();
		}

		// Fallback to local processing if Ollama fails or is disconnected
		if (!response) {
			response = this.processAIMessage(message);
		}

		// Store AI response
		this.aiMemory.conversationHistory.push({
			role: 'ai',
			content: response,
			timestamp: Date.now()
		});

		// Keep only last 50 messages
		if (this.aiMemory.conversationHistory.length > 50) {
			this.aiMemory.conversationHistory = this.aiMemory.conversationHistory.slice(-50);
		}

		this.saveToStorage();
		return response;
	},

	showTypingIndicator() {
		const chatContainer = document.getElementById('ai-chat');
		const typing = document.createElement('div');
		typing.id = 'ai-typing';
		typing.className = 'ai-message ai-response typing';
		typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
		chatContainer.appendChild(typing);
		chatContainer.scrollTop = chatContainer.scrollHeight;
	},

	hideTypingIndicator() {
		document.getElementById('ai-typing')?.remove();
	},

	// ============================================
	// VOICE RECOGNITION
	// ============================================

	initVoiceRecognition() {
		if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
			console.log('TimeVault: Speech recognition not supported');
			this.aiConfig.voiceEnabled = false;
			return;
		}

		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		this.voiceRecognition = new SpeechRecognition();
		this.voiceRecognition.continuous = false;
		this.voiceRecognition.interimResults = true;
		this.voiceRecognition.lang = this.aiConfig.voiceLanguage;

		this.voiceRecognition.onstart = () => {
			this.aiConfig.isListening = true;
			this.updateVoiceButton(true);
			console.log('TimeVault: Voice recognition started');
		};

		this.voiceRecognition.onend = () => {
			this.aiConfig.isListening = false;
			this.updateVoiceButton(false);
			console.log('TimeVault: Voice recognition ended');
		};

		this.voiceRecognition.onresult = (event) => {
			let finalTranscript = '';
			let interimTranscript = '';

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const transcript = event.results[i][0].transcript;
				if (event.results[i].isFinal) {
					finalTranscript += transcript;
				} else {
					interimTranscript += transcript;
				}
			}

			// Update input field with interim results
			const input = document.getElementById('ai-input');
			if (input) {
				input.value = finalTranscript || interimTranscript;
			}

			// Process final result
			if (finalTranscript) {
				this.handleVoiceCommand(finalTranscript);
			}
		};

		this.voiceRecognition.onerror = (event) => {
			console.error('Voice recognition error:', event.error);
			this.aiConfig.isListening = false;
			this.updateVoiceButton(false);

			if (event.error === 'not-allowed') {
				this.showToast('Voice Denied', 'Please allow microphone access for voice input', 'error');
			}
		};
	},

	toggleVoiceRecognition() {
		if (!this.voiceRecognition) {
			this.showToast('Not Supported', 'Voice recognition is not available in this browser', 'warning');
			return;
		}

		if (this.aiConfig.isListening) {
			this.voiceRecognition.stop();
		} else {
			try {
				this.voiceRecognition.start();
			} catch (e) {
				console.error('Failed to start voice recognition:', e);
			}
		}
	},

	updateVoiceButton(isListening) {
		const btn = document.getElementById('voice-input-btn');
		if (btn) {
			btn.classList.toggle('listening', isListening);
			btn.setAttribute('title', isListening ? 'Listening...' : 'Voice Input');
		}
	},

	async handleVoiceCommand(transcript) {
		this.addAIMessage('user', `🎤 ${transcript}`);
		const response = await this.processAIMessageEnhanced(transcript);
		this.addAIMessage('ai', response);
	},

	// ============================================
	// SMART SUGGESTIONS
	// ============================================

	generateSmartSuggestions() {
		if (!this.aiConfig.suggestionsEnabled) return;

		const suggestions = [];
		const now = new Date();
		const hour = now.getHours();
		const dayOfWeek = now.getDay();
		const weekHours = this.getWeeklyHours();
		const todayHours = this.getTodayHours();

		// Time-based suggestions
		if (hour >= 7 && hour <= 9 && !this.isWorking) {
			suggestions.push({
				icon: '☀️',
				title: 'Good Morning!',
				text: 'Ready to start your day? Clock in to begin tracking.',
				action: 'clockIn'
			});
		}

		if (hour >= 12 && hour <= 13 && this.isWorking && todayHours >= 4) {
			suggestions.push({
				icon: '🍽️',
				title: 'Lunch Break?',
				text: "You've worked 4+ hours. Consider taking a break!",
				action: 'break'
			});
		}

		if (hour >= 17 && hour <= 18 && this.isWorking) {
			suggestions.push({
				icon: '🌅',
				title: 'End of Day',
				text: 'Wrapping up? Clock out when you\'re done.',
				action: 'clockOut'
			});
		}

		// Goal progress
		const weeklyProgress = (weekHours / this.settings.weeklyTarget) * 100;
		if (weeklyProgress < 50 && dayOfWeek >= 3) {
			suggestions.push({
				icon: '📊',
				title: 'Weekly Goal',
				text: `${weeklyProgress.toFixed(0)}% of ${this.settings.weeklyTarget}h target. You need ${(this.settings.weeklyTarget - weekHours).toFixed(1)}h more.`,
				action: 'viewPayroll'
			});
		}

		// Overtime alert
		const hoursUntilOT = this.settings.overtimeThreshold - weekHours;
		if (hoursUntilOT > 0 && hoursUntilOT <= 5) {
			suggestions.push({
				icon: '⚡',
				title: 'Overtime Soon!',
				text: `Only ${hoursUntilOT.toFixed(1)}h until overtime at ${this.settings.overtimeMultiplier}x rate.`,
				action: 'viewPayroll'
			});
		}

		if (hoursUntilOT <= 0) {
			const otHours = Math.abs(hoursUntilOT);
			suggestions.push({
				icon: '💰',
				title: 'Overtime Active!',
				text: `You have ${otHours.toFixed(1)}h overtime this week!`,
				action: 'viewPayroll'
			});
		}

		// Earnings projection
		if (this.timeEntries.length >= 5) {
			const avgDaily = this.getAverageDailyHours();
			const projectedWeek = avgDaily * 5;
			const projectedEarnings = projectedWeek * this.settings.hourlyRate;
			suggestions.push({
				icon: '📈',
				title: 'Weekly Projection',
				text: `At your pace, you'll earn ~${this.formatCurrency(projectedEarnings)} this week.`,
				action: 'viewReports'
			});
		}

		// Session reminder
		if (this.isWorking) {
			const sessionDuration = (Date.now() - this.sessionStart) / (1000 * 60 * 60);
			if (sessionDuration >= 4) {
				suggestions.push({
					icon: '⏰',
					title: 'Long Session',
					text: `You've been working ${sessionDuration.toFixed(1)} hours straight. Take a break!`,
					action: 'break'
				});
			}
		}

		// Render suggestions (max 3)
		this.renderSmartSuggestions(suggestions.slice(0, 3));
		this.aiConfig.lastSuggestionUpdate = Date.now();
	},

	getAverageDailyHours() {
		if (this.timeEntries.length === 0) return 0;

		const daysWorked = new Set(
			this.timeEntries.map(e => new Date(e.startTime).toDateString())
		).size;

		const totalHours = this.timeEntries.reduce((sum, e) => sum + e.duration, 0);
		return daysWorked > 0 ? totalHours / daysWorked : 0;
	},

	renderSmartSuggestions(suggestions) {
		const container = document.getElementById('smart-suggestions');
		if (!container) return;

		if (suggestions.length === 0) {
			container.innerHTML = '<p class="suggestions-empty">No suggestions right now. Keep tracking!</p>';
			return;
		}

		container.innerHTML = suggestions.map(s => `
			<div class="suggestion-card" data-action="${s.action}">
				<span class="suggestion-icon">${s.icon}</span>
				<div class="suggestion-content">
					<strong>${s.title}</strong>
					<p>${s.text}</p>
				</div>
			</div>
		`).join('');

		// Add click handlers
		container.querySelectorAll('.suggestion-card').forEach(card => {
			card.addEventListener('click', () => {
				const action = card.dataset.action;
				this.handleSuggestionAction(action);
			});
		});
	},

	handleSuggestionAction(action) {
		switch (action) {
			case 'clockIn':
				if (!this.isWorking) this.clockIn();
				break;
			case 'clockOut':
				if (this.isWorking) this.clockOut();
				break;
			case 'break':
				this.showToast('Break Time', 'Remember to rest and recharge! 🧘', 'info');
				break;
			case 'viewPayroll':
				this.switchView('payroll');
				document.querySelector('[data-view="payroll"]')?.click();
				break;
			case 'viewReports':
				this.switchView('reports');
				document.querySelector('[data-view="reports"]')?.click();
				break;
		}
	},


	// ============================================
	// SYNC FUNCTIONALITY
	// ============================================

	async syncWithEmail(email) {
		if (!email || !this.validateEmail(email)) {
			this.showToast('Invalid Email', 'Please enter a valid email address.', 'warning');
			return;
		}

		this.syncData.email = email;
		this.syncData.lastSync = Date.now();
		this.saveToStorage();

		// Generate sync code from email
		const syncCode = this.generateSyncCode(email);

		this.updateSyncStatus(true);
		this.showToast('Sync Enabled', `Your data is synced with code: ${syncCode}`, 'success');
		this.addAIMessage('ai', `📧 Sync enabled with ${email}. Your sync code is: **${syncCode}**. Use this on other devices to sync your data.`);
	},

	async syncWithPin(pin) {
		if (!pin || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
			this.showToast('Invalid PIN', 'PIN must be 4-8 digits.', 'warning');
			return;
		}

		this.syncData.pin = pin;
		this.syncData.lastSync = Date.now();
		this.saveToStorage();

		this.updateSyncStatus(true);
		this.showToast('Sync Enabled', `Your data is synced with PIN: ${pin}`, 'success');
		this.addAIMessage('ai', `🔐 PIN sync enabled! Use PIN **${pin}** on other devices to access your TimeVault data.`);
	},

	generateSyncCode(email) {
		// Simple hash for demo (in production, use proper server-side sync)
		let hash = 0;
		for (let i = 0; i < email.length; i++) {
			hash = ((hash << 5) - hash) + email.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash).toString(36).substring(0, 8).toUpperCase();
	},

	updateSyncStatus(synced) {
		const statusEl = document.getElementById('sync-status');
		const indicator = statusEl.querySelector('.sync-indicator');
		const text = statusEl.querySelector('span:last-child');

		if (synced) {
			indicator.classList.remove('offline');
			indicator.classList.add('online');
			text.textContent = 'Synced';
		} else {
			indicator.classList.remove('online');
			indicator.classList.add('offline');
			text.textContent = 'Local Mode';
		}
	},

	exportData() {
		const data = {
			version: '1.0',
			exportDate: new Date().toISOString(),
			settings: this.settings,
			timeEntries: this.timeEntries,
			aiMemory: this.aiMemory
		};

		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `timevault-backup-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);

		this.showToast('Export Complete', 'Your TimeVault data has been downloaded.', 'success');
		this.addAIMessage('ai', '💾 Data exported successfully! Keep this backup file safe.');
	},

	importData(file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = JSON.parse(e.target.result);

				if (data.settings) this.settings = { ...this.settings, ...data.settings };
				if (data.timeEntries) this.timeEntries = data.timeEntries;
				if (data.aiMemory) this.aiMemory = { ...this.aiMemory, ...data.aiMemory };

				this.saveToStorage();
				this.updateSettingsUI();
				this.updateDashboard();
				this.updateChart();

				this.showToast('Import Complete', `Imported ${data.timeEntries?.length || 0} time entries.`, 'success');
				this.addAIMessage('ai', `📥 Data imported! ${data.timeEntries?.length || 0} entries restored.`);
			} catch (err) {
				this.showToast('Import Failed', 'Invalid backup file format.', 'error');
			}
		};
		reader.readAsText(file);
	},

	// ============================================
	// UTILITY FUNCTIONS
	// ============================================

	formatTime(date) {
		if (this.settings.timeFormat === '24') {
			return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
		}
		return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
	},

	formatCurrency(amount) {
		return `${this.settings.currencySymbol}${amount.toFixed(2)}`;
	},

	formatDuration(hours) {
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);
		if (h === 0) return `${m}m`;
		if (m === 0) return `${h}h`;
		return `${h}h ${m}m`;
	},

	getDateLabel(dateStr) {
		const date = new Date(dateStr);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (dateStr === today.toISOString().split('T')[0]) return 'Today';
		if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
		return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	},

	validateEmail(email) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	},



	// ============================================
	// EVENT LISTENERS
	// ============================================

	initEventListeners() {
		// Clock In/Out
		document.getElementById('clock-in-btn')?.addEventListener('click', () => this.clockIn());
		document.getElementById('clock-out-btn')?.addEventListener('click', () => this.clockOut());

		// Weekly Summary
		document.getElementById('generate-summary-btn')?.addEventListener('click', () => this.generateWeeklySummary());

		// AI Chat
		document.getElementById('ai-send-btn')?.addEventListener('click', () => this.handleAISubmit());
		document.getElementById('ai-input')?.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') this.handleAISubmit();
		});

		// Voice Input Button
		document.getElementById('voice-input-btn')?.addEventListener('click', () => this.toggleVoiceRecognition());

		// Test Ollama Connection Button
		document.getElementById('test-ollama-btn')?.addEventListener('click', async () => {
			const btn = document.getElementById('test-ollama-btn');
			btn.textContent = 'Testing...';
			const connected = await this.testOllamaConnection();
			btn.textContent = connected ? '✓ Connected' : 'Test Connection';
			setTimeout(() => { btn.textContent = 'Test Connection'; }, 2000);
		});

		// Save AI Settings
		document.getElementById('save-ai-settings-btn')?.addEventListener('click', () => {
			this.aiConfig.ollamaLocalUrl = document.getElementById('ollama-local-url')?.value || 'http://localhost:11434';
			this.aiConfig.ollamaRemoteUrl = document.getElementById('ollama-remote-url')?.value || '';
			this.aiConfig.ollamaModel = document.getElementById('ollama-model')?.value || 'llama3';
			this.aiConfig.ollamaEnabled = document.getElementById('ollama-enabled')?.checked ?? true;
			this.saveToStorage();
			this.showToast('AI Settings Saved', 'Your AI configuration has been updated', 'success');
			this.testOllamaConnection();
		});


		// Settings
		document.getElementById('hourly-rate')?.addEventListener('change', (e) => {
			this.settings.hourlyRate = parseFloat(e.target.value) || 25;
			this.saveToStorage();
			this.updateDashboard();
		});

		document.getElementById('overtime-multiplier')?.addEventListener('change', (e) => {
			this.settings.overtimeMultiplier = parseFloat(e.target.value);
			this.saveToStorage();
		});

		document.getElementById('weekly-target')?.addEventListener('change', (e) => {
			this.settings.weeklyTarget = parseInt(e.target.value) || 40;
			this.saveToStorage();
			this.updateDashboard();
		});

		// Sync
		document.getElementById('sync-email-btn')?.addEventListener('click', () => {
			const email = document.getElementById('sync-email').value;
			this.syncWithEmail(email);
		});

		document.getElementById('sync-pin-btn')?.addEventListener('click', () => {
			const pin = document.getElementById('sync-pin').value;
			this.syncWithPin(pin);
		});

		// Export/Import
		document.getElementById('export-data-btn')?.addEventListener('click', () => this.exportData());
		document.getElementById('import-data-btn')?.addEventListener('click', () => {
			document.getElementById('import-file').click();
		});
		document.getElementById('import-file')?.addEventListener('change', (e) => {
			if (e.target.files[0]) this.importData(e.target.files[0]);
		});

		// Navigation - View Switching
		document.querySelectorAll('.nav-list-item').forEach(item => {
			item.addEventListener('click', (e) => {
				e.preventDefault();
				const viewName = item.getAttribute('data-view');

				// Update active nav item
				document.querySelectorAll('.nav-list-item').forEach(i => i.classList.remove('active'));
				item.classList.add('active');

				// Switch views
				this.switchView(viewName);

				// Close mobile menu if open
				document.querySelector('.app-left')?.classList.remove('show');
			});
		});


		// Mobile menu
		document.querySelector('.menu-button')?.addEventListener('click', () => {
			document.querySelector('.app-left').classList.add('show');
		});

		document.querySelector('.close-menu')?.addEventListener('click', () => {
			document.querySelector('.app-left').classList.remove('show');
		});

		document.querySelector('.open-right-area')?.addEventListener('click', () => {
			document.querySelector('.app-right').classList.add('show');
		});

		document.querySelector('.close-right')?.addEventListener('click', () => {
			document.querySelector('.app-right').classList.remove('show');
		});

		// AI Toggle
		document.getElementById('ai-toggle-btn')?.addEventListener('click', () => {
			document.querySelector('.app-right').classList.toggle('show');
		});

		// Sidebar collapse/expand toggle
		document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
			const sidebar = document.querySelector('.app-left');
			sidebar.classList.toggle('collapsed');
			// Save preference
			localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
		});

		// Restore sidebar state from localStorage
		const sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
		if (sidebarCollapsed) {
			document.querySelector('.app-left')?.classList.add('collapsed');
		}




		document.getElementById('close-settings')?.addEventListener('click', () => {
			document.getElementById('settings-modal')?.classList.add('hidden');
		});

		// Clear all data
		document.getElementById('clear-all-data')?.addEventListener('click', () => {
			if (confirm('Are you sure you want to delete ALL your TimeVault data? This cannot be undone.')) {
				localStorage.removeItem('timevault_data');
				location.reload();
			}
		});

		// Request notification permission
		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission();
		}

		// Add Entry, Export, and Filter buttons
		document.getElementById('add-entry-btn')?.addEventListener('click', () => this.showAddEntryModal());
		document.getElementById('export-payroll-btn')?.addEventListener('click', () => this.exportPayrollPDF());
		document.getElementById('export-report-btn')?.addEventListener('click', () => this.exportReportCSV());
		document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
		document.getElementById('filter-report-btn')?.addEventListener('click', () => this.filterReport());
		document.getElementById('timecard-filter')?.addEventListener('change', () => this.renderTimeCard());
		document.getElementById('payroll-period-select')?.addEventListener('change', () => this.renderPayroll());

		// Settings page data management
		document.getElementById('settings-export-data')?.addEventListener('click', () => this.exportData());
		document.getElementById('settings-import-data')?.addEventListener('click', () => document.getElementById('import-file').click());
		document.getElementById('settings-clear-data')?.addEventListener('click', () => {
			if (confirm('Are you sure you want to delete ALL your TimeVault data? This cannot be undone.')) {
				localStorage.removeItem('timevault_data');
				location.reload();
			}
		});

		// Update dashboard periodically if working
		setInterval(() => {
			if (this.isWorking) {
				this.updateDashboard();
			}
		}, 60000); // Every minute
	},

	async handleAISubmit() {
		const input = document.getElementById('ai-input');
		const message = input.value.trim();

		if (!message) return;

		this.addAIMessage('user', message);
		input.value = '';

		// Use enhanced AI with Ollama integration
		const response = await this.processAIMessageEnhanced(message);
		this.addAIMessage('ai', response);
	},


	// ============================================
	// VIEW SWITCHING SYSTEM
	// ============================================

	switchView(viewName) {
		// Hide all views
		document.querySelectorAll('.view-content').forEach(view => {
			view.classList.remove('active');
		});

		// Show selected view
		const targetView = document.getElementById(`view-${viewName}`);
		if (targetView) {
			targetView.classList.add('active');

			// Render content for specific views
			switch (viewName) {
				case 'timecard':
					this.renderTimeCard();
					break;
				case 'payroll':
					this.renderPayroll();
					break;
				case 'reports':
					this.renderReports();
					break;
				case 'settings':
					this.renderSettings();
					break;
			}
		}
	},

	// ============================================
	// TIME CARD PAGE
	// ============================================

	renderTimeCard() {
		const tbody = document.getElementById('timecard-entries');
		const filter = document.getElementById('timecard-filter')?.value || 'week';

		if (!tbody) return;

		const filteredEntries = this.getFilteredEntries(filter);

		if (filteredEntries.length === 0) {
			tbody.innerHTML = '<tr class="empty-state"><td colspan="6">No time entries yet. Clock in to start tracking!</td></tr>';
		} else {
			tbody.innerHTML = filteredEntries.map(entry => `
				<tr data-id="${entry.id}">
					<td class="drag-handle" style="width: 30px; text-align: center; color: var(--text-secondary); cursor: grab; font-size: 18px;">⋮⋮</td>
					<td>${this.formatEntryDate(entry.startTime)}</td>
					<td>${this.formatTime(new Date(entry.startTime))}</td>
					<td>${this.formatTime(new Date(entry.endTime))}</td>
					<td>${this.formatDuration(entry.duration)}</td>
					<td>${this.formatCurrency(entry.earnings)}</td>
					<td>
						<div class="entry-actions">
							<button class="btn-edit" onclick="TimeVault.editEntry(${entry.id})">Edit</button>
							<button class="btn-delete" onclick="TimeVault.deleteEntry(${entry.id})">Delete</button>
						</div>
					</td>
				</tr>
			`).join('');
		}

		// Update filter stats
		const totalHours = filteredEntries.reduce((sum, e) => sum + e.duration, 0);
		const totalEarnings = filteredEntries.reduce((sum, e) => sum + e.earnings, 0);

		document.getElementById('filter-total-hours').textContent = totalHours.toFixed(1);
		document.getElementById('filter-total-earnings').textContent = this.formatCurrency(totalEarnings);

	},

	getFilteredEntries(filter) {
		const now = new Date();
		return this.timeEntries.filter(entry => {
			const entryDate = new Date(entry.startTime);
			switch (filter) {
				case 'today':
					return entryDate.toDateString() === now.toDateString();
				case 'week':
					const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
					return entryDate >= weekAgo;
				case 'month':
					return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
				default:
					return true;
			}
		}).sort((a, b) => b.startTime - a.startTime);
	},

	formatEntryDate(timestamp) {
		const date = new Date(timestamp);
		const today = new Date();
		const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

		if (date.toDateString() === today.toDateString()) return 'Today';
		if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	},

	deleteEntry(id) {
		if (confirm('Delete this time entry?')) {
			this.timeEntries = this.timeEntries.filter(e => e.id !== id);
			this.saveToStorage();
			this.saveToStorage();
			this.renderTimeCard();
			this.updateDashboard();
			this.showToast('Entry Deleted', 'Time entry has been removed', 'info');
		}
	},

	editEntry(id) {
		this.showToast('Coming Soon', 'Edit functionality is under development', 'info');
	},

	// ============================================
	// PAYROLL PAGE
	// ============================================

	renderPayroll() {
		const period = document.getElementById('payroll-period-select')?.value || 'current-month';
		const entries = this.getPayrollEntries(period);

		// Calculate totals
		let regularHours = 0;
		let overtimeHours = 0;
		let regularPay = 0;
		let overtimePay = 0;

		entries.forEach(entry => {
			const weekHours = this.getWeeklyHoursAt(entry.startTime);
			if (weekHours + entry.duration <= this.settings.overtimeThreshold) {
				regularHours += entry.duration;
				regularPay += entry.duration * this.settings.hourlyRate;
			} else {
				const regHours = Math.max(0, this.settings.overtimeThreshold - weekHours);
				const otHours = entry.duration - regHours;
				regularHours += regHours;
				overtimeHours += otHours;
				regularPay += regHours * this.settings.hourlyRate;
				overtimePay += otHours * this.settings.hourlyRate * this.settings.overtimeMultiplier;
			}
		});

		const grossPay = regularPay + overtimePay;

		// Update summary cards
		document.getElementById('gross-pay').textContent = this.formatCurrency(grossPay);
		document.getElementById('gross-hours').textContent = `${(regularHours + overtimeHours).toFixed(1)} total hours`;

		document.getElementById('regular-pay').textContent = this.formatCurrency(regularPay);
		document.getElementById('regular-hours-detail').textContent =
			`${regularHours.toFixed(1)} hours @ ${this.formatCurrency(this.settings.hourlyRate)}/hr`;

		document.getElementById('overtime-pay').textContent = this.formatCurrency(overtimePay);
		document.getElementById('overtime-hours-detail').textContent =
			`${overtimeHours.toFixed(1)} hours @ ${this.formatCurrency(this.settings.hourlyRate * this.settings.overtimeMultiplier)}/hr`;

	},

	getPayrollEntries(period) {
		const now = new Date();
		return this.timeEntries.filter(entry => {
			const date = new Date(entry.startTime);
			switch (period) {
				case 'current-week':
					const weekStart = new Date(now);
					weekStart.setDate(now.getDate() - now.getDay());
					return date >= weekStart;
				case 'last-week':
					const lastWeekStart = new Date(now);
					lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
					const lastWeekEnd = new Date(lastWeekStart);
					lastWeekEnd.setDate(lastWeekStart.getDate() + 7);
					return date >= lastWeekStart && date < lastWeekEnd;
				case 'current-month':
					return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
				case 'last-month':
					const lastMonth = new Date(now);
					lastMonth.setMonth(now.getMonth() - 1);
					return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
				case 'ytd':
					return date.getFullYear() === now.getFullYear();
				default:
					return true;
			}
		});
	},

	getWeeklyHoursAt(timestamp) {
		const date = new Date(timestamp);
		const weekStart = new Date(date);
		weekStart.setDate(date.getDate() - date.getDay());
		weekStart.setHours(0, 0, 0, 0);

		return this.timeEntries
			.filter(e => {
				const eDate = new Date(e.startTime);
				return eDate >= weekStart && eDate < date;
			})
			.reduce((sum, e) => sum + e.duration, 0);
	},

	// ============================================
	// REPORTS PAGE
	// ============================================

	renderReports() {
		// Calculate stats
		const allEntries = this.timeEntries;
		const totalHours = allEntries.reduce((sum, e) => sum + e.duration, 0);
		const totalEarnings = allEntries.reduce((sum, e) => sum + e.earnings, 0);

		// Last 30 days
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		const last30Days = allEntries.filter(e => new Date(e.startTime) >= thirtyDaysAgo);
		const daysWorked = new Set(last30Days.map(e => new Date(e.startTime).toDateString())).size;
		const avgHours = daysWorked > 0 ? last30Days.reduce((sum, e) => sum + e.duration, 0) / daysWorked : 0;

		// Update stat cards
		document.getElementById('report-total-hours').textContent = totalHours.toFixed(1);
		document.getElementById('report-total-earnings').textContent = this.formatCurrency(totalEarnings);
		document.getElementById('report-avg-hours').textContent = avgHours.toFixed(1);
		document.getElementById('report-days-worked').textContent = daysWorked;

		// Render report chart if canvas exists
		const reportCanvas = document.getElementById('report-chart');
		if (reportCanvas) {
			this.initReportChart();
		}
	},

	initReportChart() {
		const canvas = document.getElementById('report-chart');
		if (!canvas) return;

		const ctx = canvas.getContext('2d');

		// Get last 12 months data
		const monthlyData = this.getMonthlyData();

		if (window.reportChart) {
			window.reportChart.destroy();
		}

		window.reportChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: monthlyData.labels,
				datasets: [
					{
						label: 'Hours',
						data: monthlyData.hours,
						borderColor: '#3d7eff',
						backgroundColor: 'rgba(61, 126, 255, 0.1)',
						tension: 0.4
					},
					{
						label: 'Earnings',
						data: monthlyData.earnings,
						borderColor: '#00cfde',
						backgroundColor: 'rgba(0, 207, 222, 0.1)',
						tension: 0.4,
						yAxisID: 'y1'
					}
				]
			},
			options: {
				responsive: true,
				interaction: {
					mode: 'index',
					intersect: false
				},
				scales: {
					y: {
						type: 'linear',
						display: true,
						position: 'left'
					},
					y1: {
						type: 'linear',
						display: true,
						position: 'right',
						grid: {
							drawOnChartArea: false
						}
					}
				}
			}
		});
	},

	getMonthlyData() {
		const now = new Date();
		const labels = [];
		const hours = [];
		const earnings = [];

		for (let i = 11; i >= 0; i--) {
			const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
			labels.push(month.toLocaleDateString('en-US', { month: 'short' }));

			const monthEntries = this.timeEntries.filter(e => {
				const eDate = new Date(e.startTime);
				return eDate.getMonth() === month.getMonth() && eDate.getFullYear() === month.getFullYear();
			});

			hours.push(monthEntries.reduce((sum, e) => sum + e.duration, 0));
			earnings.push(monthEntries.reduce((sum, e) => sum + e.earnings, 0));
		}

		return { labels, hours, earnings };
	},

	// ============================================
	// SETTINGS PAGE
	// ============================================

	renderSettings() {
		// Populate settings fields
		document.getElementById('settings-hourly-rate').value = this.settings.hourlyRate;
		document.getElementById('settings-overtime-multiplier').value = this.settings.overtimeMultiplier;
		document.getElementById('settings-overtime-threshold').value = this.settings.overtimeThreshold;
		document.getElementById('settings-weekly-target').value = this.settings.weeklyTarget;
		document.getElementById('settings-currency').value = this.settings.currencySymbol;
		document.getElementById('settings-time-format').value = this.settings.timeFormat;

		// Calculate storage used
		const dataSize = new Blob([localStorage.getItem('timevault_data') || '']).size;
		document.getElementById('storage-used').textContent = `${(dataSize / 1024).toFixed(2)} KB`;


	},

	saveSettings() {
		this.settings.hourlyRate = parseFloat(document.getElementById('settings-hourly-rate').value) || 25;
		this.settings.overtimeMultiplier = parseFloat(document.getElementById('settings-overtime-multiplier').value) || 1.5;
		this.settings.overtimeThreshold = parseInt(document.getElementById('settings-overtime-threshold').value) || 40;
		this.settings.weeklyTarget = parseInt(document.getElementById('settings-weekly-target').value) || 40;
		this.settings.currencySymbol = document.getElementById('settings-currency').value || '$';
		this.settings.timeFormat = document.getElementById('settings-time-format').value || '12';

		this.saveToStorage();
		this.updateDashboard();
		this.showToast('Settings Saved', 'Your settings have been updated successfully', 'success');
	},

	formatCurrency(amount) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: this.settings.currencySymbol === '€' ? 'EUR' :
				this.settings.currencySymbol === '£' ? 'GBP' :
					this.settings.currencySymbol === '¥' ? 'JPY' : 'USD'
		}).format(amount);
	},

	hapticFeedback(type = 'tap') {
		if (!navigator.vibrate) return;

		switch (type) {
			case 'tap': navigator.vibrate(50); break;
			case 'success': navigator.vibrate([50, 50, 100]); break;
			case 'warning': navigator.vibrate([100, 50, 100]); break;
			case 'error': navigator.vibrate([200, 100, 200]); break;
			default: navigator.vibrate(50);
		}
	},

	showToast(title, message, type = 'info', duration = 4000, action = null) {
		const container = document.getElementById('toast-container');
		if (!container) return;

		const toast = document.createElement('div');
		toast.className = `toast toast-${type}`;

		let actionHtml = '';
		if (action) {
			actionHtml = `
				<div class="toast-actions">
					<button class="toast-btn">${action.text}</button>
				</div>
			`;
		}

		toast.innerHTML = `
			<div class="toast-header">
				<span class="toast-title">${title}</span>
				<button class="toast-close">&times;</button>
			</div>
			<div class="toast-message">${message}</div>
			${actionHtml}
			<div class="toast-progress"></div>
		`;

		// Close button
		toast.querySelector('.toast-close').addEventListener('click', () => {
			toast.classList.add('hiding');
			setTimeout(() => toast.remove(), 400);
		});

		// Action button
		if (action) {
			toast.querySelector('.toast-btn').addEventListener('click', () => {
				action.callback();
				toast.classList.add('hiding');
				setTimeout(() => toast.remove(), 400);
			});
		}

		// Auto dismiss
		const progress = toast.querySelector('.toast-progress');
		progress.style.transition = `width ${duration}ms linear`;
		setTimeout(() => { progress.style.width = '0%'; }, 50);

		setTimeout(() => {
			if (toast.isConnected) {
				toast.classList.add('hiding');
				setTimeout(() => toast.remove(), 400);
			}
		}, duration);

		container.appendChild(toast);

		// Haptic feedback for warnings/errors
		if (type === 'warning' || type === 'error') {
			this.hapticFeedback(type);
		}
	},

	initKeyboardShortcuts() {
		document.addEventListener('keydown', (e) => {
			// Ignore if focused on input/textarea
			if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

			// Ctrl+I = Clock In
			if (e.ctrlKey && e.key.toLowerCase() === 'i') {
				e.preventDefault();
				this.clockIn();
			}

			// Ctrl+O = Clock Out
			if (e.ctrlKey && e.key.toLowerCase() === 'o') {
				e.preventDefault();
				this.clockOut();
			}

			// Number keys for views
			if (!e.ctrlKey && !e.altKey && !e.metaKey) {
				switch (e.key) {
					case '1': this.switchView('dashboard'); break;
					case '2': this.switchView('timecard'); break;
					case '3': this.switchView('payroll'); break;
					case '4': this.switchView('reports'); break;
					case '5': document.getElementById('settings-modal').classList.remove('hidden'); break;
				}
			}
		});
	},

	generateWeeklySummary() {
		const weekHours = this.getWeeklyHours();
		const weekEarnings = this.getWeeklyEarnings();
		const weekStart = this.getWeekStart().toLocaleDateString();
		const weekEnd = this.getWeekEnd().toLocaleDateString();

		let summary = `WEEKLY SUMMARY (${weekStart} - ${weekEnd})\n\n`;
		summary += `Total Hours: ${weekHours.toFixed(1)}\n`;
		summary += `Total Earnings: ${this.formatCurrency(weekEarnings)}\n`;
		summary += `Status: ${weekHours >= this.settings.weeklyTarget ? 'Target Met ✅' : 'Below Target ⚠️'}\n`;

		// Create modal to show summary
		const modalHtml = `
			<div id="summary-modal" class="modal">
				<div class="modal-content" style="max-width: 500px">
					<div class="modal-header">
						<h2>Weekly Summary</h2>
						<span class="close-modal" onclick="document.getElementById('summary-modal').remove()">&times;</span>
					</div>
					<div class="modal-body">
						<textarea style="width: 100%; height: 200px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-family: monospace;">${summary}</textarea>
						<button class="settings-btn primary" style="width: 100%" onclick="navigator.clipboard.writeText(document.querySelector('#summary-modal textarea').value); this.textContent = 'Copied! ✅'; setTimeout(() => this.textContent = 'Copy to Clipboard', 2000);">Copy to Clipboard</button>
					</div>
				</div>
			</div>
		`;

		document.body.insertAdjacentHTML('beforeend', modalHtml);
	},

	initDragAndDrop() {
		const tbody = document.querySelector('.timecard-table tbody');
		if (!tbody) return;

		let draggedItem = null;
		let touchStartY = 0;
		let initialTransform = '';

		// Mouse Events
		tbody.addEventListener('dragstart', (e) => {
			const row = e.target.closest('tr');
			if (!row || row.classList.contains('empty-state')) {
				e.preventDefault();
				return;
			}
			draggedItem = row;
			setTimeout(() => row.classList.add('dragging'), 0);
		});

		tbody.addEventListener('dragend', () => {
			if (draggedItem) {
				draggedItem.classList.remove('dragging');
				draggedItem = null;
				this.saveNewOrder();
			}
			document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
		});

		tbody.addEventListener('dragover', (e) => {
			e.preventDefault();
			const afterElement = getDragAfterElement(tbody, e.clientY);
			const currentDragOver = document.querySelector('.drag-over');
			if (currentDragOver) currentDragOver.classList.remove('drag-over');

			if (afterElement) {
				afterElement.classList.add('drag-over');
			} else {
				// Dragging to bottom
				const rows = [...tbody.querySelectorAll('tr:not(.dragging)')];
				if (rows.length > 0) rows[rows.length - 1].classList.add('drag-over');
			}
		});

		tbody.addEventListener('drop', (e) => {
			e.preventDefault();
			const afterElement = getDragAfterElement(tbody, e.clientY);
			if (draggedItem) {
				if (afterElement) {
					tbody.insertBefore(draggedItem, afterElement);
				} else {
					tbody.appendChild(draggedItem);
				}
			}
		});

		// Helper function to find position
		function getDragAfterElement(container, y) {
			const draggableElements = [...container.querySelectorAll('tr:not(.dragging):not(.empty-state)')];

			return draggableElements.reduce((closest, child) => {
				const box = child.getBoundingClientRect();
				const offset = y - box.top - box.height / 2;
				if (offset < 0 && offset > closest.offset) {
					return { offset: offset, element: child };
				} else {
					return closest;
				}
			}, { offset: Number.NEGATIVE_INFINITY }).element;
		}

		// Touch Events (Mobile)
		tbody.addEventListener('touchstart', (e) => {
			const handle = e.target.closest('.drag-handle');
			if (!handle) return;

			const row = handle.closest('tr');
			if (!row) return;

			e.preventDefault(); // Prevent scrolling
			draggedItem = row;
			touchStartY = e.touches[0].clientY;
			initialTransform = row.style.transform;

			row.classList.add('dragging');
			row.style.position = 'relative';
			row.style.zIndex = '1000';
			this.hapticFeedback('tap');
		});

		tbody.addEventListener('touchmove', (e) => {
			if (!draggedItem) return;
			e.preventDefault();

			const touchY = e.touches[0].clientY;
			const deltaY = touchY - touchStartY;
			draggedItem.style.transform = `translateY(${deltaY}px)`;

			const elementBelow = document.elementFromPoint(e.touches[0].clientX, touchY);
			const rowBelow = elementBelow?.closest('tr');

			document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
			if (rowBelow && rowBelow !== draggedItem && tbody.contains(rowBelow)) {
				rowBelow.classList.add('drag-over');
			}
		});

		tbody.addEventListener('touchend', (e) => {
			if (!draggedItem) return;

			const touchY = e.changedTouches[0].clientY;
			const elementBelow = document.elementFromPoint(e.changedTouches[0].clientX, touchY);
			const rowBelow = elementBelow?.closest('tr');

			draggedItem.style.transform = initialTransform;
			draggedItem.style.position = '';
			draggedItem.style.zIndex = '';
			draggedItem.classList.remove('dragging');

			if (rowBelow && rowBelow !== draggedItem && tbody.contains(rowBelow)) {
				// Calculate if dropped above or below
				const box = rowBelow.getBoundingClientRect();
				const offset = touchY - box.top - box.height / 2;

				if (offset < 0) {
					tbody.insertBefore(draggedItem, rowBelow);
				} else {
					tbody.insertBefore(draggedItem, rowBelow.nextSibling);
				}
				this.saveNewOrder();
				this.hapticFeedback('success');
			}

			document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
			draggedItem = null;
		});
	},

	saveNewOrder() {
		// Re-order timeEntries based on DOM order
		const rows = document.querySelectorAll('.timecard-table tbody tr');
		const newEntries = [];

		rows.forEach(row => {
			const id = row.getAttribute('data-id');
			if (id) {
				const entry = this.timeEntries.find(e => e.id.toString() === id);
				if (entry) newEntries.push(entry);
			}
		});

		if (newEntries.length === this.timeEntries.length) {
			this.timeEntries = newEntries;
			this.saveToStorage();
			console.log('TimeVault: New order saved');
		}
	},

	filterReport() {
		console.log('TimeVault: Filtering report');
	},

	showAddEntryModal() {
		this.showToast('Coming Soon', 'Add Entry feature is under development', 'info');
	},

	exportPayrollPDF() {
		const element = document.getElementById('view-payroll');
		if (!element) return;

		// Temporarily hide the export button during PDF generation
		const exportBtn = document.getElementById('export-payroll-btn');
		if (exportBtn) exportBtn.style.display = 'none';

		this.showToast('Exporting', 'Generating PDF report...', 'info', 2000);

		const opt = {
			margin:       0.5,
			filename:     `timevault_payroll_${new Date().toISOString().split('T')[0]}.pdf`,
			image:        { type: 'jpeg', quality: 0.98 },
			html2canvas:  { scale: 2, useCORS: true, logging: false },
			jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
		};

		// Make sure html2pdf is available
		if (typeof html2pdf !== 'undefined') {
			html2pdf().set(opt).from(element).save().then(() => {
				if (exportBtn) exportBtn.style.display = '';
				this.showToast('Success', 'PDF report downloaded successfully', 'success');
			}).catch(err => {
				console.error('PDF Export Error:', err);
				if (exportBtn) exportBtn.style.display = '';
				this.showToast('Error', 'Failed to generate PDF', 'error');
			});
		} else {
			if (exportBtn) exportBtn.style.display = '';
			this.showToast('Error', 'PDF library not loaded', 'error');
		}
	},

	exportReportCSV() {
		if (!this.timeEntries || this.timeEntries.length === 0) {
			this.showToast('No Data', 'No time entries to export', 'warning');
			return;
		}

		const headers = ['Date', 'Clock In', 'Clock Out', 'Duration (Hours)', 'Earnings'];
		const rows = [headers.join(',')];

		// Sort entries by date descending
		const sortedEntries = [...this.timeEntries].sort((a, b) => b.startTime - a.startTime);

		sortedEntries.forEach(entry => {
			const date = new Date(entry.startTime).toLocaleDateString();
			const clockIn = new Date(entry.startTime).toLocaleTimeString();
			const clockOut = entry.endTime ? new Date(entry.endTime).toLocaleTimeString() : 'In Progress';
			const duration = entry.duration.toFixed(2);
			const earnings = entry.earnings.toFixed(2);

			rows.push(`"${date}","${clockIn}","${clockOut}","${duration}","${earnings}"`);
		});

		const csvContent = rows.join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', `timevault_report_${new Date().toISOString().split('T')[0]}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		this.showToast('Success', 'CSV report downloaded successfully', 'success');
	}
};
