export function isTVMode() {
  try {
    var ua = navigator.userAgent || '';
    return ua.indexOf('Tizen') !== -1 || window.location.search.indexOf('tv=1') !== -1 || window.__TV_MODE__ === true;
  } catch(e) { return false; }
}

export function tvSplashDone() {
  try { return document.cookie.indexOf('tvSplash=1') !== -1; } catch(e) { return false; }
}

export function setTVSplashDone() {
  try { document.cookie = 'tvSplash=1;path=/;max-age=86400'; } catch(e) {}
}
