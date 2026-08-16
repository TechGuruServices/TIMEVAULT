import os

css_to_add = """
/* ============================================
   APPLE GLASSMORPHISM & PREMIUM REDESIGN OVERRIDES
   ============================================ */

:root {
  --app-bg-dark: #000000;
  --app-bg-light: #1c1c1e;
  --app-logo: #0a84ff;
  --nav-link: #8e8e93;
  --nav-link-active: #ffffff;
  --list-item-hover: rgba(255, 255, 255, 0.05);
  --main-color: #f5f5f7;
  --secondary-color: #aeaeb2;
  --color-light: rgba(10, 132, 255, 0.2);
  --accent-gradient: linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%);
  --glass-bg: rgba(28, 28, 30, 0.3);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-blur: 24px;
}

body {
  background: linear-gradient(-45deg, #000000, #1c1c1e, #0a1128, #180524);
  background-size: 400% 400%;
  animation: smoothBackground 20s ease-in-out infinite;
  color: var(--main-color);
}

@keyframes smoothBackground {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

#particles-js {
  opacity: 0.4;
  z-index: -1;
}

/* Base Glass Containers */
.chart-container, .pay-card, .time-entry-card, .dashboard-card, 
.modal-content, .sidebar, .header, .bottom-nav, .app-right {
  background: var(--glass-bg) !important;
  backdrop-filter: blur(var(--glass-blur)) saturate(180%) !important;
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 24px !important;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
}

/* Modals */
.modal-content {
  border-radius: 28px !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6) !important;
}

/* Buttons */
button, .pay-btn, .time-btn {
  border-radius: 12px !important;
  background: var(--accent-gradient) !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(10, 132, 255, 0.3) !important;
  color: #fff !important;
  transition: all 0.3s ease !important;
}

button:hover, .pay-btn:hover, .time-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px rgba(10, 132, 255, 0.5) !important;
  background: linear-gradient(135deg, #2b93ff 0%, #7674eb 100%) !important;
}

/* Inputs */
input, select, textarea {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: #fff !important;
  border-radius: 12px !important;
  backdrop-filter: blur(10px) !important;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--app-logo) !important;
  box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.2) !important;
  outline: none;
}

/* Typography refinements */
h1, h2, h3, h4, .main-header-line h1 {
  font-weight: 600 !important;
  letter-spacing: -0.02em !important;
}

/* App Header & Navs specifically */
.app-header {
  border-bottom: 1px solid var(--glass-border) !important;
  background: rgba(28, 28, 30, 0.5) !important;
}
.sidebar {
  border-right: 1px solid var(--glass-border) !important;
}
.app-right {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* Scrollbars */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.02);
}
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.25);
}
"""

with open('styles.css', 'a', encoding='utf-8') as f:
    f.write(css_to_add)

print("Styles updated successfully!")
