import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import AnalogClock from './components/AnalogClock/AnalogClock'
import DigitalClock from './components/DigitalClock/DigitalClock'
import TimerWidget from './components/TimerWidget/TimerWidget'
import QOTD from './components/QOTD/QOTD'
import SpotifyPlayer from './components/SpotifyPlayer/SpotifyPlayer'
import SpotifyLibrary from './components/SpotifyLibrary/SpotifyLibrary'
import CalendarView from './components/CalendarView/CalendarView'
import CelestialView from './components/CelestialView/CelestialView'
import GoBoard from './components/GoBoard/GoBoard'
import SteampunkBackground from './components/SteampunkBackground/SteampunkBackground'
import './index.css'
import './index.css'
import './App.css'

// --- Weather Icons ---
const WeatherSunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <circle cx="12" cy="12" r="4"></circle>
    <line x1="12" y1="2" x2="12" y2="4"></line>
    <line x1="12" y1="20" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"></line>
    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="4" y2="12"></line>
    <line x1="20" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66"></line>
    <line x1="17.66" y1="6.34" x2="19.07" y2="4.93"></line>
  </svg>
);

const WeatherCloudIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
  </svg>
);

const WeatherCloudRainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
    <path d="M16 14v6"></path>
    <path d="M8 14v6"></path>
    <path d="M12 16v6"></path>
  </svg>
);

const WeatherCloudSnowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
    <path d="M8 15h.01"></path>
    <path d="M8 19h.01"></path>
    <path d="M12 17h.01"></path>
    <path d="M12 21h.01"></path>
    <path d="M16 15h.01"></path>
    <path d="M16 19h.01"></path>
  </svg>
);

const WeatherCloudLightningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path>
    <polyline points="13 11 9 17 15 17 11 23"></polyline>
  </svg>
);

const getWeatherIcon = (code) => {
  // Basic WMO Weather interpretation codes
  if (code === 0 || code === 1) return <WeatherSunIcon />;
  if (code === 2 || code === 3 || code === 45 || code === 48) return <WeatherCloudIcon />;
  if (code >= 51 && code <= 67) return <WeatherCloudRainIcon />;
  if (code >= 71 && code <= 77) return <WeatherCloudSnowIcon />;
  if (code >= 80 && code <= 82) return <WeatherCloudRainIcon />;
  if (code >= 85 && code <= 86) return <WeatherCloudSnowIcon />;
  if (code >= 95) return <WeatherCloudLightningIcon />;
  return <WeatherCloudIcon />; // Fallback
};

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

const CogIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
  </svg>
);

const BulbIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.22-1.21 4.16-3 5.2V17a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-2.8C7.21 13.16 6 11.22 6 9a6 6 0 0 1 6-6z"></path>
  </svg>
);

const TelescopeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 18A9 9 0 0 1 3 12"></path>
    <path d="m19 14-4.88-4.88"></path>
    <path d="M14.12 9.12a2.82 2.82 0 1 0-3.99-4 2.82 2.82 0 0 0 3.99 4z"></path>
    <path d="m8 15 2.5-2.5"></path>
    <path d="m11 18 2.5-2.5"></path>
  </svg>
);

const GoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
    <circle cx="9" cy="9" r="1.5" fill="currentColor" />
    <circle cx="15" cy="15" r="1.5" fill="currentColor" />
  </svg>
);

