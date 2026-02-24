import { useEffect, useRef, useState } from 'react';
import './AnalogClock.css';

export default function AnalogClock({ theme, onClick }) {
    const [time, setTime] = useState(new Date());
    const requestRef = useRef();

    const updateTime = () => {
        setTime(new Date());
        requestRef.current = requestAnimationFrame(updateTime);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(updateTime);
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    const milliseconds = time.getMilliseconds();

    const secondsDegrees = ((seconds + milliseconds / 1000) / 60) * 360;
    const minutesDegrees = ((minutes + seconds / 60) / 60) * 360;
    const hoursDegrees = ((hours % 12 + minutes / 60) / 12) * 360;

    return (
        <div
            className={`clock-container ${theme}-clock`}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <div className="clock-face">
                {/* Light Reflection (useful for both, more visible in dark) */}
                <div className="clock-glare"></div>

                {/* Clock Marks */}
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="clock-mark-wrapper"
                        style={{ transform: `rotate(${i * 30}deg)` }}
                    >
                        <div className={`mark ${i % 3 === 0 ? 'main-mark' : 'sub-mark'}`}></div>
                    </div>
                ))}

                {/* Clock Hands Container */}
                <div className="hands-container">
                    <div
                        className="hand hour-hand"
                        style={{ transform: `rotate(${hoursDegrees}deg)` }}
                    />
                    <div
                        className="hand min-hand"
                        style={{ transform: `rotate(${minutesDegrees}deg)` }}
                    />
                    <div
                        className="hand sec-hand"
                        style={{ transform: `rotate(${secondsDegrees}deg)` }}
                    />
                </div>

                <div className="clock-center"></div>
            </div>
        </div>
    );
}
