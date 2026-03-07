const API = 'https://torfix.xyz';
const CURRENT_VERSION = __APP_VERSION__;

export function getCurrentVersion() {
  return CURRENT_VERSION;
}

export async function checkUpdate() {
  try {
    const res = await fetch(API + '/app-version.json?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    if (data.version && data.version !== CURRENT_VERSION) {
      return { available: true, version: data.version, url: data.url || API + '/torflix.apk', forced: data.forced || false };
    }
    return { available: false };
  } catch (e) { return { available: false }; }
}

export async function downloadAndInstall(url) {
  // Méthode 1: Lien direct - Android gère le téléchargement
  const a = document.createElement('a');
  a.href = url;
  a.download = 'torflix.apk';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
