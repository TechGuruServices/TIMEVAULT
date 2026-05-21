import re

file_path = 'apps.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add currentWeekOffset and chartType to TimeVault state
content = re.sub(
    r'(timeEntries:\s*\[\],)',
    r"\1\n\tcurrentWeekOffset: 0,\n\tchartType: 'bar',",
    content
)

# 2. Add getWeekBounds before getWeeklyHours
get_week_bounds_code = """
	getWeekBounds(offset = 0) {
		const now = new Date();
		now.setDate(now.getDate() + (offset * 7));
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);
		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6);
		endOfWeek.setHours(23, 59, 59, 999);
		return { startOfWeek, endOfWeek };
	},

	getWeeklyHours() {"""
content = content.replace("	getWeeklyHours() {", get_week_bounds_code)

# 3. Rewrite getWeeklyHoursBreakdown
old_breakdown = """	getWeeklyHoursBreakdown() {
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
	},"""

new_breakdown = """	getWeeklyHoursBreakdown() {
		const { startOfWeek, endOfWeek } = this.getWeekBounds(this.currentWeekOffset);
		const dailyHours = [0, 0, 0, 0, 0, 0, 0];

		this.timeEntries.forEach(entry => {
			const entryDate = new Date(entry.date);
			if (entryDate >= startOfWeek && entryDate <= endOfWeek) {
				const dayIndex = entryDate.getDay();
				dailyHours[dayIndex] += entry.duration;
			}
		});

		if (this.currentWeekOffset === 0 && this.isWorking && this.sessionStart) {
			const activeDuration = (Date.now() - this.sessionStart) / 1000 / 60 / 60;
			const todayIndex = new Date().getDay();
			dailyHours[todayIndex] += activeDuration;
		}

		return dailyHours.map(h => parseFloat(h.toFixed(1)));
	},"""
content = content.replace(old_breakdown, new_breakdown)


# 4. Modify getWeeklyHours, getWeeklyEarnings to support currentWeekOffset
# (They might be needed for the dashboard) 
# Actually, the user's dashboard "This Week" should reflect the selected week. Let's update `getWeeklyHours` to support an offset.

content = re.sub(
    r'getWeeklyHours\(\) \{\s*const now = new Date\(\);\s*const startOfWeek = new Date\(now\);\s*startOfWeek\.setDate\(now\.getDate\(\) - now\.getDay\(\)\);\s*startOfWeek\.setHours\(0, 0, 0, 0\);',
    r'''getWeeklyHours() {
		const { startOfWeek, endOfWeek } = this.getWeekBounds(this.currentWeekOffset);''',
    content
)

content = re.sub(
    r'getWeeklyEarnings\(\) \{\s*const now = new Date\(\);\s*const startOfWeek = new Date\(now\);\s*startOfWeek\.setDate\(now\.getDate\(\) - now\.getDay\(\)\);\s*startOfWeek\.setHours\(0, 0, 0, 0\);',
    r'''getWeeklyEarnings() {
		const { startOfWeek, endOfWeek } = this.getWeekBounds(this.currentWeekOffset);''',
    content
)

# And update their filter conditions
content = re.sub(
    r'filter\(e => new Date\(e\.date\) >= startOfWeek\)',
    r'filter(e => new Date(e.date) >= startOfWeek && new Date(e.date) <= endOfWeek)',
    content
)

# Fix the active session addition in getWeeklyHours
content = re.sub(
    r'if \(this\.isWorking && this\.sessionStart\) \{\s*hours \+= \(Date\.now\(\) - this\.sessionStart\) / 1000 / 60 / 60;\s*\}',
    r'''if (this.currentWeekOffset === 0 && this.isWorking && this.sessionStart) {
			hours += (Date.now() - this.sessionStart) / 1000 / 60 / 60;
		}''',
    content
)


