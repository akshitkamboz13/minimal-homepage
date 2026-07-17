import { userSettings, onSettingsChanged } from '../settings/index.js';

export function initClock() {
    const clockElement = document.getElementById('clock');
    const greetingElement = document.getElementById('greeting');
    const heroSection = document.querySelector('.hero-section');
    
    let dateElement = document.getElementById('date-display');
    let intervalId = null;

    const updateTimeAndGreeting = () => {
        if (!clockElement || !greetingElement) return;

        const now = new Date();
        const actualHour = now.getHours();
        
        // 1. Time string calculation
        let displayHour = actualHour;
        const is24 = userSettings.clockFormat === '24';
        let ampm = '';
        
        if (!is24) {
            ampm = displayHour >= 12 ? ' PM' : ' AM';
            displayHour = displayHour % 12;
            displayHour = displayHour ? displayHour : 12;
        }
        
        const hourStr = displayHour.toString().padStart(2, '0');
        const minutesStr = now.getMinutes().toString().padStart(2, '0');
        
        let timeStr = `${hourStr}:${minutesStr}`;
        if (userSettings.clockShowSeconds) {
            const secondsStr = now.getSeconds().toString().padStart(2, '0');
            timeStr += `:${secondsStr}`;
        }
        timeStr += ampm;
        
        clockElement.textContent = timeStr;

        // 2. Greeting calculation
        let greeting = 'Good evening.';
        if (actualHour >= 5 && actualHour < 12) {
            greeting = 'Good morning.';
        } else if (actualHour >= 12 && actualHour < 18) {
            greeting = 'Good afternoon.';
        }
        greetingElement.textContent = greeting;

        // 3. Date display calculation
        if (userSettings.clockShowDate) {
            if (!dateElement && heroSection) {
                dateElement = document.createElement('div');
                dateElement.id = 'date-display';
                dateElement.className = 'date-display';
                heroSection.appendChild(dateElement);
            }
            if (dateElement) {
                const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
                dateElement.textContent = now.toLocaleDateString(undefined, options);
                dateElement.style.display = 'block';
            }
        } else if (dateElement) {
            dateElement.style.display = 'none';
        }
    };

    const startUpdateLoop = () => {
        if (intervalId) clearInterval(intervalId);
        updateTimeAndGreeting();
        const delay = userSettings.clockShowSeconds ? 1000 : 1000 * 30; // 30s fallback when no seconds
        intervalId = setInterval(updateTimeAndGreeting, delay);
    };

    startUpdateLoop();

    onSettingsChanged(() => {
        startUpdateLoop();
    });
}
