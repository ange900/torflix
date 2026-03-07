'use client';
import { useState, useRef, useEffect } from 'react';

export default function QrLoginPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const inputs = useRef([]);
  const API = process.env.NEXT_PUBLIC_API_URL || 'https://torflix.xyz/api';

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  const handleChange = (i, val) => {
    if (!/^[a-zA-Z0-9]?$/.test(val)) return;
    const next = [...code];
    next[i] = val.toUpperCase();
    setCode(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\s/g,'').toUpperCase().slice(0,6);
    const next = [...code];
    text.split('').forEach((c, i) => { if (i < 6) next[i] = c; });
    setCode(next);
    inputs.current[Math.min(text.length, 5)]?.focus();
  };

  const fullCode = code.join('');

  const confirm = async () => {
    if (fullCode.length !== 6) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/tv/device/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceCode: fullCode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ ok: true, text: '✅ Appareil confirmé ! Retournez sur votre écran.' });
      } else {
        setStatus({ ok: false, text: data.error || 'Code invalide ou expiré' });
      }
    } catch {
      setStatus({ ok: false, text: 'Erreur réseau, réessayez.' });
    }
    setLoading(false);
  };

  return (
    <div style={{background:'#0d0d0d',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
      <div style={{background:'#181818',padding:40,borderRadius:20,width:380,maxWidth:'92vw',textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:8}}>📺</div>
        <h2 style={{color:'#fff',margin:'0 0 6px',fontSize:24}}>TorFlix</h2>
        <p style={{color:'#aaa',fontSize:14,margin:'0 0 32px'}}>
          Entrez le code affiché<br/>sous le QR code sur votre écran
        </p>
        <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:28}}>
          {code.map((c, i) => (
            <input key={i} ref={el => inputs.current[i] = el}
              value={c}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              maxLength={1}
              style={{width:48,height:60,textAlign:'center',fontSize:26,fontWeight:'bold',fontFamily:'monospace',background:c?'#2a2a2a':'#1a1a1a',border:`2px solid ${c?'#e50914':'#333'}`,borderRadius:10,color:'#fff',outline:'none'}}
            />
          ))}
        </div>
        <button onClick={confirm} disabled={fullCode.length !== 6 || loading}
          style={{width:'100%',padding:16,background:fullCode.length===6&&!loading?'#e50914':'#444',color:'#fff',border:'none',borderRadius:10,fontSize:18,fontWeight:'bold',cursor:fullCode.length===6&&!loading?'pointer':'not-allowed'}}>
          {loading ? 'Vérification...' : 'Confirmer'}
        </button>
        {status && <p style={{marginTop:20,fontSize:15,color:status.ok?'#4caf50':'#e50914'}}>{status.text}</p>}
        <p style={{color:'#555',fontSize:12,marginTop:24}}>Le code expire dans 10 minutes</p>
      </div>
    </div>
  );
}