# 5. Append helper classes, JSONBin integration, and extra initEventListeners logic.
# Wait, we need to inject the event listeners directly inside initEventListeners() {
init_listeners_injection = """
		// Week Navigation & Chart Toggles
		document.getElementById('prev-week-btn')?.addEventListener('click', () => {
			this.currentWeekOffset--;
			this.updateDashboard();
			this.updateChart();
			document.getElementById('week-range').textContent = this.currentWeekOffset === 0 ? 'This Week' : (this.currentWeekOffset === -1 ? 'Last Week' : `Week ${this.currentWeekOffset}`);
			document.getElementById('day-grid-range').textContent = document.getElementById('week-range').textContent;
		});

		document.getElementById('next-week-btn')?.addEventListener('click', () => {
			this.currentWeekOffset++;
			this.updateDashboard();
			this.updateChart();
			document.getElementById('week-range').textContent = this.currentWeekOffset === 0 ? 'This Week' : (this.currentWeekOffset === -1 ? 'Last Week' : (this.currentWeekOffset > 0 ? `Next Week +${this.currentWeekOffset}` : `Week ${this.currentWeekOffset}`));
			document.getElementById('day-grid-range').textContent = document.getElementById('week-range').textContent;
		});

		document.getElementById('chart-type-toggle')?.addEventListener('click', (e) => {
			this.chartType = this.chartType === 'line' ? 'bar' : 'line';
			e.target.textContent = this.chartType === 'line' ? '📈 Line' : '📊 Bar';
			this.updateChart();
		});

		// Quick Add Form
		document.getElementById('quick-add-form')?.addEventListener('submit', (e) => {
			e.preventDefault();
			const dateVal = document.getElementById('qa-date').value;
			const startVal = document.getElementById('qa-start').value;
			const endVal = document.getElementById('qa-end').value;
			if(!dateVal || !startVal || !endVal) return;

			const startDt = new Date(`${dateVal}T${startVal}`);
			const endDt = new Date(`${dateVal}T${endVal}`);
			let duration = (endDt - startDt) / 1000 / 60 / 60;
			if(duration < 0) duration += 24; // Cross-midnight fix
			
			const earnings = this.calculateEarnings(duration);
			this.timeEntries.push({
				id: Date.now(),
				date: dateVal,
				startTime: startDt.getTime(),
				endTime: endDt.getTime(),
				duration,
				earnings
			});
			this.saveToStorage();
			this.updateDashboard();
			this.updateChart();
			e.target.reset();
			this.showToast('Entry Added', 'Quick add successful', 'success');
		});

		// JSONBin settings
		document.getElementById('jsonbin-test-btn')?.addEventListener('click', () => JSONBin.testConnection());
		document.getElementById('jsonbin-push-btn')?.addEventListener('click', () => JSONBin.pushData());
		document.getElementById('jsonbin-pull-btn')?.addEventListener('click', () => JSONBin.pullData());
		
		// Modals
		document.getElementById('close-edit-modal')?.addEventListener('click', () => EditModal.close());
		document.getElementById('edit-cancel-btn')?.addEventListener('click', () => EditModal.close());
		document.getElementById('edit-save-btn')?.addEventListener('click', () => EditModal.save());
"""
content = content.replace("	initEventListeners() {", "	initEventListeners() {" + init_listeners_injection)


# 6. Add day grid generation to updateDashboard
# Find updateRecentEntries(); inside updateDashboard
update_dashboard_injection = """
		this.updateRecentEntries();
		this.updateDistributionBar();
		this.updateYTD(); // New YTD update
		this.renderDayGrid(); // New day grid rendering
"""
content = content.replace("		this.updateRecentEntries();\n		this.updateDistributionBar();", update_dashboard_injection)


# 7. Add helper methods at the end of the file (before the last closing brace if it's there)
# Actually, it's a global object, so just append inside the TimeVault object, or outside.
# Let's add them before the closing brace of TimeVault:

