import { useState, useEffect } from 'react'
import AnalogClock from './components/AnalogClock/AnalogClock'
import TimerWidget from './components/TimerWidget/TimerWidget'
import './index.css'
import './App.css'

function App() {
  const [theme, setTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

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
            <TimerWidget
              title="Focus"
              durationMinutes={10}
              colorVar="--timer-focus"
              theme={theme}
              icon="play"
            />
            <TimerWidget
              title="Coffee"
              durationMinutes={5}
              colorVar="--timer-coffee"
              theme={theme}
              icon="coffee"
            />
            <TimerWidget
              title="Lunch"
              durationMinutes={20}
              colorVar="--timer-lunch"
              theme={theme}
              icon="lunch"
            />
          </section>
        </main>
      </div>
    </>
  );
}

export default App;
