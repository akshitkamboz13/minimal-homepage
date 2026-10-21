#!/usr/bin/env python3
"""
GitHub WidgetStore Builder for Home by si4k
Packages widgets into .homewidget (gzip compressed JSON) and .json files,
and generates the root widgets.json catalog.
"""

import os
import json
import gzip

BASE_RAW_URL = "https://raw.githubusercontent.com/akshitkamboz13/minimal-homepage/main/widgetstore/widgets"
REPO_STORE_URL = "https://github.com/akshitkamboz13/minimal-homepage/tree/main/widgetstore"

WIDGETS = [
    {
        "id": "github-profile",
        "name": "GitHub Profile Viewer",
        "version": "1.0.0",
        "author": "si4k",
        "category": "Developer",
        "description": "Live GitHub profile stats, bio, followers, repositories, and direct links.",
        "type": "widget",
        "icon": '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
        "enabled": True,
        "defaultW": 360,
        "defaultH": 290,
        "minW": 280,
        "minH": 220,
        "html": """<div class="gh-card">
  <div class="gh-search-row">
    <input type="text" id="gh-input" placeholder="GitHub username..." class="gh-input" />
    <button id="gh-btn" class="gh-btn">Inspect</button>
  </div>
  <div id="gh-loading" class="gh-loading hidden">Fetching profile...</div>
  <div id="gh-error" class="gh-error hidden"></div>
  <div id="gh-content" class="gh-content">
    <div class="gh-header">
      <img id="gh-avatar" src="" alt="Avatar" class="gh-avatar" />
      <div class="gh-user-info">
        <a id="gh-name" href="#" target="_blank" rel="noopener" class="gh-name"></a>
        <span id="gh-login" class="gh-login"></span>
      </div>
    </div>
    <p id="gh-bio" class="gh-bio"></p>
    <div class="gh-stats">
      <div class="stat-pill"><strong id="gh-repos">0</strong> Repos</div>
      <div class="stat-pill"><strong id="gh-followers">0</strong> Followers</div>
      <div class="stat-pill"><strong id="gh-following">0</strong> Following</div>
    </div>
    <div class="gh-repos-section">
      <span class="gh-section-label">Recent Repositories</span>
      <div id="gh-repo-list" class="gh-repo-list"></div>
    </div>
  </div>
</div>""",
        "css": """body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--text-color, #e2e8f0);
  margin: 0;
  padding: 12px;
  background: transparent;
  box-sizing: border-box;
}
.gh-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
.gh-search-row {
  display: flex;
  gap: 6px;
}
.gh-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: inherit;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.8rem;
  outline: none;
}
.widget.light .gh-input {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.12);
}
.gh-btn {
  background: #a855f7;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}
.gh-btn:hover { opacity: 0.9; }
.gh-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.gh-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(168, 85, 247, 0.5);
  object-fit: cover;
}
.gh-user-info {
  display: flex;
  flex-direction: column;
}
.gh-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}
.gh-name:hover { text-decoration: underline; }
.gh-login {
  font-size: 0.75rem;
  opacity: 0.65;
}
.gh-bio {
  font-size: 0.78rem;
  opacity: 0.85;
  margin: 0;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.gh-stats {
  display: flex;
  gap: 8px;
}
.stat-pill {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 6px;
  padding: 4px 6px;
  text-align: center;
  font-size: 0.72rem;
  opacity: 0.9;
}
.widget.light .stat-pill {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.08);
}
.gh-repos-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-height: 0;
}
.gh-section-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}
.gh-repo-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  max-height: 100px;
}
.gh-repo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
  font-size: 0.75rem;
  text-decoration: none;
  color: inherit;
}
.gh-repo-item:hover {
  background: rgba(168, 85, 247, 0.15);
}
.gh-repo-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}
.gh-repo-stars {
  font-size: 0.7rem;
  opacity: 0.7;
}
.gh-loading, .gh-error {
  font-size: 0.8rem;
  text-align: center;
  padding: 12px;
}
.gh-error { color: #f87171; }
.hidden { display: none; }""",
        "js": """(async function() {
  const input = document.getElementById('gh-input');
  const btn = document.getElementById('gh-btn');
  const content = document.getElementById('gh-content');
  const loading = document.getElementById('gh-loading');
  const errorBox = document.getElementById('gh-error');

  const avatar = document.getElementById('gh-avatar');
  const nameEl = document.getElementById('gh-name');
  const loginEl = document.getElementById('gh-login');
  const bioEl = document.getElementById('gh-bio');
  const reposEl = document.getElementById('gh-repos');
  const followersEl = document.getElementById('gh-followers');
  const followingEl = document.getElementById('gh-following');
  const repoList = document.getElementById('gh-repo-list');

  let defaultUser = 'akshitkamboz13';
  if (window.widget && window.widget.storage) {
    try {
      const saved = await window.widget.storage.get('gh_user', 'akshitkamboz13');
      if (saved) defaultUser = saved;
    } catch(e) {}
  }
  input.value = defaultUser;

  async function loadUser(user) {
    if (!user) return;
    loading.classList.remove('hidden');
    errorBox.classList.add('hidden');
    content.classList.add('hidden');

    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'User not found' : `API Error ${res.status}`);
      }
      const data = await res.json();

      avatar.src = data.avatar_url || '';
      nameEl.textContent = data.name || data.login;
      nameEl.href = data.html_url;
      loginEl.textContent = `@${data.login}`;
      bioEl.textContent = data.bio || 'No bio provided.';
      reposEl.textContent = data.public_repos ?? 0;
      followersEl.textContent = data.followers ?? 0;
      followingEl.textContent = data.following ?? 0;

      // Save user
      if (window.widget && window.widget.storage) {
        window.widget.storage.set('gh_user', data.login);
      }

      // Fetch repos
      try {
        const repoRes = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=updated&per_page=4`);
        if (repoRes.ok) {
          const repos = await repoRes.json();
          repoList.innerHTML = repos.map(r => `
            <a href="${r.html_url}" target="_blank" rel="noopener" class="gh-repo-item">
              <span class="gh-repo-name">${r.name}</span>
              <span class="gh-repo-stars">⭐ ${r.stargazers_count}</span>
            </a>
          `).join('');
        }
      } catch(err) {}

      content.classList.remove('hidden');
    } catch(err) {
      errorBox.textContent = err.message || 'Failed to load GitHub user.';
      errorBox.classList.remove('hidden');
    } finally {
      loading.classList.add('hidden');
    }
  }

  btn.addEventListener('click', () => {
    const u = input.value.trim();
    if (u) loadUser(u);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const u = input.value.trim();
      if (u) loadUser(u);
    }
  });

  loadUser(defaultUser);

  // Register Puff CLI command
  if (window.widget && window.widget.registerCommand) {
    window.widget.registerCommand('gh', {
      description: 'View or switch GitHub profile in widget',
      usage: 'gh [username]',
      category: 'Developer',
      execute: (args) => {
        if (args && args[0]) {
          input.value = args[0];
          loadUser(args[0]);
          return `Loaded GitHub profile @${args[0]}`;
        }
        return `Current user: @${input.value}`;
      }
    });
  }
})();""",
        "cliCommands": [
            {
                "name": "gh",
                "description": "View or switch GitHub profile in widget",
                "usage": "gh [username]"
            }
        ]
    },
    {
        "id": "open-weather",
        "name": "Live Weather (Open-Meteo)",
        "version": "1.0.0",
        "author": "si4k",
        "category": "Weather",
        "description": "Free open-API weather forecast powered by Open-Meteo. No API keys required.",
        "type": "widget",
        "icon": '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
        "enabled": True,
        "defaultW": 360,
        "defaultH": 240,
        "minW": 260,
        "minH": 180,
        "html": """<div class="weather-widget">
  <div class="weather-header">
    <div class="city-info">
      <span class="city-name" id="city-name">Loading...</span>
      <span class="weather-desc" id="weather-desc">Open-Meteo Live</span>
    </div>
    <div class="weather-icon-badge" id="weather-icon">⛅</div>
  </div>
  <div class="weather-temp-row">
    <div class="temp-big"><span id="temp-val">--</span><span class="temp-unit">°C</span></div>
    <div class="temp-details">
      <div>Feels Like: <strong id="feels-val">--°</strong></div>
      <div>Humidity: <strong id="humidity-val">--%</strong></div>
      <div>Wind: <strong id="wind-val">-- km/h</strong></div>
    </div>
  </div>
  <div class="weather-actions">
    <input type="text" id="city-input" placeholder="Search city (e.g. London, Tokyo)..." class="city-input" />
    <button id="search-btn" class="search-btn">Search</button>
    <button id="locate-btn" class="locate-btn" title="Use current location">📍</button>
  </div>
</div>""",
        "css": """body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--text-color, #e2e8f0);
  margin: 0;
  padding: 12px;
  background: transparent;
  box-sizing: border-box;
}
.weather-widget {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  gap: 8px;
}
.weather-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.city-info {
  display: flex;
  flex-direction: column;
}
.city-name {
  font-size: 1.15rem;
  font-weight: 600;
}
.weather-desc {
  font-size: 0.75rem;
  opacity: 0.7;
}
.weather-icon-badge {
  font-size: 1.9rem;
}
.weather-temp-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}
.temp-big {
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1;
}
.temp-unit {
  font-size: 1rem;
  opacity: 0.7;
  vertical-align: top;
}
.temp-details {
  font-size: 0.75rem;
  line-height: 1.45;
  opacity: 0.85;
}
.weather-actions {
  display: flex;
  gap: 6px;
}
.city-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: inherit;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 0.78rem;
  outline: none;
}
.widget.light .city-input {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.12);
}
.search-btn, .locate-btn {
  background: #0284c7;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 0.78rem;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}
.search-btn:hover, .locate-btn:hover { opacity: 0.9; }
.locate-btn {
  background: rgba(255, 255, 255, 0.1);
  padding: 5px 8px;
}""",
        "js": """(async function() {
  const cityName = document.getElementById('city-name');
  const weatherDesc = document.getElementById('weather-desc');
  const weatherIcon = document.getElementById('weather-icon');
  const tempVal = document.getElementById('temp-val');
  const feelsVal = document.getElementById('feels-val');
  const humidityVal = document.getElementById('humidity-val');
  const windVal = document.getElementById('wind-val');
  const cityInput = document.getElementById('city-input');
  const searchBtn = document.getElementById('search-btn');
  const locateBtn = document.getElementById('locate-btn');

  function mapWmoCode(code) {
    if (code === 0) return { desc: 'Clear Sky', icon: '☀️' };
    if (code === 1 || code === 2) return { desc: 'Partly Cloudy', icon: '🌤️' };
    if (code === 3) return { desc: 'Overcast', icon: '☁️' };
    if (code === 45 || code === 48) return { desc: 'Foggy', icon: '🌫️' };
    if (code >= 51 && code <= 67) return { desc: 'Rainy', icon: '🌧️' };
    if (code >= 71 && code <= 77) return { desc: 'Snowy', icon: '❄️' };
    if (code >= 80 && code <= 82) return { desc: 'Rain Showers', icon: '🌦️' };
    if (code >= 95) return { desc: 'Thunderstorm', icon: '⛈️' };
    return { desc: 'Cloudy', icon: '⛅' };
  }

  async function fetchForecast(lat, lon, label) {
    try {
      cityName.textContent = label || 'Weather';
      weatherDesc.textContent = 'Updating...';

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch forecast');
      const data = await res.json();
      const curr = data.current;

      const info = mapWmoCode(curr.weather_code);
      weatherIcon.textContent = info.icon;
      weatherDesc.textContent = info.desc;
      tempVal.textContent = Math.round(curr.temperature_2m);
      feelsVal.textContent = `${Math.round(curr.apparent_temperature)}°`;
      humidityVal.textContent = `${curr.relative_humidity_2m}%`;
      windVal.textContent = `${Math.round(curr.wind_speed_10m)} km/h`;

      if (window.widget && window.widget.storage) {
        window.widget.storage.set('weather_city', label);
        window.widget.storage.set('weather_coords', { lat, lon });
      }
    } catch (err) {
      weatherDesc.textContent = 'Failed to load weather';
      console.error(err);
    }
  }

  async function searchCity(query) {
    if (!query) return;
    try {
      cityName.textContent = 'Searching...';
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
      const res = await fetch(geoUrl);
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        cityName.textContent = query;
        weatherDesc.textContent = 'City not found';
        return;
      }
      const match = data.results[0];
      const displayName = `${match.name}, ${match.country_code ? match.country_code.toUpperCase() : ''}`;
      await fetchForecast(match.latitude, match.longitude, displayName);
    } catch (err) {
      weatherDesc.textContent = 'Geocoding failed';
      console.error(err);
    }
  }

  searchBtn.addEventListener('click', () => {
    const q = cityInput.value.trim();
    if (q) searchCity(q);
  });
  cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = cityInput.value.trim();
      if (q) searchCity(q);
    }
  });

  locateBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
      cityName.textContent = 'Locating...';
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchForecast(pos.coords.latitude, pos.coords.longitude, 'Your Location'),
        () => searchCity('London')
      );
    }
  });

  // Initial load
  let initialCity = 'London';
  if (window.widget && window.widget.storage) {
    try {
      const savedCoords = await window.widget.storage.get('weather_coords', null);
      const savedCity = await window.widget.storage.get('weather_city', null);
      if (savedCoords && savedCity) {
        fetchForecast(savedCoords.lat, savedCoords.lon, savedCity);
        initialCity = null;
      } else if (savedCity) {
        initialCity = savedCity;
      }
    } catch(e) {}
  }
  if (initialCity) searchCity(initialCity);

  if (window.widget && window.widget.registerCommand) {
    window.widget.registerCommand('weather', {
      description: 'Search city weather via Open-Meteo',
      usage: 'weather [city]',
      category: 'Weather',
      execute: (args) => {
        if (args && args[0]) {
          const city = args.join(' ');
          searchCity(city);
          return `Fetching weather for ${city}...`;
        }
        return `Current weather in ${cityName.textContent}: ${tempVal.textContent}°C (${weatherDesc.textContent})`;
      }
    });
  }
})();""",
        "cliCommands": [
            {
                "name": "weather",
                "description": "Search city weather via Open-Meteo",
                "usage": "weather [city]"
            }
        ]
    },
    {
        "id": "pomodoro-timer",
        "name": "Pomodoro Focus Timer",
        "version": "1.0.0",
        "author": "si4k",
        "category": "Productivity",
        "description": "Tactile Pomodoro focus timer with Focus, Short Break, and Long Break presets.",
        "type": "widget",
        "icon": '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        "enabled": True,
        "defaultW": 340,
        "defaultH": 220,
        "minW": 250,
        "minH": 180,
        "html": """<div class="pomo-widget">
  <div class="pomo-modes">
    <button class="pomo-mode active" data-time="1500">Focus</button>
    <button class="pomo-mode" data-time="300">Short Break</button>
    <button class="pomo-mode" data-time="900">Long Break</button>
  </div>
  <div class="pomo-display">
    <span id="pomo-time" class="pomo-time">25:00</span>
    <span id="pomo-session" class="pomo-session">Session 1 of 4</span>
  </div>
  <div class="pomo-controls">
    <button id="pomo-toggle" class="pomo-btn primary">Start</button>
    <button id="pomo-reset" class="pomo-btn">Reset</button>
  </div>
</div>""",
        "css": """body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--text-color, #e2e8f0);
  margin: 0;
  padding: 12px;
  background: transparent;
  box-sizing: border-box;
}
.pomo-widget {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  gap: 8px;
}
.pomo-modes {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.06);
  padding: 3px;
  border-radius: 8px;
}
.widget.light .pomo-modes {
  background: rgba(0, 0, 0, 0.05);
}
.pomo-mode {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s;
}
.pomo-mode.active {
  background: #f43f5e;
  color: #fff;
  opacity: 1;
  font-weight: 600;
}
.pomo-display {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pomo-time {
  font-size: 2.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
}
.pomo-session {
  font-size: 0.75rem;
  opacity: 0.65;
}
.pomo-controls {
  display: flex;
  gap: 8px;
}
.pomo-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: inherit;
  padding: 6px 18px;
  border-radius: 6px;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.2s;
}
.widget.light .pomo-btn {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.12);
}
.pomo-btn.primary {
  background: #f43f5e;
  border-color: #f43f5e;
  color: #fff;
  font-weight: 600;
}
.pomo-btn:hover { opacity: 0.9; }""",
        "js": """(function() {
  let timeLeft = 1500;
  let totalTime = 1500;
  let timerId = null;
  let sessions = 1;

  const timeEl = document.getElementById('pomo-time');
  const sessionEl = document.getElementById('pomo-session');
  const toggleBtn = document.getElementById('pomo-toggle');
  const resetBtn = document.getElementById('pomo-reset');
  const modes = document.querySelectorAll('.pomo-mode');

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch(e) {}
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function updateDisplay() {
    timeEl.textContent = formatTime(timeLeft);
  }

  function startTimer() {
    if (timerId) return;
    toggleBtn.textContent = 'Pause';
    timerId = setInterval(() => {
      timeLeft--;
      updateDisplay();
      if (timeLeft <= 0) {
        clearInterval(timerId);
        timerId = null;
        toggleBtn.textContent = 'Start';
        playChime();
        if (window.widget && window.widget.notifications) {
          window.widget.notifications.show('Pomodoro Complete!', { body: 'Time to take a break or start next session.' });
        }
        sessions++;
        sessionEl.textContent = `Session ${sessions} of 4`;
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!timerId) return;
    clearInterval(timerId);
    timerId = null;
    toggleBtn.textContent = 'Start';
  }

  toggleBtn.addEventListener('click', () => {
    if (timerId) pauseTimer();
    else startTimer();
  });

  resetBtn.addEventListener('click', () => {
    pauseTimer();
    timeLeft = totalTime;
    updateDisplay();
  });

  modes.forEach(btn => {
    btn.addEventListener('click', () => {
      modes.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      pauseTimer();
      totalTime = parseInt(btn.getAttribute('data-time'), 10);
      timeLeft = totalTime;
      updateDisplay();
    });
  });

  updateDisplay();

  if (window.widget && window.widget.registerCommand) {
    window.widget.registerCommand('pomodoro', {
      description: 'Control Pomodoro timer [start|pause|reset]',
      usage: 'pomodoro [start|pause|reset]',
      category: 'Productivity',
      execute: (args) => {
        const cmd = (args && args[0]) ? args[0].toLowerCase() : '';
        if (cmd === 'start') { startTimer(); return 'Pomodoro started'; }
        if (cmd === 'pause') { pauseTimer(); return 'Pomodoro paused'; }
        if (cmd === 'reset') { pauseTimer(); timeLeft = totalTime; updateDisplay(); return 'Pomodoro reset'; }
        return `Pomodoro: ${formatTime(timeLeft)} (${timerId ? 'running' : 'paused'})`;
      }
    });
  }
})();""",
        "cliCommands": [
            {
                "name": "pomodoro",
                "description": "Control Pomodoro timer [start|pause|reset]",
                "usage": "pomodoro [start|pause|reset]"
            }
        ]
    }
]