helper_methods = """
	updateYTD() {
		const now = new Date();
		const startOfYear = new Date(now.getFullYear(), 0, 1);
		const ytdHours = this.timeEntries.filter(e => new Date(e.date) >= startOfYear).reduce((sum, e) => sum + e.duration, 0);
		const ytdEarnings = this.timeEntries.filter(e => new Date(e.date) >= startOfYear).reduce((sum, e) => sum + e.earnings, 0);
		
		const ytdPayEl = document.getElementById('ytd-pay');
		const ytdHoursEl = document.getElementById('ytd-hours');
		const ytdProgressEl = document.getElementById('ytd-progress');
		const ytdPercentEl = document.getElementById('ytd-percent');
		
		if(ytdPayEl) ytdPayEl.textContent = this.formatCurrency(ytdEarnings);
		if(ytdHoursEl) ytdHoursEl.textContent = `${ytdHours.toFixed(1)} hours`;
		
		// Assuming a yearly target of 2080 hours (40 * 52)
		const ytdPercent = Math.min(100, (ytdHours / (this.settings.weeklyTarget * 52)) * 100);
		if(ytdProgressEl) ytdProgressEl.setAttribute('stroke-dasharray', `${ytdPercent}, 100`);
		if(ytdPercentEl) ytdPercentEl.textContent = `${Math.round(ytdPercent)}%`;
	},

	renderDayGrid() {
		const grid = document.getElementById('week-days-grid');
		if(!grid) return;
		
		const { startOfWeek } = this.getWeekBounds(this.currentWeekOffset);
		const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		
		let html = '';
		for(let i=0; i<7; i++) {
			const d = new Date(startOfWeek);
			d.setDate(d.getDate() + i);
			const dateStr = d.toISOString().split('T')[0];
			
			const dayEntries = this.timeEntries.filter(e => e.date === dateStr);
			const dayHours = dayEntries.reduce((sum, e) => sum + e.duration, 0);
			const isToday = dateStr === new Date().toISOString().split('T')[0];
			
			html += `<div class="day-grid-card ${isToday ? 'today' : ''} ${dayHours > 0 ? 'has-data' : ''}">
				<div style="font-weight:bold; font-size:14px; margin-bottom:4px; ${isToday ? 'color:var(--primary-color)' : ''}">${days[i]}</div>
				<div style="font-size:12px; color:var(--secondary-color); margin-bottom:8px;">${d.toLocaleDateString('en-US', {month:'short', day:'numeric'})}</div>
				<div style="font-size:16px; font-weight:bold;">${dayHours > 0 ? dayHours.toFixed(1) + 'h' : '--'}</div>
				<div style="font-size:11px; margin-top:8px;">${dayEntries.length} entries</div>
			</div>`;
		}
		
		grid.innerHTML = html;
	},
"""

content = re.sub(r'(\}\s*)$', helper_methods + r'\n\1', content)

