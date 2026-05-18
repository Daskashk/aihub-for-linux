<div align="center">

> **Linux-only.** This project has no plans for Windows or macOS support. Experiemntal, can be unestable, and will have frecuents updates and changes.

# AI Hub Desktop

**All your AI assistants. One Linux app. Privacy-first.**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://opensource.org/licenses/GPL-3.0)
[![Version](https://img.shields.io/badge/Version-0.1.0--beta-green.svg)](https://github.com/Daskashk/aihub-desktop/releases)
[![Platform](https://img.shields.io/badge/Platform-Linux-fcc624.svg?logo=linux&logoColor=black)](https://github.com/Daskashk/aihub-desktop)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg)](https://github.com/Daskashk/aihub-desktop/pulls)

A lightweight, privacy-focused native Linux desktop application that brings **65+ AI assistants** together in a single tabbed interface. Built with Python/GTK3/WebKitGTK — no Electron, no Chromium, no bundled web engine.

**Desktop port of the acclaimed [AI Hub for Android](https://github.com/SilentCoderHere/aihub)** by [SilentCoder](https://github.com/SilentCoderHere).

[Installation](#-installation) · [Features](#-features) · [Privacy](#-privacy--security) · [Usage](#-usage) · [Configuration](#-configuration) · [Contributing](#-contributing)

</div>

---

## ✨ Features

### Unified AI Workspace
Access **65+ AI assistants** — from ChatGPT and Claude to Gemini and DeepSeek — all within a single native window. Each service runs in its own isolated WebKit tab with persistent login sessions. Open up to 9 services simultaneously and switch between them instantly.

### Favorites & Service Ordering
Mark your most-used services as favorites — they appear at the top of the sidebar. Reorder enabled services with ▲/▼ buttons in the Services settings tab; changes reflect live without restarting.

### Network Privacy Firewall
All requests are intercepted at the WebKit policy level. Only whitelisted domains for each AI service are allowed through. Trackers, ads, and telemetry domains are blocked before they load.

### Remotely Updated Service Directory
The AI service catalog and domain filtering rules are fetched from a shared [remote configuration repository](https://github.com/SilentCoderHere/aihub-config-data). New services and updated rules are delivered without requiring an app update.

### Privacy & Pricing Badges
Every service is labelled with **Privacy** (Focused / Friendly / Not for Privacy) and **Pricing** (Free / Freemium / Paid) badges for informed decisions at a glance.

### Custom JavaScript & CSS Injection
Inject custom JS and/or CSS into every service page after load — for styling fixes, accessibility, or any client-side modification.

### Proxy Support
Route all service traffic through an HTTP or SOCKS5 proxy. Settings live in their own Network tab.

### External Link Handling
Optionally open external links (domains outside a service's allowlist) in your system browser instead of within the WebView.

### Zoom Controls
Fine-grained zoom (15% steps) with a visible percentage indicator. Reset to 100% with one click.

### Storage Management
Clear page cache or all data with confirmation dialogs. Cache clearing only removes temporary files; full data clear removes cookies, local storage, and cached remote data.

---

## 🛡️ Privacy & Security

| Layer | Protection |
|-------|-----------|
| **Network Firewall** | All requests intercepted via `decide-policy`. Only whitelisted domains per service pass through. |
| **Domain Blocking** | Tracking/ad domains blocked at the policy level. Configurable on/off toggle. |
| **External Link Guard** | Links to unknown domains can be routed to the system browser, never loaded inside the app. |
| **URL Validation** | `_open_url` validates `http:` / `https:` protocols before delegating to `xdg-open`. |
| **Session Isolation** | Each service WebView is independent — no cross-service cookie leakage. |
| **Custom Code Escaping** | CSS injection escapes backticks and `${}` to prevent template injection in the eval context. |

---

## 🤖 Supported AI Services

AI Hub Desktop currently supports **65+ AI assistants** across multiple categories. The full list is dynamically loaded from the [config repository](https://github.com/SilentCoderHere/aihub-config-data).

### Popular
ChatGPT, Claude, Gemini, DeepSeek, Grok, Copilot, Perplexity, Meta AI

### Privacy-Focused
Duck AI, Venice, Lumo (Proton), Brave, OpenRouter Chat, TurboSeek, Euria (Infomaniak)

### Research & Academic
Consensus, Elicit, SciSpace AI, Paperguide AI, Google NotebookLM

### Regional & Multilingual
Qwen, Kimi, Doubao, Ernie, Zhipu Qingyan, Xunfei Starfire, Tencent Yuanbao, PLLuM, Indus, SEA-LION

...and many more. Complete list at [ai_services_list.json](https://raw.githubusercontent.com/SilentCoderHere/aihub-config-data/main/ai_services_list.json).

---

## 📥 Installation

### Requirements
- Linux (GTK 3.20+, WebKitGTK 4.1)
- Python 3.10+
- PyGObject (`python3-gi`, `python3-gi-cairo`, `gir1.2-webkit2-4.1`, etc.)

Install dependencies on Debian/Ubuntu:
```bash
sudo apt install python3-gi python3-gi-cairo gir1.2-webkit2-4.1 gir1.2-gtk-3.0
```

### Run from source
```bash
git clone https://github.com/Daskashk/aihub-desktop.git
cd aihub-desktop
python3 app.py
```

### Build standalone AppImage
*(coming soon — workflow configured)*

---

## ⚙️ Configuration

Settings are accessible through the in-app Settings dialog (gear icon in the sidebar):

| Setting | Default | Description |
|---------|---------|-------------|
| Load Last Opened AI | Enabled | Reopen last used service on startup |
| Default AI Assistant | chatgpt | Default service fallback |
| Font Size | Medium | Global text size in web pages |
| Third-Party Cookies | Enabled | Allow cross-origin cookies |
| Domain Blocking | Enabled | Toggle the network- level blocker |
| Open External Links | Disabled | Route off-domain links to system browser |
| Update Frequency | Every 3 days | Auto-check interval for remote data |

### Proxy (Network tab)
| Setting | Default | Description |
|---------|---------|-------------|
| Enable Proxy | Disabled | Toggle routing through proxy |
| Type | HTTP | HTTP or SOCKS5 |
| Host/Port | — | Proxy server address |

### Config file
```
~/.config/aihub-desktop/config.json
```

### Data cache
```
~/.config/aihub-desktop/data/remote_services.json
~/.config/aihub-desktop/data/remote_rules.json
```

---

## 🏗️ Architecture

```
aihub-desktop/
└── app.py                  # Single-file GTK+WebKitGTK application
    ├── Gtk.Application     # App lifecycle & window management
    ├── Gtk.Paned           # Sidebar | WebView stack layout
    ├── Gtk.Stack           # Service WebView container
    ├── WebKit2.WebView     # Per‑service web engine (full features)
    ├── Gtk.Notebook        # Settings dialog (General/Network/Services/Injection/About)
    ├── Gtk.ListBox         # Service list (sidebar + settings)
    ├── config persistence  # JSON at ~/.config/aihub-desktop/config.json
    ├── remote data fetch   # Background thread pulls services + rules
    ├── domain blocking     # decide-policy interception
    ├── proxy support       # Environment‑variable based
    └── custom injection    # JS/CSS on load‑finished
```

Python with native GTK widgets. Only the AI service pages themselves use WebKit.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| — | Zoom out / Reset / Zoom in (toolbar buttons) |
| ↻ | Reload current service page |
| ↗ | Open current service in system browser |

*(Keyboard shortcut support planned)*

---

## 🤝 Contributing

Contributions welcome! This project is **Linux-only** by design — please don't submit Windows/macOS ports, if you want you can fork this project and make what you want.

- **Code** — Fix bugs, add features, improve GTK styling
- **Testing** — Report issues, test on different distros
- **AI Service Data** — Suggest services or update domain rules at [config-data repo](https://github.com/SilentCoderHere/aihub-config-data)
- **Documentation** — Improve this README, write guides

---

## 🙏 Credits & Acknowledgements

- **[AI Hub for Android](https://github.com/SilentCoderHere/aihub)** by [SilentCoder](https://github.com/SilentCoderHere) — the original Android app this Linux port is based on
- **[aihub-config-data](https://github.com/SilentCoderHere/aihub-config-data)** — shared remote configuration for services and domain rules
- Community: [#aihub-silentcoder:matrix.org](https://matrix.to/#/#aihub-silentcoder:matrix.org) · [#topic-guild:matrix.org](https://matrix.to/#/#topic-guild:matrix.org) · [@topicguild](https://t.me/topicsguild)

---

## 📜 License

GNU General Public License v3.0. See [LICENSE](LICENSE) for details.

---

<div align="center">

**[⬆ Back to Top](#ai-hub-desktop)**

Linux-only · Made with Python/GTK · Made with AI assistant · Based on [AI Hub for Android](https://github.com/SilentCoderHere/aihub)

</div>
