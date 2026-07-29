import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Widget from '@/models/Widget';
import Review from '@/models/Review';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();

    // 1. Clear existing seed data if needed
    // We will find and update, or re-create
    await Widget.deleteMany({ identifier: { $in: [
      'com.akshit.aurora',
      'com.minimalist.pomodoro',
      'com.glassy.weather',
      'com.dev.github-analytics'
    ]}});

    let seedDev = await User.findOne({ username: 'Akshit' });
    if (!seedDev) {
      const passwordHash = await hashPassword('password123');
      seedDev = await User.create({
        username: 'Akshit',
        email: 'akshit@example.com',
        passwordHash,
        bio: 'Co-creator of Home Startpage. Passionate about glassmorphic UI, browser sandboxing, and web tools.',
        role: 'developer',
        badges: ['Verified Developer', 'Home Team', 'Official'],
      });
    } else {
      seedDev.role = 'developer';
      if (!seedDev.badges.includes('Verified Developer')) {
        seedDev.badges = ['Verified Developer', 'Home Team', 'Official'];
      }
      await seedDev.save();
    }

    // Define widgets
    const widgetsToSeed = [
      {
        name: 'Aurora Particle Wallpaper',
        identifier: 'com.akshit.aurora',
        description: 'Interactive mesh gradient particle canvas that floats smoothly in the background.',
        longDescription: 'Aurora is an interactive particle generator designed specifically for Home. It renders highly optimized floating bubbles on an HTML5 Canvas. The particles float slowly and merge together, responding gracefully to mouse movements, creating a relaxing, ambient dynamic backdrop for your homepage.',
        version: '1.2.0',
        author: seedDev._id,
        entryPoint: 'index.html',
        category: 'Customization',
        cli: 'aurora',
        isVerified: true,
        isFirefoxApp: true,
        badges: ['Verified', 'Firefox App'],
        tags: ['aurora', 'particles', 'canvas', 'interactive', 'animated', 'relaxing'],
        permissions: ['storage'],
        downloadsCount: 1420,
        averageRating: 4.8,
        ratingsCount: 18,
        screenshots: [
          'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=400&auto=format&fit=crop'
        ],
        openSource: true,
        repositoryUrl: 'https://github.com/akshitKamboj13/aurora-particles',
        html: `
<div class="aurora-container">
  <canvas id="aurora-canvas"></canvas>
  <div class="aurora-controls">
    <button id="btn-aurora-color">Cycle Palette</button>
    <span id="aurora-count">Count: 40</span>
  </div>
</div>
        `,
        css: `
.aurora-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
}
#aurora-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.aurora-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-family: sans-serif;
  font-size: 11px;
  color: #fff;
  z-index: 10;
}
.aurora-controls button {
  background: var(--accent-color, #3b82f6);
  border: none;
  color: #fff;
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 10px;
  font-weight: bold;
}
.widget.light .aurora-controls {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #333;
}
        `,
        js: `
const canvas = document.getElementById('aurora-canvas');
const ctx = canvas.getContext('2d');
let animationFrameId;

// Handle resize
function resize() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
resize();
window.addEventListener('resize', resize);

const palettes = [
  ['#3b82f6', '#8b5cf6', '#ec4899'],
  ['#10b981', '#3b82f6', '#06b6d4'],
  ['#f59e0b', '#ef4444', '#ec4899'],
  ['#6366f1', '#a855f7', '#ec4899']
];
let paletteIdx = parseInt(localStorage.getItem('aurora_palette_idx') || '0') % palettes.length;

const particles = [];
const particleCount = 45;

class Particle {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.radius = Math.random() * 25 + 15;
    this.vx = (Math.random() - 0.5) * 0.6;
    this.vy = (Math.random() - 0.5) * 0.6;
    const colors = palettes[paletteIdx];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.alpha = Math.random() * 0.4 + 0.1;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < -this.radius || this.x > canvas.width + this.radius ||
        this.y < -this.radius || this.y > canvas.height + this.radius) {
      this.reset();
    }
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

for (let i = 0; i < particleCount; i++) {
  particles.push(new Particle());
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  animationFrameId = requestAnimationFrame(animate);
}
animate();

document.getElementById('btn-aurora-color').addEventListener('click', () => {
  paletteIdx = (paletteIdx + 1) % palettes.length;
  localStorage.setItem('aurora_palette_idx', paletteIdx);
  particles.forEach(p => {
    const colors = palettes[paletteIdx];
    p.color = colors[Math.floor(Math.random() * colors.length)];
  });
});
        `,
      },
      {
        name: 'Minimalist Pomodoro Timer',
        identifier: 'com.minimalist.pomodoro',
        description: 'Focus timer with clean glassmorphic progress circle and adjustable session limits.',
        longDescription: 'The Minimalist Pomodoro widget helps you optimize your study or work sessions using the standard Pomodoro technique. It features custom intervals, intuitive start/pause controls, dynamic titles, notifications on finish, and adaptive styling matching the desktop startpage.',
        version: '1.0.1',
        author: seedDev._id,
        entryPoint: 'index.html',
        category: 'Productivity',
        cli: 'pomo',
        isVerified: true,
        badges: ['Verified'],
        tags: ['productivity', 'pomodoro', 'timer', 'focus', 'utility'],
        permissions: ['notifications'],
        downloadsCount: 850,
        averageRating: 4.6,
        ratingsCount: 12,
        screenshots: [
          'https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=400&auto=format&fit=crop'
        ],
        openSource: true,
        repositoryUrl: 'https://github.com/akshitKamboj13/pomodoro-widget',
        html: `
<div class="pomodoro-container">
  <div class="timer-display">
    <svg class="progress-svg" viewBox="0 0 100 100">
      <circle class="bg-circle" cx="50" cy="50" r="45"></circle>
      <circle class="fg-circle" id="timer-progress" cx="50" cy="50" r="45"></circle>
    </svg>
    <div class="timer-text" id="time-text">25:00</div>
  </div>
  <div class="timer-actions">
    <button id="btn-start">Start</button>
    <button id="btn-reset">Reset</button>
    <button id="btn-toggle-mode">Break Mode</button>
  </div>
</div>
        `,
        css: `
.pomodoro-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-family: sans-serif;
  color: #fff;
  padding: 10px;
}
.widget.light .pomodoro-container {
  color: #333;
}
.timer-display {
  position: relative;
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}
.progress-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.progress-svg circle {
  fill: none;
  stroke-width: 6;
}
.bg-circle {
  stroke: rgba(255, 255, 255, 0.08);
}
.widget.light .bg-circle {
  stroke: rgba(0, 0, 0, 0.05);
}
.fg-circle {
  stroke: var(--accent-color, #3b82f6);
  stroke-dasharray: 283;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.3s linear;
}
.timer-text {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.5px;
}
.timer-actions {
  display: flex;
  gap: 8px;
}
.timer-actions button {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}
.widget.light .timer-actions button {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.08);
  color: #333;
}
.timer-actions button:hover {
  background: var(--accent-color, #3b82f6);
  border-color: var(--accent-color, #3b82f6);
  color: white;
}
#btn-start {
  font-weight: bold;
}
        `,
        js: `
let duration = 25 * 60; // 25 min default
let timeLeft = duration;
let timerId = null;
let isBreak = false;

const timeText = document.getElementById('time-text');
const startBtn = document.getElementById('btn-start');
const resetBtn = document.getElementById('btn-reset');
const modeBtn = document.getElementById('btn-toggle-mode');
const progressBar = document.getElementById('timer-progress');

const dashArray = 283;

function updateProgress() {
  const fraction = timeLeft / duration;
  const offset = dashArray * (1 - fraction);
  progressBar.style.strokeDashoffset = offset;
  
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  timeText.textContent = \`\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
}

function startTimer() {
  if (timerId) {
    // Pause
    clearInterval(timerId);
    timerId = null;
    startBtn.textContent = 'Resume';
  } else {
    // Start
    timerId = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updateProgress();
      } else {
        clearInterval(timerId);
        timerId = null;
        startBtn.textContent = 'Start';
        // Fire Notification if permissions exist
        try {
          if (window.Notification && Notification.permission === 'granted') {
            new Notification(isBreak ? 'Focus session starts!' : 'Take a break!', {
              body: isBreak ? 'Time to get back to work!' : 'Great job completing your Pomodoro.'
            });
          } else if (window.Notification && Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        } catch(e) {}
      }
    }, 1000);
    startBtn.textContent = 'Pause';
  }
}

function resetTimer() {
  clearInterval(timerId);
  timerId = null;
  timeLeft = duration;
  startBtn.textContent = 'Start';
  updateProgress();
}

startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);

modeBtn.addEventListener('click', () => {
  isBreak = !isBreak;
  duration = isBreak ? 5 * 60 : 25 * 60; // 5 min break, 25 work
  modeBtn.textContent = isBreak ? 'Work Mode' : 'Break Mode';
  resetTimer();
});

updateProgress();
        `,
      },
      {
        name: 'Glassy Weather Forecast',
        identifier: 'com.glassy.weather',
        description: 'Atmospheric weather panel showing dynamic forecasts, local conditions, and micro-icons.',
        longDescription: 'A gorgeous weather widget that fetches (or mocks) real-time meteorological reports, features location settings, responsive icons, and a translucent blur background that adapts beautifully based on light or dark modes.',
        version: '1.1.0',
        author: seedDev._id,
        entryPoint: 'index.html',
        category: 'Weather',
        cli: 'weather',
        isVerified: true,
        isFirefoxApp: true,
        badges: ['Verified', 'Firefox App'],
        tags: ['weather', 'forecast', 'utility', 'glassmorphism', 'icons'],
        permissions: ['fetch'],
        downloadsCount: 1950,
        averageRating: 4.7,
        ratingsCount: 22,
        screenshots: [
          'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?q=80&w=400&auto=format&fit=crop'
        ],
        openSource: true,
        repositoryUrl: 'https://github.com/akshitKamboj13/weather-widget',
        html: `
<div class="weather-widget-container">
  <div class="weather-main">
    <div class="weather-info-box">
      <h3 id="weather-city">London</h3>
      <p id="weather-desc">Light Drizzle</p>
      <div id="weather-temp">15°C</div>
    </div>
    <div class="weather-icon-box" id="weather-icon-container">
      ⛈️
    </div>
  </div>
  <div class="forecast-row">
    <div class="forecast-day"><span>Mon</span><span>16°</span></div>
    <div class="forecast-day"><span>Tue</span><span>18°</span></div>
    <div class="forecast-day"><span>Wed</span><span>15°</span></div>
    <div class="forecast-day"><span>Thu</span><span>14°</span></div>
  </div>
  <div class="weather-selector">
    <select id="select-city">
      <option value="London">London</option>
      <option value="Tokyo">Tokyo</option>
      <option value="New York">New York</option>
    </select>
  </div>
</div>
        `,
        css: `
.weather-widget-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: sans-serif;
  color: #fff;
  padding: 14px;
  justify-content: space-between;
}
.widget.light .weather-widget-container {
  color: #333;
}
.weather-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.weather-info-box h3 {
  margin: 0 0 2px 0;
  font-size: 18px;
  font-weight: 600;
}
.weather-info-box p {
  margin: 0;
  font-size: 11px;
  opacity: 0.8;
}
#weather-temp {
  font-size: 32px;
  font-weight: 700;
  margin-top: 6px;
}
.weather-icon-box {
  font-size: 42px;
}
.forecast-row {
  display: flex;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.05);
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: 10px;
}
.widget.light .forecast-row {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.05);
}
.forecast-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 10px;
  gap: 2px;
}
.forecast-day span:last-child {
  font-weight: bold;
}
.weather-selector select {
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 6px;
  padding: 4px;
  font-size: 10px;
  outline: none;
  cursor: pointer;
  margin-top: 8px;
}
.widget.light .weather-selector select {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.08);
  color: #333;
}
        `,
        js: `
const cityData = {
  London: { temp: '15°C', desc: 'Light Rain', icon: '🌧️', forecast: ['16°', '18°', '15°', '14°'] },
  Tokyo: { temp: '22°C', desc: 'Clear Sunny', icon: '☀️', forecast: ['24°', '23°', '25°', '22°'] },
  'New York': { temp: '19°C', desc: 'Partly Cloudy', icon: '⛅', forecast: ['20°', '21°', '18°', '17°'] }
};

const select = document.getElementById('select-city');
const cityTitle = document.getElementById('weather-city');
const descText = document.getElementById('weather-desc');
const tempText = document.getElementById('weather-temp');
const iconBox = document.getElementById('weather-icon-container');
const forecastRow = document.querySelector('.forecast-row');

function updateWeather(city) {
  const data = cityData[city];
  if (!data) return;

  cityTitle.textContent = city;
  descText.textContent = data.desc;
  tempText.textContent = data.temp;
  iconBox.textContent = data.icon;

  // Re-render forecast
  forecastRow.innerHTML = '';
  const days = ['Mon', 'Tue', 'Wed', 'Thu'];
  data.forecast.forEach((temp, i) => {
    const el = document.createElement('div');
    el.className = 'forecast-day';
    el.innerHTML = \`<span>\${days[i]}</span><span>\${temp}</span>\`;
    forecastRow.appendChild(el);
  });
}

select.addEventListener('change', (e) => {
  updateWeather(e.target.value);
});

// Initial load
updateWeather('London');

// Test fetch API permission check inside sandbox (logs or alerts output)
try {
  fetch('https://api.github.com/zeno')
    .then(r => r.text())
    .then(txt => console.log('Weather widget network test success: ', txt))
    .catch(err => console.log('Weather network test error:', err));
} catch(e) {
  console.log('Network error:', e.message);
}
        `,
      },
      {
        name: 'GitHub Repo Analytics',
        identifier: 'com.dev.github-analytics',
        description: 'Fetch and view public GitHub repositories, stars counts, and analytics.',
        longDescription: 'This widget serves as a showcase for the widget runtime fetch permissions. It allows users to input any GitHub username and fetch their repositories, displaying them in a sleek, glassmorphic layout. This widget requires fetch permissions to communicate with the GitHub API.',
        version: '1.0.0',
        author: seedDev._id,
        entryPoint: 'index.html',
        category: 'Developer Tools',
        tags: ['github', 'analytics', 'developer', 'repos', 'fetch', 'tools'],
        permissions: ['fetch'],
        downloadsCount: 420,
        averageRating: 4.5,
        ratingsCount: 8,
        screenshots: [
          'https://images.unsplash.com/photo-1618401471353-b98aedd07871?q=80&w=400&auto=format&fit=crop'
        ],
        openSource: true,
        repositoryUrl: 'https://github.com/akshitKamboj13/github-widget',
        html: `
<div class="github-widget">
  <div class="github-header">
    <input type="text" id="github-username" placeholder="GitHub Username" value="akshitKamboj13">
    <button id="btn-fetch-github">Fetch</button>
  </div>
  <div id="github-loading" class="hidden">Loading...</div>
  <div id="github-error" class="hidden"></div>
  <div id="github-repos" class="repos-list">
     <div style="text-align: center; opacity: 0.6; padding: 20px; font-size: 11px;">
       Enter a username above to load repositories.
     </div>
  </div>
</div>
        `,
        css: `
.github-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: sans-serif;
  color: #fff;
  padding: 10px;
}
.widget.light .github-widget {
  color: #333;
}
.github-header {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}
.github-header input {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  outline: none;
}
.widget.light .github-header input {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.08);
  color: #333;
}
.github-header button {
  background: var(--accent-color, #3b82f6);
  border: none;
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  font-weight: bold;
}
#github-loading {
  text-align: center;
  font-size: 11px;
  opacity: 0.8;
  padding: 15px 0;
}
#github-error {
  color: #f87171;
  background: rgba(239, 68, 68, 0.1);
  border: 1px dashed rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  padding: 8px;
  font-size: 10px;
  margin-bottom: 8px;
  word-break: break-all;
}
.repos-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 2px;
}
.repo-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.widget.light .repo-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.05);
}
.repo-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.repo-name {
  font-size: 12px;
  font-weight: bold;
  color: var(--accent-color, #3b82f6);
  text-decoration: none;
}
.repo-stars {
  font-size: 10px;
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: 2px;
}
.repo-desc {
  font-size: 10px;
  opacity: 0.7;
  white-space: nowrap;
  font-size: 0.78rem;
  opacity: 0.7;
  line-height: 1.3;
}
.hidden {
  display: none !important;
}
        `,
        js: `
const btn = document.getElementById('btn-fetch');
const input = document.getElementById('gh-username');
const list = document.getElementById('repo-list');
const loader = document.getElementById('loader');
const errorDiv = document.getElementById('error');

async function fetchRepos() {
  const username = input.value.trim();
  if (!username) return;

  loader.classList.remove('hidden');
  errorDiv.classList.add('hidden');
  list.innerHTML = '';

  try {
    const res = await fetch(\`https://api.github.com/users/\${username}/repos?sort=updated&per_page=5\`);
    loader.classList.add('hidden');

    if (!res.ok) {
      throw new Error(\`Failed to fetch (\${res.status})\`);
    }

    const data = await res.json();
    if (data.length === 0) {
      list.innerHTML = '<div style="text-align: center; opacity: 0.5; padding: 12px; font-size: 0.8rem;">No public repositories found.</div>';
      return;
    }

    data.forEach(repo => {
      const card = document.createElement('div');
      card.className = 'repo-card';
      card.innerHTML = \`
        <div class="repo-name-row">
          <a class="repo-name" href="\${repo.html_url}" target="_blank">\${repo.name}</a>
          <span class="repo-stars">⭐ \${repo.stargazers_count}</span>
        </div>
        <div class="repo-desc">\${repo.description || 'No description provided.'}</div>
      \`;
      list.appendChild(card);
    });
  } catch (err) {
    loader.classList.add('hidden');
    errorDiv.textContent = err.message;
    errorDiv.classList.remove('hidden');
  }
}

btn.addEventListener('click', fetchRepos);
fetchRepos();
        `
      }
    ];

    // Seed widgets
    for (const widgetData of widgetsToSeed) {
      if (!widgetData.files || widgetData.files.length === 0) {
        widgetData.files = [
          { name: 'index.html', content: widgetData.html || '' },
          { name: 'style.css', content: widgetData.css || '' },
          { name: 'app.js', content: widgetData.js || '' },
          {
            name: 'manifest.json',
            content: JSON.stringify({
              name: widgetData.name,
              identifier: widgetData.identifier,
              version: widgetData.version,
              description: widgetData.description,
              cli: widgetData.cli || '',
              entryPoint: widgetData.entryPoint || 'index.html',
              category: widgetData.category,
              isVerified: !!widgetData.isVerified,
              isFirefoxApp: !!widgetData.isFirefoxApp,
            }, null, 2)
          }
        ];
      }

      const createdWidget = await Widget.create(widgetData);
      
      // Seed a few reviews for it
      await Review.deleteMany({ widget: createdWidget._id });
      await Review.create([
        {
          widget: createdWidget._id,
          user: seedDev._id,
          rating: 5,
          comment: `Absolutely brilliant! The widget fits perfectly with my glassmorphic startpage theme. Performance is rock solid.`,
        }
      ]);
    }

    return NextResponse.json({
      message: 'Database seeded successfully with developer profile and 4 sample widgets.',
      developer: seedDev.username,
      widgetsSeeded: widgetsToSeed.map(w => w.name),
    });
  } catch (error) {
    console.error('Seeding database error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
