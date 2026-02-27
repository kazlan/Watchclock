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

const DB_NAME = 'SpotifyAuthDB';
const STORE_NAME = 'tokens';

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveTokenToDB = async (authData) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(authData, 'spotify_auth');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const getTokenFromDB = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get('spotify_auth');
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

export const clearSpotifyAuth = async () => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.delete('spotify_auth');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) { /* Ignore */ }
};

const refreshAccessToken = async (refreshToken, clientId) => {
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const err = new Error(errorData.error_description || 'Refresh failed');
            err.status = response.status;
            err.code = errorData.error;
            throw err;
        }

        const data = await response.json();
        return {
            access_token: data.access_token,
            expires_in: Date.now() + (data.expires_in || 3600) * 1000,
            refresh_token: data.refresh_token || refreshToken
        };
    } catch (e) {
        throw e;
    }
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
            const expirationTime = Date.now() + (data.expires_in || 3600) * 1000;

            const authData = {
                access_token: data.access_token,
                expires_in: expirationTime,
                refresh_token: data.refresh_token || null
            };

            await saveTokenToDB(authData);

            // Clean URL query
            window.history.replaceState({}, document.title, window.location.pathname);

            return { token: data.access_token, error: null };
        } catch (err) {
            return { token: null, error: `Error de red: ${err.message}` };
        }
    }

    return { token: null, error: null };
};

let refreshTokenPromise = null;

export const getValidToken = async () => {
    const authData = await getTokenFromDB();
    if (!authData) return null;

    // Buffer of 2 minutes
    if (Date.now() < authData.expires_in - 2 * 60 * 1000) {
        return authData.access_token;
    }

    if (authData.refresh_token) {
        if (!refreshTokenPromise) {
            refreshTokenPromise = (async () => {
                try {
                    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
                    if (!clientId) throw new Error("No client ID");

                    const newAuthData = await refreshAccessToken(authData.refresh_token, clientId);
                    await saveTokenToDB(newAuthData);
                    return newAuthData.access_token;
                } catch (e) {
                    // Only clear auth securely if Spotify asserts the grant is invalid (e.g. revoked)
                    if (e.status === 400 && e.code === 'invalid_grant') {
                        await clearSpotifyAuth();
                    }
                    throw e;
                } finally {
                    refreshTokenPromise = null;
                }
            })();
        }

        try {
            return await refreshTokenPromise;
        } catch (e) {
            return null;
        }
    }

    await clearSpotifyAuth();
    return null;
};
