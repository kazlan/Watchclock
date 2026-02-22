import { useState, useEffect, useRef, Fragment } from 'react'
import AnalogClock from './components/AnalogClock/AnalogClock'
import DigitalClock from './components/DigitalClock/DigitalClock'
import TimerWidget from './components/TimerWidget/TimerWidget'
import QOTD from './components/QOTD/QOTD'
import './index.css'
import './App.css'

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

const TIMERS_CONFIG = [
  { id: 'focus', title: 'Focus', duration: 10, colorVar: '--timer-focus', icon: 'play', video: '/work.mp4' },
  { id: 'coffee', title: 'Coffee', duration: 5, colorVar: '--timer-coffee', icon: 'coffee', video: '/coffee.mp4' },
  { id: 'lunch', title: 'Lunch', duration: 20, colorVar: '--timer-lunch', icon: 'lunch', video: '/lunch.mp4' },
];

function App() {
  const [theme, setTheme] = useState('dark');
  const [activeTimerId, setActiveTimerId] = useState(null);
  const [runningTimerId, setRunningTimerId] = useState(null);
  const [activeEndTime, setActiveEndTime] = useState(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.error(`Wake Lock error: ${err.name}, ${err.message}`);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current !== null) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && runningTimerId) {
        await requestWakeLock();
      }
    };

    if (runningTimerId) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      releaseWakeLock();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [runningTimerId]);


  const handleRunningChange = (id, isRunning, endTime) => {
    if (isRunning) {
      setRunningTimerId(id);
      setActiveEndTime(endTime);
      setIsVideoLoaded(false);
    } else if (runningTimerId === id) {
      setRunningTimerId(null);
      setActiveEndTime(null);
      setIsVideoLoaded(false);
    }
  };

  const stopActiveTimer = () => {
    setActiveTimerId('stop');
    setRunningTimerId(null);
    setActiveEndTime(null);
    setIsVideoLoaded(false);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <>
      <div className="aurora-bg">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
        <div className="aurora-blob blob-3"></div>
      </div>
      <div className="tablet-frame">
        <div className="utility-header">
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>

        <main className="dashboard-grid">
          <section className="left-panel">
            <div className="clock-wrapper">
              <AnalogClock theme={theme} />
            </div>
            <DigitalClock theme={theme} endTime={activeEndTime} />
          </section>

          <section className="right-panel">
            <div className={`timers-row ${runningTimerId ? 'timers-hidden' : ''}`}>
              {TIMERS_CONFIG.map(timer => (
                <div key={timer.id} className="timer-wrapper">
                  <TimerWidget
                    id={timer.id}
                    title={timer.title}
                    durationMinutes={timer.duration}
                    colorVar={timer.colorVar}
                    theme={theme}
                    icon={timer.icon}
                    activeTimerId={activeTimerId}
                    onActivate={setActiveTimerId}
                    onRunningChange={handleRunningChange}
                  />
                </div>
              ))}
            </div>

            <QOTD theme={theme} isHidden={!!runningTimerId} />

            {TIMERS_CONFIG.map(timer => {
              const isVideoVisible = runningTimerId === timer.id;
              if (!isVideoVisible) return null;

              return (
                <div
                  key={`video-${timer.id}`}
                  className={`video-container video-visible ${isVideoLoaded ? 'is-loaded' : ''}`}
                  onClick={stopActiveTimer}
                >
                  <video
                    src={timer.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="work-video"
                    onCanPlay={() => setIsVideoLoaded(true)}
                  />
                  <div className="video-progress-track">
                    <div className="video-progress-bar"></div>
                  </div>
                </div>
              );
            })}
          </section>
        </main>
      </div>
    </>
  );
}

export default App;
