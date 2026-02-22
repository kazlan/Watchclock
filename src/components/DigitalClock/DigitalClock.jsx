import { useState, useEffect } from 'react';
import './DigitalClock.css';

export default function DigitalClock({ theme }) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        // Update every minute, starting exactly at the top of the next minute
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
    }, []);

    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');

    return (
        <div className={`digital-clock-container ${theme}-digital`}>
            <span className="digit">{hours}</span>
            <span className="colon">:</span>
            <span className="digit">{minutes}</span>
        </div>
    );
}
