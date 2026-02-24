import { useState } from 'react';
import './CalendarView.css';

export default function CalendarView({ onClose }) {
    // We start with the current date
    const [currentDate, setCurrentDate] = useState(new Date());

    // Swipe detection states
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    // Minimum swipe distance (in px) to trigger navigation
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null); // Reset
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNextMonth();
        } else if (isRightSwipe) {
            handlePrevMonth();
        }
    };

    const handlePrevMonth = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() - 1);
            return newDate;
        });
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + 1);
            return newDate;
        });
    };

    // Calendar Generation Logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Day of the week the month starts on (0=Sun, 1=Mon, ..., 6=Sat)
    let firstDayIndex = new Date(year, month, 1).getDay();
    // Adjust to make Monday the first day of the week (0=Mon, 1=Tue, ..., 6=Sun)
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Build the grid array
    const blanks = Array.from({ length: firstDayIndex }, (_, i) => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const calendarGrid = [...blanks, ...days];

    // Check if a day is "today"
    const today = new Date();
    const isToday = (dayNumber) => {
        return dayNumber === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
    };

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const dayNames = ["L", "M", "X", "J", "V", "S", "D"];

    return (
        <div
            className="calendar-wrapper"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <button className="calendar-close-btn" onClick={onClose} aria-label="Cerrar calendario">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>

            <div className="calendar-header">
                <h2>{monthNames[month]} {year}</h2>
            </div>

            <div className="calendar-body">
                <div className="calendar-day-names">
                    {dayNames.map(day => (
                        <div key={day} className="day-name">{day}</div>
                    ))}
                </div>

                <div className="calendar-grid">
                    {calendarGrid.map((day, index) => (
                        <div
                            key={index}
                            className={`calendar-cell ${day ? 'has-date' : 'empty'} ${day && isToday(day) ? 'is-today' : ''}`}
                        >
                            {day}
                        </div>
                    ))}
                </div>
            </div>
            <div className="swipe-hint">Desliza para cambiar de mes</div>
        </div>
    );
}