const TIMERS_CONFIG = [
  { id: 'focus', title: 'Focus', duration: 10, colorVar: '--timer-focus', icon: 'play', video: '/work.mp4' },
  { id: 'coffee', title: 'Coffee', duration: 5, colorVar: '--timer-coffee', icon: 'coffee', video: '/coffee.mp4' },
  { id: 'lunch', title: 'Lunch', duration: 20, colorVar: '--timer-lunch', icon: 'lunch', video: '/lunch.mp4' },
];

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('watchclock-theme') || 'dark');
  const [activeTimerId, setActiveTimerId] = useState(null);
  const [runningTimerId, setRunningTimerId] = useState(null);
  const [activeEndTime, setActiveEndTime] = useState(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'library' | 'calendar'
  const [backViewComponent, setBackViewComponent] = useState('library');
  const [weather, setWeather] = useState(null);
  const wakeLockRef = useRef(null);

  const handleViewChange = (newView) => {
    if (activeView !== 'dashboard' && newView !== 'dashboard' && activeView !== newView) {
      // Switching directly between back faces: force a flip through the front
      setActiveView('dashboard');
      setTimeout(() => {
        setBackViewComponent(newView);
        setActiveView(newView);
      }, 500); // Wait for the transition to partially obscure the back
    } else {
      if (newView !== 'dashboard') {
        setBackViewComponent(newView);
      }
      setActiveView(newView);
    }
  };


  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && wakeLockRef.current === null) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      console.error(`Wake Lock error: ${err.name}, ${err.message}`);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current !== null) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  // Wake lock driven by timer running OR manual toggle
  useEffect(() => {
    const shouldLock = runningTimerId || wakeLockEnabled;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && shouldLock) {
        await requestWakeLock();
      }
    };

    if (shouldLock) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      releaseWakeLock();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (!shouldLock) releaseWakeLock();
    };
  }, [runningTimerId, wakeLockEnabled, requestWakeLock, releaseWakeLock]);

  const toggleWakeLock = () => setWakeLockEnabled(prev => !prev);


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
    localStorage.setItem('watchclock-theme', theme);
  }, [theme]);

  // Fetch Weather effect
  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async () => {
      try {
        // 1. Get location via IP (no permission prompts needed for the dashboard)
        const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (!geoRes.ok) throw new Error('Failed to get location');
        const geoData = await geoRes.json();
        const { latitude, longitude } = geoData;

        // Save location for Celestial mapping
        setWeather(prev => ({ ...prev, location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } }));

        // 2. Fetch current weather from Open-Meteo API
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`);
        if (!weatherRes.ok) throw new Error('Failed to get weather');
        const weatherData = await weatherRes.json();

        if (isMounted && weatherData.current) {
          setWeather(prev => ({
            ...prev,
            temp: Math.round(weatherData.current.temperature_2m),
            code: weatherData.current.weather_code
          }));
        }
      } catch (err) {
        console.error("Error fetching weather:", err);
      }
    };

    fetchWeather();
    // optionally refresh weather every hour
    const intervalId = setInterval(fetchWeather, 3600000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'steam';
      return 'dark';
    });
  };

  return (
    <>
      <div className="aurora-bg">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
        <div className="aurora-blob blob-3"></div>
      </div>
      <div className="tablet-frame">
        {theme === 'steam' && <SteampunkBackground />}
        <div className="utility-header">
          <button
            onClick={toggleWakeLock}
            className={`theme-toggle-btn wake-lock-btn${wakeLockEnabled ? ' wake-lock-active' : ''}`}
            aria-label={wakeLockEnabled ? 'Desactivar pantalla encendida' : 'Mantener pantalla encendida'}
            title={wakeLockEnabled ? 'Pantalla: siempre encendida' : 'Pantalla: apagado automático'}
          >
            <BulbIcon active={wakeLockEnabled} />
          </button>
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
            {theme === 'dark' && <SunIcon />}
            {theme === 'light' && <CogIcon />}
            {theme === 'steam' && <MoonIcon />}
          </button>
          <button onClick={() => handleViewChange('celestial')} className="theme-toggle-btn" aria-label="View Celestial Hemisphere">
            <TelescopeIcon />
          </button>
          <button onClick={() => handleViewChange('go')} className="theme-toggle-btn" aria-label="Play Go">
            <GoIcon />
          </button>
          {weather && (
            <div className={`weather-widget ${theme}-weather`}>
              <div className="weather-icon">{getWeatherIcon(weather.code)}</div>
              <span className="weather-temp">{weather.temp}°C</span>
            </div>
          )}
        </div>

        <main className="dashboard-grid">
          <section className="left-panel">
            <div className="clock-wrapper">
              <AnalogClock
                theme={theme}
                onClick={() => handleViewChange(activeView === 'calendar' ? 'dashboard' : 'calendar')}
              />
            </div>
            <DigitalClock theme={theme} endTime={activeEndTime} />
          </section>

          <section className="right-panel">
            <div className={`flip-wrapper ${activeView !== 'dashboard' ? 'flipped' : ''}`}>
              <div className="flip-front">
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

                <div className={`player-row ${runningTimerId ? 'player-hidden' : ''}`}>
                  <SpotifyPlayer isHidden={false} onOpenLibrary={() => handleViewChange('library')} />
                </div>

                <div className={`qotd-row ${runningTimerId ? 'qotd-hidden' : ''}`}>
                  <QOTD theme={theme} isHidden={!!runningTimerId} />
                </div>

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
              </div>

              <div className="flip-back">
                {backViewComponent === 'library' && (
                  <SpotifyLibrary onClose={() => handleViewChange('dashboard')} isActive={activeView === 'library'} />
                )}
                {backViewComponent === 'calendar' && (
                  <CalendarView onClose={() => handleViewChange('dashboard')} isActive={activeView === 'calendar'} />
                )}
                {backViewComponent === 'celestial' && (
                  <CelestialView onClose={() => handleViewChange('dashboard')} isActive={activeView === 'celestial'} location={weather?.location} />
                )}
                {backViewComponent === 'go' && (
                  <GoBoard onClose={() => handleViewChange('dashboard')} isActive={activeView === 'go'} />
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export default App;
