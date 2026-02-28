import React, { useState, useEffect, useCallback } from 'react';
import Scene from './Scene';
import './CelestialView.css';

export default function CelestialView({ onClose, isActive, location }) {
    // We maintain a "scrub offset" in hours. 0 = Right Now.
    const [offsetHours, setOffsetHours] = useState(0);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Update the base "current time" occasionally so 0 offset stays accurate to real time
    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            setCurrentDate(new Date());
        }, 60000); // update base time every minute

        return () => clearInterval(interval);
    }, [isActive]);

    const displayDate = new Date(currentDate.getTime() + (offsetHours * 60 * 60 * 1000));

    // Handle mouse/touch scrubbing on the custom track
    const handleScrub = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // ClientX relative to the track bounds
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;

        // Let's map 0% to -24 hours, and 100% to +24 hours
        // So 50% = 0 offset
        const mappedOffset = (percentage * 48) - 24;
        setOffsetHours(mappedOffset);
    }, []);

    const resetTime = (e) => {
        e.stopPropagation();
        setOffsetHours(0);
    };

    if (!isActive) return null;

    // Formatting for the UI readout
    const fmtOptions = {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit'
    };
    const dateStr = displayDate.toLocaleDateString(undefined, fmtOptions);

    // Scrubber thumb position percentage (mapped from -24..24 to 0..1)
    const thumbPos = ((offsetHours + 24) / 48) * 100;

    return (
        <div className="celestial-container">
            <button className="celestial-close-btn" onClick={onClose} aria-label="Cerrar vista">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>

            <div className="celestial-canvas-wrapper">
                {location ? (
                    <Scene location={location} date={displayDate} />
                ) : (
                    <div style={{ color: 'white', padding: '2rem' }}>Esperando datos de ubicación...</div>
                )}
            </div>

            {/* Time Controls Overlay */}
            <div className="celestial-controls">
                <div className="celestial-info-row">
                    <h3 className="celestial-title">Hemisferio celeste</h3>
                    <div className="celestial-time" onClick={resetTime} style={{ cursor: 'pointer' }} title="Clic para volver al momento actual">
                        {dateStr}
                    </div>
                </div>

                <div className="scrubber-track" onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    handleScrub(e);
                }} onPointerMove={(e) => {
                    if (e.buttons > 0) handleScrub(e);
                }}>
                    <div className="scrubber-fill" style={{ width: `${thumbPos}%`, background: offsetHours === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}></div>
                    <div className="scrubber-thumb" style={{ left: `${thumbPos}%` }}></div>
                </div>

                <div className="time-readout">
                    <span>-24H</span>
                    <span>{offsetHours === 0 ? 'EN VIVO' : `${offsetHours > 0 ? '+' : ''}${Math.round(offsetHours)}H`}</span>
                    <span>+24H</span>
                </div>
            </div>
        </div>
    );
}