# 8. Define JSONBin, MBase, EditModal at the absolute bottom of the file outside TimeVault.
global_additions = """
// ============================================
// MODALS & JSONBIN API INTEGRATION
// ============================================

const MBase = {
	open(id) {
		const modal = document.getElementById(id);
		if(modal) modal.classList.remove('hidden');
	},
	close(id) {
		const modal = document.getElementById(id);
		if(modal) modal.classList.add('hidden');
	}
};

const EditModal = {
	open(entryId) {
		const entry = TimeVault.timeEntries.find(e => e.id === entryId);
		if(!entry) return;
		document.getElementById('edit-entry-id').value = entry.id;
		document.getElementById('edit-date').value = entry.date;
		
		const startD = new Date(entry.startTime);
		const endD = new Date(entry.endTime);
		document.getElementById('edit-start').value = startD.toTimeString().slice(0,5);
		document.getElementById('edit-end').value = endD.toTimeString().slice(0,5);
		MBase.open('edit-entry-modal');
	},
	close() {
		MBase.close('edit-entry-modal');
	},
	save() {
		const id = parseInt(document.getElementById('edit-entry-id').value);
		const dateVal = document.getElementById('edit-date').value;
		const startVal = document.getElementById('edit-start').value;
		const endVal = document.getElementById('edit-end').value;
		
		const entryIndex = TimeVault.timeEntries.findIndex(e => e.id === id);
		if(entryIndex > -1) {
			const startDt = new Date(`${dateVal}T${startVal}`);
			const endDt = new Date(`${dateVal}T${endVal}`);
			let duration = (endDt - startDt) / 1000 / 60 / 60;
			if(duration < 0) duration += 24;
			
			TimeVault.timeEntries[entryIndex].date = dateVal;
			TimeVault.timeEntries[entryIndex].startTime = startDt.getTime();
			TimeVault.timeEntries[entryIndex].endTime = endDt.getTime();
			TimeVault.timeEntries[entryIndex].duration = duration;
			TimeVault.timeEntries[entryIndex].earnings = TimeVault.calculateEarnings(duration);
			
			TimeVault.saveToStorage();
			TimeVault.updateDashboard();
			TimeVault.updateChart();
			TimeVault.showToast('Success', 'Entry updated successfully', 'success');
		}
		this.close();
	}
};

// Override the placeholder editEntry in TimeVault
TimeVault.editEntry = function(id) {
	EditModal.open(id);
};

const JSONBin = {
	updateStatus(msg, isError=false) {
		const el = document.getElementById('jsonbin-status');
		if(el) {
			el.textContent = msg;
			el.style.color = isError ? 'var(--danger-color)' : 'var(--primary-color)';
		}
	},
	async testConnection() {
		const apiKey = document.getElementById('jsonbin-api-key').value;
		if(!apiKey) return this.updateStatus('API Key required to test.', true);
		
		this.updateStatus('Testing connection...');
		try {
			const res = await fetch('https://api.jsonbin.io/v3/b', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Master-Key': apiKey,
					'X-Bin-Name': 'TimeVault_SyncTest'
				},
				body: JSON.stringify({ test: true })
			});
			if(res.ok) {
				const data = await res.json();
				this.updateStatus(`Connection successful! Created test bin.`);
			} else {
				this.updateStatus(`Error: ${res.statusText}`, true);
			}
		} catch(e) {
			this.updateStatus(`Exception: ${e.message}`, true);
		}
	},
	async pushData() {
		const apiKey = document.getElementById('jsonbin-api-key').value;
		let binId = document.getElementById('jsonbin-bin-id').value;
		if(!apiKey) return this.updateStatus('API Key required to push.', true);
		
		const data = {
			settings: TimeVault.settings,
			timeEntries: TimeVault.timeEntries
		};
		
		this.updateStatus('Pushing data to cloud...');
		try {
			let url = 'https://api.jsonbin.io/v3/b';
			let method = 'POST';
			let headers = {
				'Content-Type': 'application/json',
				'X-Master-Key': apiKey
			};
			
			if(binId) {
				url += '/' + binId;
				method = 'PUT';
			} else {
				headers['X-Bin-Name'] = 'TimeVault_Backup_' + new Date().toISOString().split('T')[0];
			}
			
			const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
			if(res.ok) {
				const result = await res.json();
				if(!binId && result.metadata && result.metadata.id) {
					document.getElementById('jsonbin-bin-id').value = result.metadata.id;
					binId = result.metadata.id;
				}
				this.updateStatus(`Push successful! Bin ID: ${binId}`);
				TimeVault.showToast('Sync', 'Data pushed to cloud successfully.', 'success');
			} else {
				this.updateStatus(`Push failed: ${res.statusText}`, true);
			}
		} catch(e) {
			this.updateStatus(`Push Exception: ${e.message}`, true);
		}
	},
	async pullData() {
		const apiKey = document.getElementById('jsonbin-api-key').value;
		const binId = document.getElementById('jsonbin-bin-id').value;
		if(!apiKey || !binId) return this.updateStatus('API Key and Bin ID required to pull.', true);
		
		this.updateStatus('Pulling data from cloud...');
		try {
			const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
				headers: { 'X-Master-Key': apiKey }
			});
			if(res.ok) {
				const result = await res.json();
				const data = result.record;
				if(data.settings) TimeVault.settings = { ...TimeVault.settings, ...data.settings };
				if(data.timeEntries) TimeVault.timeEntries = data.timeEntries;
				
				TimeVault.saveToStorage();
				TimeVault.updateSettingsUI();
				TimeVault.updateDashboard();
				TimeVault.updateChart();
				
				this.updateStatus('Pull successful. App updated.');
				TimeVault.showToast('Sync', 'Data pulled and loaded successfully.', 'success');
			} else {
				this.updateStatus(`Pull failed: ${res.statusText}`, true);
			}
		} catch(e) {
			this.updateStatus(`Pull Exception: ${e.message}`, true);
		}
	}
};
"""

content += "\n" + global_additions

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patch successfully applied!")
