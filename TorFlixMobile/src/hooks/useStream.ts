import { useState, useRef } from 'react';
import { api } from '../services/api';

export function useStream() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [peers, setPeers] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [streamUrl, setStreamUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startStream = async (magnet: string, downloadUrl: string) => {
    setStatus('loading');
    setProgress(0);
    try {
      const res = await api.startStream(magnet, downloadUrl);
      const sid = res.sessionId;
      setSessionId(sid);

      // Poll status
      pollRef.current = setInterval(async () => {
        try {
          const s = await api.getStreamStatus(sid);
          setProgress(s.progress || 0);
          setPeers(s.numPeers || 0);
          setSpeed(s.downloadSpeed || 0);
          if (s.ready || s.progress > 0.002 || s.numPeers > 0) {
            clearInterval(pollRef.current!);
            setStreamUrl(`https://torfix.xyz/api/stream/${sid}/video`);
            setStatus('ready');
          }
        } catch {}
      }, 2000);

      // Timeout 3min
      setTimeout(() => {
        if (status !== 'ready') {
          clearInterval(pollRef.current!);
          setStreamUrl(`https://torfix.xyz/api/stream/${sid}/video`);
          setStatus('ready');
        }
      }, 180000);

    } catch (e: any) {
      setStatus('error');
    }
  };

  const stopStream = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (sessionId) api.stopStream(sessionId).catch(() => {});
    setStatus('idle');
    setStreamUrl('');
  };

  return { status, progress, peers, speed, streamUrl, startStream, stopStream };
}
