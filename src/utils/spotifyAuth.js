const SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
    'user-library-read',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-follow-read'
];

export const getSpotifyRedirectUri = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5173/callback';
    }
    return 'https://watchclock-ebon.vercel.app/callback';
};

const generateRandomString = (length) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input) => {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};

export const loginToSpotify = async () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    if (!clientId) {
        console.error('Spotify Client ID not found in environment variables.');
        return;
    }

    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    window.localStorage.setItem('spotify_code_verifier_v3', codeVerifier);

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: getSpotifyRedirectUri(),
        scope: SCOPES.join(' '),
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        show_dialog: 'true',
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
};

export const handleAuthCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return { token: null, error: `Spotify denegó el acceso: ${error}` };
    }

    const code = params.get('code');
    if (code) {
        const codeVerifier = localStorage.getItem('spotify_code_verifier_v3');
        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: clientId,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: getSpotifyRedirectUri(),
                    code_verifier: codeVerifier,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                return { token: null, error: `Error obteniendo token: ${errorData.error_description || errorData.error}` };
            }

            const data = await response.json();
            const accessToken = data.access_token;
            const expiresIn = data.expires_in || 3600;
            const expirationTime = Date.now() + expiresIn * 1000;

            localStorage.setItem('spotify_access_token_v3', accessToken);
            localStorage.setItem('spotify_token_expiration_v3', expirationTime.toString());
            if (data.refresh_token) {
                localStorage.setItem('spotify_refresh_token_v3', data.refresh_token);
            }

            // Clean URL query
            window.history.replaceState({}, document.title, window.location.pathname);

            return { token: accessToken, error: null };
        } catch (err) {
            return { token: null, error: `Error de red: ${err.message}` };
        }
    }

    return { token: null, error: null };
};

export const getStoredToken = () => {
    const token = localStorage.getItem('spotify_access_token_v3');
    const expiration = localStorage.getItem('spotify_token_expiration_v3');

    if (token && expiration && Date.now() < Number(expiration)) {
        return token;
    }

    if (token) {
        localStorage.removeItem('spotify_access_token_v3');
        localStorage.removeItem('spotify_token_expiration_v3');
    }
    return null;
};
