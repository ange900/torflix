import { useState, useEffect, useRef } from 'react';

export default function TVAuth(_ref) {
  var onAuth = _ref.onAuth;
  var _s1 = useState(''), code = _s1[0], setCode = _s1[1];
  var _s2 = useState(false), loading = _s2[0], setLoading = _s2[1];
  var pollRef = useRef(null);

  function getCode() {
    setLoading(true);
    fetch('/api/tv/pair-code', { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        setCode(d.code);
        setLoading(false);
        startPolling(d.code);
      })
      .catch(function() { setLoading(false); });
  }

  function startPolling(c) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(function() {
      fetch('/api/tv/pair-check/' + c)
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.status === 'paired') {
            clearInterval(pollRef.current);
            // Stocker l'auth
            try { localStorage.setItem('torflix_auth', JSON.stringify({ user: d.user, tokens: d.token })); } catch(e) {}
            onAuth(d.user);
          } else if (d.status === 'expired') {
            clearInterval(pollRef.current);
            getCode(); // Renouveler
          }
        })
        .catch(function() {});
    }, 2500);
  }

  useEffect(function() {
    getCode();
    return function() { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Generer QR code URL (via API Google)
  var qrUrl = code ? 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&bgcolor=0a0a0a&color=ffffff&data=' + encodeURIComponent('https://torfix.xyz/tv-pair?code=' + code) : '';

  return (
    <div style={{
      minHeight:'100vh',background:'#0a0a0a',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',fontFamily:'Arial,sans-serif'
    }}>
      <img src="/icons/icon-192x192.png" alt="TorFlix" style={{width:'100px',height:'100px',borderRadius:'20px',marginBottom:'30px'}} />
      <h1 style={{color:'#fff',fontSize:'44px',fontWeight:900,marginBottom:'10px'}}>
        Tor<span style={{color:'#e50914'}}>Flix</span>
      </h1>
      <p style={{color:'#888',fontSize:'22px',marginBottom:'40px'}}>Connectez-vous depuis votre téléphone</p>

      <div style={{display:'flex',alignItems:'center',gap:'80px'}}>
        {/* QR Code */}
        <div style={{textAlign:'center'}}>
          {code ? (
            <div style={{background:'#fff',padding:'16px',borderRadius:'16px',display:'inline-block'}}>
              <img src={qrUrl} alt="QR" style={{width:'250px',height:'250px',display:'block'}} />
            </div>
          ) : (
            <div style={{width:'282px',height:'282px',background:'#222',borderRadius:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{color:'#666',fontSize:'20px'}}>Chargement...</span>
            </div>
          )}
          <p style={{color:'#aaa',fontSize:'18px',marginTop:'20px'}}>Scannez avec votre téléphone</p>
        </div>

        {/* OU */}
        <div style={{color:'#444',fontSize:'24px',fontWeight:'bold'}}>OU</div>

        {/* Code manuel */}
        <div style={{textAlign:'center'}}>
          <p style={{color:'#aaa',fontSize:'20px',marginBottom:'20px'}}>Allez sur <span style={{color:'#e50914',fontWeight:'bold'}}>torfix.xyz/tv-pair</span></p>
          <p style={{color:'#666',fontSize:'18px',marginBottom:'16px'}}>et entrez le code :</p>
          <div style={{
            fontSize:'72px',fontWeight:900,color:'#fff',letterSpacing:'16px',
            fontFamily:'monospace',padding:'20px 40px',background:'#1a1a1a',
            borderRadius:'12px',border:'2px solid #333'
          }}>
            {code || '------'}
          </div>
          <p style={{color:'#555',fontSize:'16px',marginTop:'20px'}}>Le code expire dans 10 minutes</p>
        </div>
      </div>

      <div style={{marginTop:'50px',display:'flex',alignItems:'center',gap:'12px'}}>
        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full" style={{animation:'spin 1s linear infinite',width:'20px',height:'20px',border:'2px solid #e50914',borderTopColor:'transparent',borderRadius:'50%'}} />
        <span style={{color:'#666',fontSize:'18px'}}>En attente de connexion...</span>
      </div>

      <style dangerouslySetInnerHTML={{__html:'@keyframes spin{to{transform:rotate(360deg)}}'}} />
    </div>
  );
}
