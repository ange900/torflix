import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import Details from './pages/Details';
import Player from './pages/Player';
import Movies from './pages/Movies';
import Series from './pages/Series';
import Trending from './pages/Trending';
import History from './pages/History';
import MyList from './pages/MyList';
import Trackers from './pages/Trackers';
import Admin from './pages/Admin';
import SettingsPage from './pages/SettingsPage';
import Profile from './pages/Profile';
import Download from './pages/Download';
import TizenGuide from './pages/TizenGuide';
import TVPair from './pages/TVPair';
import Auth from './pages/Auth';
import NavBar from './components/NavBar';
import Sidebar from './components/Sidebar';
import SplashScreen from './components/SplashScreen';
import IOSInstall from './components/IOSInstall';
import { getStoredAuth } from './services/auth';
import { checkUpdate, getCurrentVersion, downloadAndInstall } from './services/updater';

function UpdatePopup({ info, onClose }) {
  const [downloading, setDownloading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const handleUpdate = async () => {
    setDownloading(true);
    const interval = setInterval(() => {
      setProgress(p => { if (p >= 90) { clearInterval(interval); return 90; } return p + 10; });
    }, 300);
    try {
      await downloadAndInstall(info.url);
      setProgress(100);
      clearInterval(interval);
      setTimeout(() => onClose(), 3000);
    } catch (e) {
      clearInterval(interval);
      window.open(info.url, '_system');
    }
  };
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'#1a1a2e',borderRadius:'16px',padding:'30px',maxWidth:'340px',width:'100%',textAlign:'center',border:'1px solid #333'}}>
        <div style={{fontSize:'40px',marginBottom:'12px'}}>{downloading ? '⬇️' : '🔄'}</div>
        <h2 style={{color:'#fff',fontSize:'20px',fontWeight:'bold',marginBottom:'8px'}}>{downloading ? 'Téléchargement...' : 'Mise à jour disponible'}</h2>
        <p style={{color:'#aaa',fontSize:'14px',marginBottom:'6px'}}>Version actuelle : <span style={{color:'#f44'}}>{getCurrentVersion()}</span></p>
        <p style={{color:'#aaa',fontSize:'14px',marginBottom:'20px'}}>Nouvelle version : <span style={{color:'#4f4'}}>{info.version}</span></p>
        {downloading ? (
          <div>
            <div style={{width:'100%',height:'8px',background:'#333',borderRadius:'4px',overflow:'hidden',marginBottom:'10px'}}>
              <div style={{width:progress+'%',height:'100%',background:'linear-gradient(90deg,#e50914,#4f4)',borderRadius:'4px',transition:'width 0.3s'}} />
            </div>
            <p style={{color:'#aaa',fontSize:'12px'}}>{progress < 100 ? 'Téléchargement en cours...' : '✅ Téléchargé ! Installation...'}</p>
          </div>
        ) : (
          <>
            <button onClick={handleUpdate} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#e50914,#b20710)',color:'#fff',border:'none',borderRadius:'10px',fontSize:'16px',fontWeight:'bold',cursor:'pointer',marginBottom:'10px'}}>Mettre à jour maintenant</button>
            {!info.forced && (<button onClick={onClose} style={{width:'100%',padding:'12px',background:'transparent',color:'#888',border:'1px solid #444',borderRadius:'10px',fontSize:'14px',cursor:'pointer'}}>Plus tard</button>)}
          </>
        )}
      </div>
    </div>
  );
}

function AppContent() {
  var location = useLocation();
  var isPlayer = location.pathname.startsWith('/player');
  return (
    <div className="min-h-screen bg-bg">
      {!isPlayer && <Sidebar />}
      <div className={!isPlayer ? 'md:ml-[220px] pb-20 md:pb-0' : 'pb-20 md:pb-0'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/series" element={<Series />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/history" element={<History />} />
          <Route path="/mylist" element={<MyList />} />
          <Route path="/trackers" element={<Trackers />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/tv-guide" element={<TizenGuide />} />
          <Route path="/tv-pair" element={<TVPair />} />
          <Route path="/download" element={<Download />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/details/:type/:id" element={<Details />} />
          <Route path="/player" element={<Player />} />
        </Routes>
        <IOSInstall />
      </div>
      {!isPlayer && <NavBar />}
    </div>
  );
}

export default function App() {
  var _useState = useState(null), user = _useState[0], setUser = _useState[1];
  var _useState2 = useState(true), checking = _useState2[0], setChecking = _useState2[1];
  var _useState3 = useState(true), showSplash = _useState3[0], setShowSplash = _useState3[1];
  var _useState4 = useState(null), updateInfo = _useState4[0], setUpdateInfo = _useState4[1];
  var _useState5 = useState(false), dismissed = _useState5[0], setDismissed = _useState5[1];

  useEffect(function() {
    try {
      var prefs = JSON.parse(localStorage.getItem('torflix_prefs') || '{}');
      if (prefs.theme) document.documentElement.setAttribute('data-theme', prefs.theme);
    } catch(e) {}
  }, []);

  useEffect(function() {
    var stored = getStoredAuth();
    if (stored && stored.user) setUser(stored.user);
    setChecking(false);
  }, []);

  useEffect(function() {
    checkUpdate().then(function(info) { if (info.available) setUpdateInfo(info); });
  }, []);

  if (showSplash) return React.createElement(SplashScreen, { onFinish: function() { setShowSplash(false); } });

  if (checking) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return React.createElement(Auth, { onAuth: setUser });
  return (
    <BrowserRouter>
      {updateInfo && !dismissed && <UpdatePopup info={updateInfo} onClose={function() { setDismissed(true); }} />}
      <AppContent />
    </BrowserRouter>
  );
}
