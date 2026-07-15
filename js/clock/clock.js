export function initClock() {
    const clockElement = document.getElementById('clock');
    const greetingElement = document.getElementById('greeting');
    
    const updateTimeAndGreeting = () => {
        if (!clockElement || !greetingElement) return;

        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        clockElement.textContent = `${hour.toString().padStart(2, '0')}:${minutes}`;

        let greeting = 'Good evening.';
        if (hour >= 5 && hour < 12) {
            greeting = 'Good morning.';
        } else if (hour >= 12 && hour < 18) {
            greeting = 'Good afternoon.';
        }
        greetingElement.textContent = greeting;
    };

    updateTimeAndGreeting();
    setInterval(updateTimeAndGreeting, 1000 * 60); // Update every minute
}
