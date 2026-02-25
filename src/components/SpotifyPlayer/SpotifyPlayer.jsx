import React, { useState, useEffect, useCallback, useRef } from 'react';
import { loginToSpotify, handleAuthCallback, getValidToken, clearSpotifyAuth } from '../../utils/spotifyAuth';
import './SpotifyPlayer.css';

const PlayIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="24" height="24">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
);

const PauseIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="24" height="24">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
);

const NextIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="24" height="24">
        <polygon points="5 4 15 12 5 20 5 4"></polygon>
        <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"></line>
    </svg>
);

const PrevIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="24" height="24">
        <polygon points="19 20 9 12 19 4 19 20"></polygon>
        <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"></line>
    </svg>
);

const SpotifyIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.3 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM20.16 9.6C15.84 7.08 9.24 6.9 5.4 8.04c-.6.18-1.2-.18-1.38-.78-.18-.6.18-1.2.78-1.38 4.32-1.26 11.64-1.08 16.56 1.86.54.3.72 1.02.42 1.56-.24.48-.96.66-1.62.3z" />
    </svg>
);


const SpotifyPlayer = ({ isHidden, onOpenLibrary }) => {
    const [token, setToken] = useState(null);
    const [player, setPlayer] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [playbackState, setPlaybackState] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");

    const scriptLoaded = useRef(false);

    // Transfer playback to our new web device automatically
    const transferPlaybackHere = useCallback(async (devId, accToken) => {
        try {
            await fetch('https://api.spotify.com/v1/me/player', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accToken}`
                },
                body: JSON.stringify({ device_ids: [devId], play: true })
            });
        } catch (err) {
            console.error('Error transferring playback', err);
        }
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            // 1. Check URL for code exchange first (we just returned from login)
            const parsed = await handleAuthCallback();
            let currentToken = parsed.token;

            if (parsed.error) {
                setErrorMsg(parsed.error);
            }

            // 2. If no new token, check IndexedDB
            if (!currentToken) {
                currentToken = await getValidToken();
            }

            // Quick handle for '/callback' route refresh edge cases so it doesn't linger
            if (window.location.pathname === '/callback') {
                window.history.replaceState({}, document.title, '/');
            }

            if (currentToken) {
                setToken(currentToken);
            }
        };

        initAuth();
    }, []);

    useEffect(() => {
        if (!token || scriptLoaded.current) return;

        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;

        document.body.appendChild(script);
        scriptLoaded.current = true;

        window.onSpotifyWebPlaybackSDKReady = () => {
            const spotifyPlayer = new window.Spotify.Player({
                name: 'Watchclock Player',
                getOAuthToken: cb => { cb(token); },
                volume: 0.5
            });

            setPlayer(spotifyPlayer);

            // Ready State
            spotifyPlayer.addListener('ready', ({ device_id }) => {
                console.log('Ready with Device ID', device_id);
                setDeviceId(device_id);
                // We do NOT auto-transfer here to avoid startling the user.
                // We will show a "Connect" or "Transfer" button.
            });

            spotifyPlayer.addListener('not_ready', ({ device_id }) => {
                console.log('Device ID has gone offline', device_id);
                setIsActive(false);
            });

            // Errors
            spotifyPlayer.addListener('initialization_error', ({ message }) => { setErrorMsg(message) });
            spotifyPlayer.addListener('authentication_error', ({ message }) => {
                setErrorMsg('Auth error. Please log in again.');
                clearSpotifyAuth();
                setToken(null);
            });
            spotifyPlayer.addListener('account_error', ({ message }) => { setErrorMsg(message) });

            // Playback status updates
            spotifyPlayer.addListener('player_state_changed', state => {
                if (!state) {
                    setIsActive(false);
                    return;
                }

                setPlaybackState(state);
                setIsActive(true);
                setIsPaused(state.paused);

                if (state.track_window && state.track_window.current_track) {
                    setCurrentTrack(state.track_window.current_track);
                }
            });

            spotifyPlayer.connect();
        };

        return () => {
            if (player) {
                player.disconnect();
            }
        };
    }, [token]);


    if (isHidden) return null;

    if (!token) {
        return (
            <div className="spotify-container spotify-login-view glass-panel">
                <SpotifyIcon />
                <p>Conecta tu cuenta Premium</p>
                <button className="spotify-login-btn" onClick={loginToSpotify}>
                    Login con Spotify
                </button>
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="spotify-container glass-panel spotify-error">
                <p>Error: {errorMsg}</p>
                <button className="spotify-login-btn" onClick={() => { setErrorMsg(''); setToken(null); }}>Reconectar</button>
            </div>
        );
    }

    if (!currentTrack || !isActive) {
        return (
            <div className="spotify-container glass-panel spotify-connect-view">
                <SpotifyIcon />
                <p>Reproductor Listo</p>
                {deviceId ? (
                    <button className="spotify-login-btn" onClick={() => transferPlaybackHere(deviceId, token)}>
                        Escuchar aquí
                    </button>
                ) : (
                    <p className="loading-text">Cargando dispositivo...</p>
                )}
            </div>
        );
    }

    return (
        <div className="spotify-container glass-panel spotify-player-active">
            <div className="sp-album-art" onClick={onOpenLibrary} title="Abrir Mi Música">
                <img
                    src={currentTrack.album.images[0]?.url || ''}
                    alt="Album Art"
                    className={!isPaused ? 'sp-spin' : ''}
                />
                <div className="sp-center-hole"></div>
            </div>

            <div className="sp-info">
                <div className="sp-track-name">{currentTrack.name}</div>
                <div className="sp-artist-name">{currentTrack.artists.map(a => a.name).join(', ')}</div>
            </div>

            <div className="sp-controls">
                <button className="sp-btn" onClick={() => player.previousTrack()}>
                    <PrevIcon />
                </button>

                <button className="sp-btn sp-play-btn" onClick={() => player.togglePlay()}>
                    {isPaused ? <PlayIcon /> : <PauseIcon />}
                </button>

                <button className="sp-btn" onClick={() => player.nextTrack()}>
                    <NextIcon />
                </button>
            </div>
        </div>
    );
};

export default SpotifyPlayer;