def build():
    os.makedirs('widgetstore/widgets', exist_ok=True)
    catalog_items = []

    for w in WIDGETS:
        widget_id = w["id"]
        json_path = f"widgetstore/widgets/{widget_id}.json"
        homewidget_path = f"widgetstore/widgets/{widget_id}.homewidget"

        # 1. Write readable JSON
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(w, f, indent=2)

        # 2. Write gzip compressed .homewidget
        payload = json.dumps(w, separators=(',', ':')).encode("utf-8")
        compressed = gzip.compress(payload)
        with open(homewidget_path, "wb") as f:
            f.write(compressed)

        print(f"Generated {widget_id}: {json_path} and {homewidget_path} ({len(compressed)} bytes)")

        catalog_items.append({
            "id": w["id"],
            "name": w["name"],
            "version": w["version"],
            "author": w["author"],
            "category": w["category"],
            "description": w["description"],
            "type": w["type"],
            "icon": w["icon"],
            "downloadUrl": f"{BASE_RAW_URL}/{widget_id}.homewidget",
            "jsonUrl": f"{BASE_RAW_URL}/{widget_id}.json",
            "installUri": f"homewidget:install?url={BASE_RAW_URL}/{widget_id}.homewidget",
            "cliCommands": w.get("cliCommands", [])
        })

    catalog = {
        "repository": REPO_STORE_URL,
        "rawBase": BASE_RAW_URL,
        "count": len(catalog_items),
        "widgets": catalog_items
    }

    catalog_path = "widgetstore/widgets.json"
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2)

    print(f"Generated catalog at {catalog_path} with {len(catalog_items)} widgets.")

if __name__ == "__main__":
    build()
