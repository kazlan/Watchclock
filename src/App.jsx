import { useState, useEffect, Fragment } from 'react'
import AnalogClock from './components/AnalogClock/AnalogClock'
import TimerWidget from './components/TimerWidget/TimerWidget'
import './index.css'
import './App.css'

const TIMERS_CONFIG = [
  { id: 'focus', title: 'Focus', duration: 10, colorVar: '--timer-focus', icon: 'play', video: '/work.mp4' },
  { id: 'coffee', title: 'Coffee', duration: 5, colorVar: '--timer-coffee', icon: 'coffee', video: '/coffee.mp4' },
  { id: 'lunch', title: 'Lunch', duration: 20, colorVar: '--timer-lunch', icon: 'lunch', video: '/lunch.mp4' },
];

function App() {
  const [theme, setTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [activeTimerId, setActiveTimerId] = useState(null);
  const [runningTimerId, setRunningTimerId] = useState(null);

  const handleRunningChange = (id, isRunning) => {
    if (isRunning) {
      setRunningTimerId(id);
    } else if (runningTimerId === id) {
      setRunningTimerId(null);
    }
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
          <button onClick={toggleTheme} className="theme-toggle-btn">
            Toggle Theme
          </button>
        </div>

        <main className="dashboard-grid">
          <section className="left-panel">
            {theme === 'light' && <div className="left-panel-bg"></div>}
            <div className="clock-wrapper">
              <AnalogClock theme={theme} />
            </div>
          </section>

          <section className="right-panel">
            {TIMERS_CONFIG.map(timer => {
              const isHidden = runningTimerId && runningTimerId !== timer.id;
              const isVideoVisible = runningTimerId === timer.id;

              return (
                <Fragment key={timer.id}>
                  <div className={`timer-wrapper ${isHidden ? 'hidden-timer' : ''}`}>
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
                  <div className={`video-container ${isVideoVisible ? 'video-visible' : 'video-hidden'}`}>
                    <video
                      src={timer.video}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="work-video"
                    />
                  </div>
                </Fragment>
              );
            })}
          </section>
        </main>
      </div>
    </>
  );
}

export default App;
