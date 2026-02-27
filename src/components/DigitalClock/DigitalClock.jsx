import { useState, useEffect } from 'react';
import './DigitalClock.css';


export default function DigitalClock({ theme, endTime }) {
    const [time, setTime] = useState(new Date());
    const [countdownMs, setCountdownMs] = useState(null);

    // Normal Clock effect (HH:MM)
    useEffect(() => {
        if (endTime) return; // Skip if countdown is active

        setTime(new Date()); // Ensure immediate sync
        const now = new Date();
        const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

        let interval;
        const timeout = setTimeout(() => {
            setTime(new Date());
            interval = setInterval(() => setTime(new Date()), 60000);
        }, msUntilNextMinute);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [endTime]);

    // Countdown effect (MM:SS)
    useEffect(() => {
        if (!endTime) {
            setCountdownMs(null);
            return;
        }

        const updateCountdown = () => {
            const diff = endTime - Date.now();
            if (diff <= 0) {
                setCountdownMs(0);
            } else {
                setCountdownMs(diff);
            }
        };

        updateCountdown(); // Run immediately
        const intervalId = setInterval(updateCountdown, 100); // 100ms update for responsiveness

        return () => clearInterval(intervalId);
    }, [endTime]);


    if (endTime && countdownMs !== null) {
        // Display countdown
        const totalSeconds = Math.ceil(countdownMs / 1000);
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');

        return (
            <div className={`digital-clock-container ${theme}-digital countdown-mode`}>
                <span className="digit">{m}</span>
                <span className="colon">:</span>
                <span className="digit">{s}</span>
            </div>
        );
    }

    // Display normal time
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');

    return (
        <div className={`digital-clock-container ${theme}-digital`}>
            <div className="time-display">
                <span className="digit">{hours}</span>
                <span className="colon">:</span>
                <span className="digit">{minutes}</span>
            </div>
        </div>
    );
}
