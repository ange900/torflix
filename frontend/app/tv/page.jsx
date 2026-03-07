'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const ROWS = [
  { id: 'trending', title: '🔥 Tendances', api: '/api/movies/trending' },
  { id: 'popular_movies', title: '🎬 Films Populaires', api: '/api/movies/popular' },
  { id: 'popular_tv', title: '📺 Séries Populaires', api: '/api/tv/popular' },
  { id: 'top_rated', title: '⭐ Les Mieux Notés', api: '/api/movies/top-rated' },
  { id: 'action', title: '💥 Action', api: '/api/movies/discover?with_genres=28' },
  { id: 'comedy', title: '😂 Comédie', api: '/api/movies/discover?with_genres=35' },
  { id: 'scifi', title: '🚀 Science-Fiction', api: '/api/movies/discover?with_genres=878' },
  { id: 'animation', title: '🎌 Animation', api: '/api/movies/discover?with_genres=16' },
];

const TABS = [
  { label: 'Accueil', path: '/tv' },
  { label: 'Films', path: '/films' },
  { label: 'Séries', path: '/series' },
  { label: 'Recherche', path: '/search' },
  { label: 'Favoris', path: '/watchlist' },
];

function TVCard({ item, isFocused, onFocus, onSelect }) {
  const poster = item.poster_path ? 'https://image.tmdb.org/t/p/w342' + item.poster_path : null;
  return (
    <div data-tv-card onMouseEnter={onFocus} onClick={onSelect} style={{
      flexShrink: 0, width: 120, cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
      transform: isFocused ? 'scale(1.12)' : 'scale(1)',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      boxShadow: isFocused ? '0 0 0 3px #e50914, 0 8px 32px rgba(229,9,20,0.6)' : '0 2px 8px rgba(0,0,0,0.4)',
      zIndex: isFocused ? 10 : 1, position: 'relative',
    }}>
      {poster
        ? <img src={poster} alt={item.title || item.name} style={{ width: '100%', height: 175, objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', height: 175, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🎬</div>
      }
      <div style={{ padding: '8px', background: '#111' }}>
        <p style={{ color: '#fff', fontSize: 11, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title || item.name}
        </p>
        <p style={{ color: '#f59e0b', fontSize: 10, margin: '3px 0 0' }}>
          {item.vote_average > 0 ? '★ ' + item.vote_average.toFixed(1) : ''}
        </p>
      </div>
    </div>
  );
}

function TVRow({ row, rowIndex, focusedRow, focusedCol, onFocus, onSelect }) {
  const [items, setItems] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch(row.api).then(r => r.json())
      .then(d => setItems((d.results || d.trending || []).slice(0, 20)))
      .catch(() => {});
  }, [row.api]);

  useEffect(() => {
    if (focusedRow === rowIndex && scrollRef.current) {
      const card = scrollRef.current.children[focusedCol];
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [focusedRow, focusedCol, rowIndex]);

  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 14, paddingLeft: 48 }}>
        {row.title}
      </h2>
      <div ref={scrollRef} style={{ display: 'flex', gap: 14, paddingLeft: 48, paddingRight: 48, overflowX: 'hidden' }}>
        {items.map((item, colIndex) => (
          <TVCard key={item.id} item={item}
            isFocused={focusedRow === rowIndex && focusedCol === colIndex}
            onFocus={() => onFocus(rowIndex, colIndex)}
            onSelect={() => onSelect(item)}
          />
        ))}
      </div>
    </div>
  );
}

export default function TVHome() {
  const router = useRouter();
  const [focusedRow, setFocusedRow] = useState(0);
  const [focusedCol, setFocusedCol] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [zone, setZone] = useState('content');

  const handleSelect = useCallback((item) => {
    const type = item.media_type === 'tv' || item.first_air_date ? 'tv' : 'movie';
    router.push('/player/' + type + '/' + item.id);
  }, [router]);

  useEffect(() => {
    const onKey = (e) => {
      console.log('[TV KEY]', e.key, e.keyCode, e.which);
      if (['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Enter',' '].includes(e.key)) e.preventDefault();
      if (zone === 'tabs') {
        if (e.key === 'ArrowRight') setActiveTab(t => Math.min(t + 1, TABS.length - 1));
        if (e.key === 'ArrowLeft') setActiveTab(t => Math.max(t - 1, 0));
        if (e.key === 'ArrowDown') setZone('content');
        if (e.key === 'Enter') { if (activeTab > 0) router.push(TABS[activeTab].path); }
      } else {
        if (e.key === 'ArrowDown') setFocusedRow(r => Math.min(r + 1, ROWS.length - 1));
        if (e.key === 'ArrowUp') { if (focusedRow === 0) setZone('tabs'); else setFocusedRow(r => r - 1); }
        if (e.key === 'ArrowRight') setFocusedCol(c => Math.min(c + 1, 19));
        if (e.key === 'ArrowLeft') setFocusedCol(c => Math.max(c - 1, 0));
        if (e.key === 'Enter' || e.keyCode === 23 || e.keyCode === 13 || e.key === ' ') {
          const rowEl = document.querySelectorAll('[data-tv-row]')[focusedRow];
          rowEl?.querySelectorAll('[data-tv-card]')[focusedCol]?.click();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zone, focusedRow, focusedCol, activeTab, router]);

  useEffect(() => {
    document.querySelectorAll('[data-tv-row]')[focusedRow]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusedRow]);

  return (
    <div style={{ background: '#0d0d0d', minHeight: '100vh', overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, padding: '14px 48px',
        background: 'linear-gradient(180deg, #0d0d0d 60%, transparent)',
        display: 'flex', alignItems: 'center', gap: 40,
      }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0, flexShrink: 0 }}>
          Tor<span style={{ color: '#e50914' }}>Flix</span>
        </h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map((tab, i) => (
            <button key={tab.label} onClick={() => { setActiveTab(i); if (i > 0) router.push(tab.path); }} style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: zone === 'tabs' && activeTab === i ? '#e50914' : activeTab === i ? 'rgba(229,9,20,0.25)' : 'rgba(255,255,255,0.07)',
              color: activeTab === i ? '#fff' : '#aaa',
              outline: zone === 'tabs' && activeTab === i ? '2px solid #fff' : 'none',
              transition: 'all 0.15s',
            }}>{tab.label}</button>
          ))}
        </div>
      </div>
      <div style={{ paddingBottom: 60, paddingTop: 8 }}>
        {ROWS.map((row, rowIndex) => (
          <div key={row.id} data-tv-row>
            <TVRow row={row} rowIndex={rowIndex}
              focusedRow={focusedRow} focusedCol={focusedCol}
              onFocus={(r, c) => { setFocusedRow(r); setFocusedCol(c); setZone('content'); }}
              onSelect={handleSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
