import { useState, useEffect, useRef } from 'react';
import './TimerWidget.css';
import { requestNotificationPermission, sendNotification } from '../../utils/notifications';

// SVG Icons based on the mockups
const PlayIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M8 5v14l11-7z" />
    </svg>
);

const CoffeeIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M4 19h16v2H4zM20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 5h-2V5h2v3z" />
    </svg>
);

const LunchIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
    </svg>
);

const StopIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M6 6h12v12H6z" />
    </svg>
);

export default function TimerWidget({ id, title, durationMinutes, colorVar, theme, icon, activeTimerId, onActivate, onRunningChange }) {
    // Store the target end time (in ms) when the timer is running
    const [endTime, setEndTime] = useState(null);
    const [timeLeftMs, setTimeLeftMs] = useState(durationMinutes * 60 * 1000);
    const [isRunning, setIsRunning] = useState(false);
    const animationRef = useRef(null);

    const totalMs = durationMinutes * 60 * 1000;

    const resetTimer = () => {
        setIsRunning(false);
        setEndTime(null);
        setTimeLeftMs(totalMs);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (onRunningChange) onRunningChange(id, false);
    };

    useEffect(() => {
        if (activeTimerId !== null && activeTimerId !== id && (isRunning || timeLeftMs !== totalMs)) {
            resetTimer();
        }
    }, [activeTimerId, id, isRunning, timeLeftMs, totalMs]);

    // Progress goes from 0 to 1
    const progress = isRunning ? ((totalMs - timeLeftMs) / totalMs) : 0;
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * progress;

    useEffect(() => {
        requestNotificationPermission();
    }, []);

    useEffect(() => {
        const updateTime = () => {
            if (!isRunning || !endTime) return;

            const now = Date.now();
            const difference = endTime - now;

            if (difference <= 0) {
                setTimeLeftMs(0);
                setIsRunning(false);
                setEndTime(null);
                sendNotification(`${durationMinutes} Min ${title} terminado`, 'Es hora de continuar.');
                if (onRunningChange) onRunningChange(id, false);
            } else {
                setTimeLeftMs(difference);
                animationRef.current = requestAnimationFrame(updateTime);
            }
        };

        if (isRunning) {
            animationRef.current = requestAnimationFrame(updateTime);
        } else if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isRunning, endTime, title, durationMinutes]);

    const toggleTimer = () => {
        if (isRunning) {
            // Pause
            setIsRunning(false);
            setEndTime(null);
            if (onRunningChange) onRunningChange(id, false);
        } else {
            // Start or Resume
            setIsRunning(true);
            setEndTime(Date.now() + timeLeftMs);
            if (onActivate) onActivate(id);
            if (onRunningChange) onRunningChange(id, true);
        }
    };

    const formatTime = (ms) => {
        const totalSeconds = Math.ceil(ms / 1000); // Ceiling to show full second until it ticks down
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const renderIcon = () => {
        if (icon === 'play') return isRunning ? <StopIcon /> : <PlayIcon />;
        if (icon === 'coffee') return isRunning ? <StopIcon /> : <CoffeeIcon />;
        if (icon === 'lunch') return isRunning ? <StopIcon /> : <LunchIcon />;
        return <PlayIcon />;
    };

    return (
        <div
            className={`timer-widget ${theme}-widget`}
            style={{ '--widget-color': `var(${colorVar})` }}
            onClick={toggleTimer}
        >
            {/* Light mode: Circle with number on the LEFT */}
            {theme === 'light' && (
                <div className="section-circle">
                    <svg className="progress-ring" width="100" height="100">
                        <circle className="ring-bg" cx="50" cy="50" r={radius} />
                        <circle
                            className="ring-fill"
                            cx="50" cy="50" r={radius}
                            style={{ strokeDasharray: circumference, strokeDashoffset }}
                        />
                    </svg>
                    <div className="circle-inner-num">
                        {durationMinutes}
                    </div>
                </div>
            )}

            {/* Middle Text Section (Left aligned in dark, middle in light) */}
            <div className="section-text">
                <div className="text-val">{durationMinutes} Min</div>
                <div className="text-lbl">{title}</div>
            </div>

            {/* Dark mode: Circle with icon inside on the RIGHT */}
            {theme === 'dark' && (
                <div className="section-circle">
                    <svg className="progress-ring" width="100" height="100">
                        <circle className="ring-bg" cx="50" cy="50" r={radius} />
                        <circle
                            className="ring-fill glow-ring"
                            cx="50" cy="50" r={radius}
                            style={{ strokeDasharray: circumference, strokeDashoffset }}
                        />
                    </svg>
                    <div className="circle-inner-icon">
                        {renderIcon()}
                    </div>
                </div>
            )}

            {/* Light mode: Small alt icon on the far right with progress ring */}
            {theme === 'light' && (
                <div className="section-alt-icon">
                    <svg className="alt-icon-ring" width="44" height="44">
                        <circle className="alt-ring-bg" cx="22" cy="22" r="20" />
                        <circle
                            className="alt-ring-fill"
                            cx="22" cy="22" r="20"
                            style={{
                                strokeDasharray: 2 * Math.PI * 20,
                                strokeDashoffset: (2 * Math.PI * 20) * progress
                            }}
                            transform="rotate(-90 22 22)"
                        />
                    </svg>
                    <div className="alt-icon-wrapper">
                        {renderIcon()}
                    </div>
                </div>
            )}

            {isRunning && (
                <div className="reset-hint" onClick={(e) => { e.stopPropagation(); resetTimer(); }}>Reset</div>
            )}
        </div>
    );
}
