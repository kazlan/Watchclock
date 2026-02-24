import React, { useState, useEffect } from 'react';
import { getStoredToken } from '../../utils/spotifyAuth';
import './SpotifyLibrary.css';

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const SpotifyLibrary = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('playlists');
    const [searchQuery, setSearchQuery] = useState('');
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    const token = getStoredToken();

    useEffect(() => {
        if (!token) {
            setErrorMsg('Sesión de Spotify expirada. Cierra y vuelve a iniciar.');
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            if (activeTab === 'search') {
                if (!searchQuery) {
                    setItems([]);
                }
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setErrorMsg('');
            try {
                let endpoint = '';
                if (activeTab === 'playlists') {
                    endpoint = 'https://api.spotify.com/v1/me/playlists?limit=50';
                } else if (activeTab === 'albums') {
                    endpoint = 'https://api.spotify.com/v1/me/albums?limit=50';
                } else if (activeTab === 'artists') {
                    endpoint = 'https://api.spotify.com/v1/me/following?type=artist&limit=50';
                }

                const response = await fetch(endpoint, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Spotify Error ${response.status}: ${errorText}`);
                }

                const data = await response.json();

                if (activeTab === 'artists') {
                    setItems(data.artists.items || []);
                } else {
                    setItems(data.items || []);
                }

            } catch (err) {
                console.error(err);
                setErrorMsg(`No se pudo cargar la librería: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [activeTab, token]);

    const handlePlayContext = async (uri) => {
        if (!token) return;
        try {
            await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ context_uri: uri })
            });
            // Auto close library when successful play starts
            onClose();
        } catch (err) {
            console.error('No se pudo reproducir este contexto', err);
        }
    };

    const performSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim() || !token) return;

        setIsLoading(true);
        setErrorMsg('');
        try {
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=album,playlist,artist`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Spotify Error ${response.status}: ${errorText}`);
            }
            const data = await response.json();

            const combined = [
                ...(data.artists?.items || []).map(item => ({ ...item, searchType: 'artist' })),
                ...(data.albums?.items || []).map(item => ({ ...item, searchType: 'album' })),
                ...(data.playlists?.items || []).map(item => ({ ...item, searchType: 'playlist' }))
            ];
            setItems(combined);
        } catch (err) {
            console.error(err);
            setErrorMsg(`Error en la búsqueda: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="spotify-library-container glass-panel">
            <header className="library-header">
                <div className="library-tabs">
                    <button
                        className={`library-tab ${activeTab === 'playlists' ? 'active' : ''}`}
                        onClick={() => setActiveTab('playlists')}
                    >
                        Playlists
                    </button>
                    <button
                        className={`library-tab ${activeTab === 'albums' ? 'active' : ''}`}
                        onClick={() => setActiveTab('albums')}
                    >
                        Álbumes
                    </button>
                    <button
                        className={`library-tab ${activeTab === 'artists' ? 'active' : ''}`}
                        onClick={() => setActiveTab('artists')}
                    >
                        Artistas
                    </button>
                    <button
                        className={`library-tab ${activeTab === 'search' ? 'active' : ''}`}
                        onClick={() => setActiveTab('search')}
                    >
                        Buscar
                    </button>
                </div>
                <button className="close-library-btn" onClick={onClose} aria-label="Cerrar Librería">
                    <CloseIcon />
                </button>
            </header>

            {activeTab === 'search' && (
                <div className="library-search-bar">
                    <form onSubmit={performSearch}>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Buscar playlists, álbumes o artistas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="search-btn">Ir</button>
                    </form>
                </div>
            )}

            <main className="library-content">
                {isLoading && <div className="library-loading">Cargando...</div>}

                {!isLoading && errorMsg && (
                    <div className="library-empty">
                        <p>{errorMsg}</p>
                    </div>
                )}

                {!isLoading && !errorMsg && items.length === 0 && (
                    <div className="library-empty">
                        <p>No se encontraron resultados para esta categoría.</p>
                    </div>
                )}

                {!isLoading && !errorMsg && items.length > 0 && (
                    <div className="library-grid">
                        {items.map((item, idx) => {
                            // Albums API wraps actual album in an "album" object
                            const actualItem = activeTab === 'albums' ? item.album : item;

                            if (!actualItem) return null;

                            // Find best image (usually index 0 or 1)
                            const imageUrl = actualItem.images && actualItem.images.length > 0
                                ? actualItem.images[0].url
                                : 'https://developer.spotify.com/images/guidelines/design/icon3@2x.png'; // fallback

                            const isArtist = activeTab === 'artists' || actualItem.searchType === 'artist';

                            return (
                                <div
                                    key={actualItem.id || idx}
                                    className="library-card"
                                    onClick={() => handlePlayContext(actualItem.uri)}
                                >
                                    <img
                                        src={imageUrl}
                                        alt={actualItem.name}
                                        className={`card-image ${isArtist ? 'artist-img' : ''}`}
                                        loading="lazy"
                                    />
                                    <div className="card-title" title={actualItem.name}>
                                        {actualItem.name}
                                    </div>
                                    <div className="card-subtitle">
                                        {(activeTab === 'playlists' || actualItem.searchType === 'playlist') && `De ${actualItem.owner?.display_name || 'Spotify'}`}
                                        {(activeTab === 'albums' || actualItem.searchType === 'album') && actualItem.artists?.map(a => a.name).join(', ')}
                                        {isArtist && 'Artista'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SpotifyLibrary;
