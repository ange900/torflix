import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Accueil' },
  { path: '/movies', label: 'Films' },
  { path: '/series', label: 'Séries' },
  { path: '/trending', label: 'Tendances' },
  { path: '/search', label: 'Recherche' },
  { path: '/mylist', label: 'Ma Liste' },
];

export default function TVNav() {
  const nav = useNavigate();
  const loc = useLocation();

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '65px',
      background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)',
      display: 'flex', alignItems: 'center', padding: '0 40px', zIndex: 9998, gap: '6px',
    }}>
      <span style={{ fontSize: '26px', fontWeight: 900, color: '#e50914', marginRight: '40px', fontFamily: 'Arial' }}>
        TorFlix
      </span>
      {tabs.map(({ path, label }) => {
        const active = path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(path);
        return (
          <button key={path} onClick={() => nav(path)} tabIndex={0}
            style={{
              color: active ? '#fff' : '#aaa', fontSize: '17px', padding: '8px 18px',
              borderRadius: '4px', border: 'none', cursor: 'pointer', fontFamily: 'Arial',
              background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => { e.target.style.outline = '2px solid #e50914'; e.target.style.outlineOffset = '2px'; }}
            onBlur={(e) => { e.target.style.outline = 'none'; }}
          >{label}</button>
        );
      })}
    </nav>
  );
}
