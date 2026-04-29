# ⏱️ TimeVault — Premium Time Tracking & Payroll PWA

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Build](https://img.shields.io/badge/build-2026.02.13-green)
![License](https://img.shields.io/badge/license-Proprietary-orange)

**TimeVault** is an AI-powered Progressive Web App (PWA) for time tracking, payroll calculations, and earnings analytics. Built with a local-first architecture, all data stays on your device with optional cross-device sync capabilities.

> Developed by **TechGuru** · [TechGuruServices/TIMEVAULT-V2](https://github.com/TechGuruServices/TIMEVAULT-V2)

---

## ✨ Features

### Core Functionality

- **Clock In/Out** — One-tap time tracking with live session timer
- **Automatic Earnings** — Real-time pay calculations with overtime support
- **Dashboard** — At-a-glance view of today's, weekly, and monthly hours & earnings
- **Progress Rings** — Visual circular charts showing goal completion
- **Weekly Chart** — Interactive Chart.js line graph of hours by day

### Time Card

- View, filter, and manage all time entries
- Filter by Today, This Week, This Month, or All Time
- Edit and delete individual entries
- Running totals for filtered periods

### Payroll

- Detailed payroll breakdown by period (Current/Last Week, Current/Last Month, YTD)
- Automatic regular vs. overtime hour separation
- Configurable overtime threshold and multiplier (1x, 1.5x, 2x)

### Reports & Analytics

- Total hours, earnings, average hours/day, and days worked stats
- Monthly Hours & Earnings chart (last 12 months)
- Detailed time report with custom date range filtering
- CSV export capability

### AI Assistant

- **Local AI (Ollama)** — Connect to a local or remote Ollama instance for natural language queries
- **Built-in Fallback** — Rule-based AI that works without any server
- **Voice Input** — Speech-to-text for hands-free interaction
- **Smart Suggestions** — Context-aware tips based on time of day, hours worked, and overtime status
- **Conversation Memory** — Remembers last 50 messages across sessions

### PWA Features

- **Installable** — Add to home screen on any device
- **Offline Support** — Full functionality without internet via Service Worker
- **Push Notifications** — Clock in/out confirmations and reminders
- **App Shortcuts** — Quick actions (Clock In, Dashboard, AI Assistant) from home screen

---

## 🏗️ Tech Stack

| Feature | Tech Used | Status |
| :--- | :--- | :--- |
| **PWA Core** | Service Worker, Manifest | ✅ Active |
| **Styling** | Vanilla CSS (Variables) | ✅ Active |
| **Icons** | Phosphor / Custom SVG | ✅ Active |
| **State** | LocalStorage API | ✅ Active |
| **Charts** | Chart.js | ✅ Active |
| **AI** | Ollama API (Local LLM) | 🚧 Beta |

---

## 📁 Project Structure

```text
tune_time/
├── index.html          # Main application shell (all views)
├── apps.js             # Application logic (~2100 lines)
├── styles.css          # Complete design system & responsive styles
├── sw.js               # Service Worker (caching, offline, push)
├── manifest.json       # PWA manifest (icons, shortcuts, metadata)
├── browserconfig.xml   # Microsoft tile configuration
├── icons/              # All app icons
│   ├── time-icons_android_*.png    # Android Chrome (192, 512)
│   ├── time-icons_apple_*.png      # Apple Touch (57–180)
│   ├── time-icons_favicon_*.png    # Favicons (16–96)
│   ├── time-icons_favicon.ico      # Legacy favicon
│   ├── time-icons_mstile_*.png     # Microsoft tiles (70–310)
│   └── time-icons_logo.png         # Full logo
└── README.md           # This file
```

---

## 💾 How Storage Works

TimeVault uses a **local-first** architecture. All data lives in the browser's `localStorage` under a single key: `timevault_data`.

### What's Stored

| Data | Description | Persistence |
| :--- | :--- | :--- |
| `settings` | Hourly rate, overtime config, currency, time format | Until cleared |
| `timeEntries` | Array of all clock in/out sessions with earnings | Until cleared |
| `aiMemory` | Conversation history (last 50 messages) | Until cleared |
| `aiConfig` | Ollama URLs, model selection, voice preferences | Until cleared |
| `syncData` | Email/PIN for sync, last sync timestamp | Until cleared |
| `isWorking` | Whether user is currently clocked in | Until cleared |
| `sessionStart` | Timestamp of current active session | Until cleared |

### Storage Limits

- **localStorage**: ~5–10 MB per origin (browser-dependent)
- **Each time entry**: ~150–200 bytes
- **At 5 entries/week**: ~4.5 KB/month — storage won't fill for years
- **Storage indicator**: Visible in Settings → About section

### Service Worker Cache

The Service Worker (`sw.js`) caches all app assets for offline use:

- **Local assets**: Cache-first with background refresh (stale-while-revalidate)
- **CDN resources**: Network-first with cache fallback
- **Navigation**: Network-first, falls back to cached `index.html`

### Data Management

- **Export**: Download all data as a timestamped JSON backup file
- **Import**: Restore from a previously exported JSON file
- **Clear**: Permanently delete all data and reset to defaults

---

## 🚀 Getting Started

### Run Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/TechGuruServices/TIMEVAULT-V2.git
   cd TIMEVAULT-V2
   ```

2. Serve with any static file server:

   ```bash
   # Using Python
   python -m http.server 8080

   # Using Node.js
   npx serve .

   # Using PHP
   php -S localhost:8080
   ```

3. Open `http://localhost:8080` in your browser.

> **Note**: Service Workers require HTTP(S) — they won't register from `file://` protocol. Use a local server for full PWA functionality.

### Install as PWA

1. Open the app in Chrome, Edge, or Safari
2. Click the install prompt or use the browser menu → "Install App" / "Add to Home Screen"
3. TimeVault will run as a standalone app with its own window

### AI Assistant Setup (Optional)

1. Install [Ollama](https://ollama.ai/) on your machine
2. Pull a model:

   ```bash
   ollama pull llama3
   ```

3. Start Ollama:

   ```bash
   ollama serve
   ```

4. In TimeVault Settings → AI Configuration:
   - Enable Ollama AI
   - Set Local URL to `http://localhost:11434`
   - Select your model
   - Click "Test Connection"

For remote access (e.g., from a phone on the same network), set the Remote URL to your machine's IP address.

---

## ⚙️ Configuration

### Pay Settings

| Setting | Default | Description |
| :--- | :--- | :--- |
| Hourly Rate | $25.00 | Base pay rate per hour |
| Overtime Multiplier | 1.5x | Applied after overtime threshold |
| Overtime Threshold | 40 hrs/week | Hours before overtime kicks in |
| Weekly Target | 40 hrs | Goal for progress tracking |

### Display Settings

| Setting | Options | Default |
| :--- | :--- | :--- |
| Currency | $, €, £, ¥ | $ (USD) |
| Time Format | 12-hour, 24-hour | 12-hour |
| Date Format | MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD | MM/DD/YYYY |

---

## 📱 Browser Compatibility

| Browser | Support |
| :--- | :--- |
| Chrome / Edge | ✅ Full (PWA install, notifications, voice) |
| Firefox | ✅ Full (no install prompt) |
| Safari / iOS | ✅ Partial (no push notifications, limited voice) |
| Samsung Internet | ✅ Full |

---

## 📄 License

Proprietary — © 2026 TechGuru. All rights reserved.
