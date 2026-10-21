# 📦 GitHub WidgetStore for Home by si4k

Welcome to the **Community WidgetStore** for **Home by si4k** (`minimal-homepage`).

Widgets in this repository are standalone, sandboxed micro-apps (`.homewidget` packages and `.json` definitions) that users can install with a single click or CLI command directly into their new tab startpage.

---

## 🌟 Available Widgets

| Widget | ID | Category | Description | Install Command |
| :--- | :--- | :--- | :--- | :--- |
| **GitHub Profile Viewer** | `github-profile` | Developer | Live profile stats, avatar, bio, follower count, and recent active repos with star counters. | `install github-profile` |
| **Live Weather (Open-Meteo)** | `open-weather` | Weather | 100% free open-API weather forecast with geolocation, condition icons, and city search. | `install open-weather` |
| **Pomodoro Focus Timer** | `pomodoro-timer` | Productivity | Tactile Pomodoro timer with Focus (25m), Short Break (5m), and Long Break (15m) modes. | `install pomodoro-timer` |

---

## 🚀 How Installation Works

### 1. In-Browser / Startpage Settings
Open **Settings** (`Ctrl+,` or click gear icon) ➔ **Widget Studio** ➔ **Install & Store**:
- Browse the featured widgets list fetched directly from this GitHub repository.
- Click **"Install"** to load the widget instantly.
- Or paste the widget ID (e.g. `github-profile`) or raw URL into the URL installer input.

### 2. Puff Terminal CLI
Open the Puff Terminal (`~` or click the terminal icon) and run:
```bash
install github-profile
install open-weather
install pomodoro-timer
```

---

## 🛠️ Contributing a Widget

1. Create a widget using the **Widget Studio Builder** tab inside the startpage, or write a JSON definition conforming to the schema.
2. Add your widget definition to `widgetstore/build.py`.
3. Run:
   ```bash
   python3 widgetstore/build.py
   ```
4. Submit a Pull Request to [https://github.com/akshitkamboz13/minimal-homepage](https://github.com/akshitkamboz13/minimal-homepage).
Once merged into `main`, your widget will instantly appear in all users' Startpages worldwide via GitHub raw content!
