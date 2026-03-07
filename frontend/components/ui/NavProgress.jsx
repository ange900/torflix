'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(30);
    const t1 = setTimeout(() => setProgress(70), 100);
    const t2 = setTimeout(() => setProgress(100), 300);
    const t3 = setTimeout(() => { setVisible(false); setProgress(0); }, 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pathname]);

  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, zIndex: 99999,
      height: 3, background: '#e50914',
      width: `${progress}%`,
      transition: 'width 0.3s ease',
      boxShadow: '0 0 8px #e50914'
    }} />
  );
}
