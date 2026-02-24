const SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state' // required for retrieving current track info
];

export const getSpotifyRedirectUri = () => {
    // Must exactly match the ones whitelisted in the Spotify Developer Dashboard
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5173/callback';
    }
    return 'https://watchclock-ebon.vercel.app/callback';
};

export const loginToSpotify = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    if (!clientId) {
        console.error('Spotify Client ID not found in environment variables.');
        return;
    }
    const redirectUri = getSpotifyRedirectUri();
    const authEndpoint = 'https://accounts.spotify.com/authorize';

    const queryUrl = `${authEndpoint}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPES.join(' '))}&response_type=token&show_dialog=true`;

    window.location.href = queryUrl;
};

export const getTokenFromUrl = () => {
    return window.location.hash
        .substring(1)
        .split('&')
        .reduce((initial, item) => {
            let parts = item.split('=');
            initial[parts[0]] = decodeURIComponent(parts[1]);
            return initial;
        }, {});
};

export const extractAndStoreToken = () => {
    const hashObj = getTokenFromUrl();
    const accessToken = hashObj.access_token;

    if (accessToken) {
        // Determine expiration time (usually 3600 seconds = 1 hour)
        const expiresIn = Number(hashObj.expires_in) || 3600;
        const expirationTime = Date.now() + expiresIn * 1000;

        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_token_expiration', expirationTime.toString());

        // Clean URL hash so it doesn't stay visible
        window.location.hash = '';
        return accessToken;
    }
    return null;
};

export const getStoredToken = () => {
    const token = localStorage.getItem('spotify_access_token');
    const expiration = localStorage.getItem('spotify_token_expiration');

    if (token && expiration && Date.now() < Number(expiration)) {
        return token;
    }

    // If expired or missing, clean up
    if (token) {
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_token_expiration');
    }
    return null;
};
