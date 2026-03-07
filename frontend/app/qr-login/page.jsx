'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function QrLoginPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    setStatus('Connexion...');
    try {
      // 1. Login — le cookie token est posé automatiquement
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailOrUsername: email, password })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.message || 'Identifiants incorrects');

      // 2. Confirmer le token QR — le cookie est envoyé automatiquement
      const confirmRes = await fetch('/api/auth/qr/confirm/' + token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!confirmRes.ok) {
        const err = await confirmRes.json();
        throw new Error(err.error || 'Token TV expiré');
      }

      setStatus('✅ Votre TV est connectée ! Vous pouvez fermer cette page.');
    } catch(e) {
      setStatus('❌ ' + e.message);
    }
    setLoading(false);
  }

  if (!token) return (
    <div style={{color:'white',padding:40,textAlign:'center',background:'#0d0d0d',minHeight:'100vh'}}>
      Token manquant — scannez le QR depuis votre TV
    </div>
  );

  return (
    <div style={{background:'#0d0d0d',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
      <div style={{background:'#181818',padding:32,borderRadius:16,width:360,maxWidth:'90vw'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:40}}>🎬</div>
          <h2 style={{color:'#fff',margin:'8px 0 4px'}}>TorFlix</h2>
          <p style={{color:'#aaa',fontSize:14}}>Connexion sur votre TV</p>
        </div>
        <input
          type="email" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)}
          style={{width:'100%',padding:14,marginBottom:12,borderRadius:8,border:'1px solid #333',background:'#1a1a1a',color:'#fff',fontSize:16,boxSizing:'border-box'}}
        />
        <input
          type="password" placeholder="Mot de passe"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{width:'100%',padding:14,marginBottom:16,borderRadius:8,border:'1px solid #333',background:'#1a1a1a',color:'#fff',fontSize:16,boxSizing:'border-box'}}
        />
        <button onClick={login} disabled={loading}
          style={{width:'100%',padding:14,background: loading ? '#999' : '#e50914',color:'#fff',border:'none',borderRadius:8,fontSize:18,cursor: loading ? 'not-allowed' : 'pointer'}}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        {status && (
          <p style={{textAlign:'center',marginTop:16,color: status.startsWith('✅') ? '#4caf50' : '#e50914', fontSize:14}}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
