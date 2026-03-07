import { useState, useEffect, useRef } from 'react';

export default function SplashScreen({ onFinish }) {
  var _s = useState(0), phase = _s[0], setPhase = _s[1];
  var audioRef = useRef(null);

  useEffect(function() {
    try {
      var audio = new Audio('/torflix-intro.mp3');
      audio.volume = 1.0;
      audioRef.current = audio;
      var p = audio.play();
      if (p) p.catch(function(){});
    } catch (e) {}

    var t1 = setTimeout(function(){ setPhase(1); }, 300);
    var t2 = setTimeout(function(){ setPhase(2); }, 1200);
    var t3 = setTimeout(function(){ setPhase(3); }, 3500);
    var t4 = setTimeout(function(){ setPhase(4); }, 4500);
    var t5 = setTimeout(function(){ onFinish(); }, 5200);
    return function() { [t1,t2,t3,t4,t5].forEach(clearTimeout); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',background:'#000',opacity:phase===4?0:1,transition:'opacity 0.7s ease-out'}}>
      <div style={{position:'absolute',inset:0,background:phase>=2?'radial-gradient(ellipse at center, rgba(229,9,20,0.08) 0%, transparent 70%)':'transparent',transition:'all 1.5s ease-out'}}/>
      {phase>=2 && <Particles />}
      <div style={{opacity:phase>=1?1:0,transform:phase>=1?'scale(1) translateY(0)':'scale(0.5) translateY(30px)',transition:'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)',marginBottom:'20px'}}>
        <div style={{width:'130px',height:'130px',borderRadius:'28px',overflow:'hidden',position:'relative',boxShadow:phase>=2?'0 0 60px rgba(229,9,20,0.5), 0 0 120px rgba(229,9,20,0.2), 0 20px 60px rgba(0,0,0,0.5)':'0 20px 60px rgba(0,0,0,0.5)',transition:'box-shadow 1.5s ease-out'}}>
          <img src="/icons/icon-192x192.png" alt="TorFlix" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          {phase>=1&&phase<4&&(<div style={{position:'absolute',inset:0,background:'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, transparent 50%)',animation:'shine 2s ease-in-out infinite'}}/>)}
        </div>
      </div>
      <div style={{opacity:phase>=2?1:0,transform:phase>=2?'translateY(0)':'translateY(15px)',transition:'all 0.8s ease-out'}}>
        <h1 style={{fontSize:'42px',fontWeight:900,letterSpacing:'6px',textTransform:'uppercase',margin:0,color:'#fff',textShadow:phase>=3?'0 0 40px rgba(229,9,20,0.6), 0 0 80px rgba(229,9,20,0.3)':'0 0 20px rgba(229,9,20,0.3)',transition:'text-shadow 1s ease-out'}}>TOR<span style={{color:'#e50914'}}>FLIX</span></h1>
      </div>
      <p style={{opacity:phase>=3?1:0,transform:phase>=3?'translateY(0)':'translateY(10px)',transition:'all 0.6s ease-out',color:'#555',fontSize:'12px',letterSpacing:'3px',textTransform:'uppercase',marginTop:'8px'}}>Stream Everything</p>
      <div style={{width:phase>=2?'200px':'0px',height:'2px',marginTop:'24px',background:'linear-gradient(90deg, transparent, #e50914, transparent)',transition:'width 1.2s ease-out',opacity:phase>=2?0.6:0}}/>
      <button onClick={onFinish} style={{position:'absolute',bottom:'40px',right:'20px',color:'#333',fontSize:'12px',background:'none',border:'none',cursor:'pointer',opacity:phase>=1?0.5:0,transition:'opacity 0.5s'}}>Passer ›</button>
      <style dangerouslySetInnerHTML={{__html:'@keyframes shine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}'}}/>
    </div>
  );
}

function Particles() {
  var particles = [];
  for (var i = 0; i < 15; i++) {
    particles.push({left:Math.random()*100+'%',top:Math.random()*100+'%',size:Math.random()*3+1,delay:Math.random()*3,dur:Math.random()*3+2,opacity:Math.random()*0.3+0.1});
  }
  return (<>{particles.map(function(p,i){ return (<div key={i} style={{position:'absolute',left:p.left,top:p.top,width:p.size+'px',height:p.size+'px',borderRadius:'50%',background:'#e50914',opacity:p.opacity,animation:'float '+p.dur+'s ease-in-out '+p.delay+'s infinite'}}/>); })}</>);
}
