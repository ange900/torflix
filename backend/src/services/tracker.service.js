import pool from '../config/database.js';
import crypto from 'crypto';
import axios from 'axios';
import { execSync } from 'child_process';
import path from 'path';

// ==================== ENCRYPTION ====================
const ENCRYPTION_KEY = process.env.TRACKER_ENCRYPTION_KEY || 'StreamPanel2026SecretKey32Bytes!';
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch { return null; }
}

// ==================== DB INIT ====================
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tracker_accounts (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      tracker_type VARCHAR(50) NOT NULL,
      username VARCHAR(255) NOT NULL,
      password_encrypted TEXT NOT NULL,
      cookies TEXT,
      status VARCHAR(20) DEFAULT 'inactive',
      ratio FLOAT,
      last_check TIMESTAMP,
      extra_data JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tracker_user ON tracker_accounts(user_id, tracker_type);
  `);
}
init().catch(e => console.error('[Tracker Init]', e));

pool.query(`
  DO $$ BEGIN
    ALTER TABLE tracker_accounts ADD CONSTRAINT tracker_accounts_user_id_tracker_type_key UNIQUE (user_id, tracker_type);
  EXCEPTION WHEN duplicate_table THEN NULL;
  END $$;
`).catch(() => {});

// ==================== SUPPORTED TRACKERS ====================
export const TRACKERS = {
  ygg: { name: 'YGG', domain: 'https://www.yggtorrent.org', loginUrl: 'https://www.yggtorrent.org/auth/process_login', searchUrl: 'https://www.yggtorrent.org/engine/search' },
  torrent9: { name: 'Torrent9', domain: 'https://www.torrent9.fm', searchUrl: 'https://www.torrent9.fm/search_torrent' },
  sharewood: { name: 'Sharewood', domain: 'https://www.sharewood.tv', loginUrl: 'https://www.sharewood.tv/login', searchUrl: 'https://www.sharewood.tv/filterTorrents' },
};

// ==================== JACKETT CONFIG ====================
const JACKETT_URL = process.env.JACKETT_URL || 'http://jackett:9117';
const JACKETT_KEY = process.env.JACKETT_API_KEY || '1gu7miltp8zwwoxakpyho2qelhsna0vg';
const JACKETT_CONTAINER = 'torflix-jackett';
const JACKETT_CONFIG_DIR = '/config/Jackett/Indexers';
const JACKETT_DEF_DIR = '/app/Jackett/Definitions';

// ==================== JACKETT INDEXER MANAGEMENT ====================

export async function getJackettIndexers() {
  try {
    // Configured indexers
    const configured = execSync(
      `docker exec ${JACKETT_CONTAINER} ls ${JACKETT_CONFIG_DIR}`,
      { encoding: 'utf8' }
    ).trim().split('\n')
      .filter(f => f.endsWith('.json') && !f.endsWith('.bak'))
      .map(f => f.replace('.json', ''));

    // Test each with a quick ping to get status
    const results = await Promise.all(configured.map(async (id) => {
      try {
        const { data } = await axios.get(`${JACKETT_URL}/api/v2.0/indexers/${id}/results`, {
          params: { apikey: JACKETT_KEY, Query: 'test', Limit: 1 },
          timeout: 8000,
        });
        return { id, name: id, configured: true, status: 'ok', results: data.Results?.length || 0 };
      } catch {
        return { id, name: id, configured: true, status: 'error', results: 0 };
      }
    }));

    return results;
  } catch (err) {
    console.error('[Jackett] getIndexers:', err.message);
    return [];
  }
}

export async function getAvailableJackettIndexers() {
  try {
    const output = execSync(
      `docker exec ${JACKETT_CONTAINER} find ${JACKETT_DEF_DIR} -name "*.yml" -exec grep -l "type: public" {} \\;`,
      { encoding: 'utf8', timeout: 30000 }
    );
    const allPublic = output.trim().split('\n')
      .map(f => path.basename(f, '.yml'))
      .filter(Boolean)
      .sort();

    // Get configured ones
    const configured = execSync(
      `docker exec ${JACKETT_CONTAINER} ls ${JACKETT_CONFIG_DIR}`,
      { encoding: 'utf8' }
    ).trim().split('\n')
      .filter(f => f.endsWith('.json') && !f.endsWith('.bak'))
      .map(f => f.replace('.json', ''));

    return allPublic.map(id => ({
      id,
      name: id,
      configured: configured.includes(id),
    }));
  } catch (err) {
    console.error('[Jackett] getAvailable:', err.message);
    return [];
  }
}

export async function addJackettIndexer(indexerId) {
  try {
    // Get default URL from definition
    let sitelink = '';
    try {
      const yml = execSync(
        `docker exec ${JACKETT_CONTAINER} cat ${JACKETT_DEF_DIR}/${indexerId}.yml`,
        { encoding: 'utf8' }
      );
      const m = yml.match(/links:\s*\n\s*-\s*(.+)/);
      if (m) sitelink = m[1].trim();
    } catch {}

    const json = JSON.stringify([
      { id: 'sitelink', type: 'inputstring', name: 'Site Link', value: sitelink },
      { id: 'cookieheader', type: 'hiddendata', name: 'CookieHeader', value: '' },
      { id: 'lasterror', type: 'hiddendata', name: 'LastError', value: null },
      { id: 'tags', type: 'inputtags', name: 'Tags', value: '' }
    ]);

    // Write file via docker exec
    execSync(
      `docker exec ${JACKETT_CONTAINER} sh -c 'cat > ${JACKETT_CONFIG_DIR}/${indexerId}.json << '"'"'JSONEOF'"'"'\n${json}\nJSONEOF'`,
      { encoding: 'utf8' }
    );

    // Restart Jackett
    execSync(`docker restart ${JACKETT_CONTAINER}`, { encoding: 'utf8' });
    await new Promise(r => setTimeout(r, 3000));

    return { success: true, id: indexerId, sitelink };
  } catch (err) {
    console.error('[Jackett] addIndexer:', err.message);
    throw new Error(`Ajout impossible: ${err.message}`);
  }
}

export async function removeJackettIndexer(indexerId) {
  try {
    execSync(
      `docker exec ${JACKETT_CONTAINER} rm -f ${JACKETT_CONFIG_DIR}/${indexerId}.json ${JACKETT_CONFIG_DIR}/${indexerId}.json.bak`,
      { encoding: 'utf8' }
    );
    execSync(`docker restart ${JACKETT_CONTAINER}`, { encoding: 'utf8' });
    await new Promise(r => setTimeout(r, 3000));
    return { success: true };
  } catch (err) {
    console.error('[Jackett] removeIndexer:', err.message);
    throw new Error(`Suppression impossible: ${err.message}`);
  }
}

// ==================== ACCOUNT MANAGEMENT ====================
export async function addAccount(userId, trackerType, username, password) {
  const encryptedPw = encrypt(password);
  const { rows } = await pool.query(
    `INSERT INTO tracker_accounts (user_id, tracker_type, username, password_encrypted, status)
     VALUES ($1, $2, $3, $4, 'pending')
     ON CONFLICT ON CONSTRAINT tracker_accounts_user_id_tracker_type_key DO UPDATE SET username=$3, password_encrypted=$4, status='pending'
     RETURNING id, tracker_type, username, status, created_at`,
    [userId, trackerType, username, encryptedPw]
  );
  return rows[0];
}

export async function getAccounts(userId) {
  const { rows } = await pool.query(
    `SELECT id, tracker_type, username, status, ratio, last_check, extra_data, created_at
     FROM tracker_accounts WHERE user_id = $1 ORDER BY tracker_type`,
    [userId]
  );
  return rows;
}

export async function removeAccount(userId, accountId) {
  await pool.query('DELETE FROM tracker_accounts WHERE id = $1 AND user_id = $2', [accountId, userId]);
}

// ==================== YGG LOGIN ====================
export async function loginYGG(userId) {
  const { rows } = await pool.query(
    'SELECT id, username, password_encrypted FROM tracker_accounts WHERE user_id=$1 AND tracker_type=$2',
    [userId, 'ygg']
  );
  if (!rows.length) throw new Error('No YGG account configured');
  const account = rows[0];
  const password = decrypt(account.password_encrypted);
  if (!password) throw new Error('Decryption failed');
  try {
    const loginResp = await axios.post(TRACKERS.ygg.loginUrl,
      new URLSearchParams({ id: account.username, pass: password }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' }, maxRedirects: 0, validateStatus: s => s < 400 || s === 302 }
    );
    const setCookies = loginResp.headers['set-cookie'] || [];
    const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');
    if (!cookieStr || !cookieStr.includes('ygg_')) {
      await pool.query("UPDATE tracker_accounts SET status='error', last_check=NOW() WHERE id=$1", [account.id]);
      throw new Error('Login failed');
    }
    let ratio = null;
    try {
      const profileResp = await axios.get(TRACKERS.ygg.domain + '/user/account', { headers: { Cookie: cookieStr, 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
      const ratioMatch = profileResp.data.match(/Ratio[^<]*<[^>]*>([0-9.]+)/i);
      if (ratioMatch) ratio = parseFloat(ratioMatch[1]);
    } catch {}
    await pool.query("UPDATE tracker_accounts SET cookies=$1, status='active', ratio=$2, last_check=NOW() WHERE id=$3", [cookieStr, ratio, account.id]);
    return { success: true, ratio };
  } catch (err) {
    await pool.query("UPDATE tracker_accounts SET status='error', last_check=NOW() WHERE id=$1", [account.id]);
    throw err;
  }
}

// ==================== SEARCH ====================
export async function searchYGG(userId, query, category = 'all') {
  const { rows } = await pool.query(
    "SELECT cookies FROM tracker_accounts WHERE user_id=$1 AND tracker_type='ygg' AND status='active'", [userId]
  );
  if (!rows.length || !rows[0].cookies) {
    try { await loginYGG(userId); } catch { return []; }
    const r2 = await pool.query("SELECT cookies FROM tracker_accounts WHERE user_id=$1 AND tracker_type='ygg' AND status='active'", [userId]);
    if (!r2.rows.length) return [];
    rows[0] = r2.rows[0];
  }
  const cats = { all: '', movie: '2145', tv: '2184', anime: '2179' };
  try {
    const { data } = await axios.get(TRACKERS.ygg.searchUrl, {
      params: { name: query, do: 'search', order: 'desc', sort: 'seed', ...(cats[category] ? { category: cats[category] } : {}) },
      headers: { Cookie: rows[0].cookies, 'User-Agent': 'Mozilla/5.0' }, timeout: 15000,
    });
    const results = [];
    const regex = /<tr[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>[\s\S]*?<\/tr>/gi;
    let match;
    while ((match = regex.exec(data)) !== null && results.length < 50) {
      const url = match[1]; const title = match[2].trim();
      const seedMatch = match[0].match(/class="[^"]*seed[^"]*"[^>]*>(\d+)/i);
      const sizeMatch = match[0].match(/([\d.]+)\s*(Go|Mo|Ko|GB|MB|TB|To)/i);
      const idMatch = url.match(/\/(\d+)/);
      if (title && idMatch) results.push({
        title, seeders: seedMatch ? parseInt(seedMatch[1]) : 0, size: sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : 'N/A',
        quality: detectQuality(title), language: detectLanguage(title), source: 'YGG',
        downloadUrl: `${TRACKERS.ygg.domain}/engine/download_torrent?id=${idMatch[1]}`,
        pageUrl: url.startsWith('http') ? url : TRACKERS.ygg.domain + url, needsCookie: true,
      });
    }
    return results.sort((a, b) => b.seeders - a.seeders);
  } catch { return []; }
}

export async function searchTorrent9(query) {
  try {
    const { data } = await axios.get(`${TRACKERS.torrent9.searchUrl}/${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000,
    });
    const results = [];
    const regex = /<a[^>]*href="(\/torrent[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = regex.exec(data)) !== null && results.length < 30) {
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      if (!title || title.length < 5) continue;
      const seedMatch = data.substring(match.index, match.index + 500).match(/seed[^>]*>(\d+)/i);
      const sizeMatch = data.substring(match.index, match.index + 500).match(/([\d.]+)\s*(Go|Mo|GB|MB)/i);
      results.push({ title, seeders: seedMatch ? parseInt(seedMatch[1]) : 0, size: sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : 'N/A', quality: detectQuality(title), language: detectLanguage(title), source: 'Torrent9', pageUrl: TRACKERS.torrent9.domain + match[1] });
    }
    return results.sort((a, b) => b.seeders - a.seeders);
  } catch { return []; }
}

async function searchJackettInternal(query, category) {
  try {
    const cats = { movie: [2000, 2010, 2020, 2030, 2040, 2045, 2050], tv: [5000, 5010, 5020, 5030, 5040, 5045], all: [] };
    const { data } = await axios.get(JACKETT_URL + '/api/v2.0/indexers/all/results', {
      params: { apikey: JACKETT_KEY, Query: query, 'Category[]': cats[category] || cats.all },
      timeout: 30000,
    });
    return (data.Results || []).map(item => ({
      title: item.Title || '', seeders: item.Seeders || 0,
      leechers: item.Peers ? item.Peers - (item.Seeders || 0) : 0,
      size: formatSize(item.Size || 0), sizeBytes: item.Size || 0,
      quality: detectQuality(item.Title || ''), language: detectLanguage(item.Title || ''),
      source: item.Tracker || 'Jackett', magnet: item.MagnetUri || null,
      downloadUrl: item.Link || null, pageUrl: item.Details || item.Comments || null,
    })).sort((a, b) => b.seeders - a.seeders);
  } catch (err) { console.error('[Jackett]', err.message); return []; }
}

export async function searchAllTrackers(userId, query, category) {
  const results = { jackett: [], ygg: [], torrent9: [] };
  await Promise.allSettled([
    searchJackettInternal(query, category).then(r => { results.jackett = r; }),
    searchYGG(userId, query, category).then(r => { results.ygg = r; }),
    searchTorrent9(query).then(r => { results.torrent9 = r; }),
  ]);
  const all = [...results.jackett, ...results.ygg, ...results.torrent9].sort((a, b) => b.seeders - a.seeders);
  return { results: all, sources: { jackett: results.jackett.length, ygg: results.ygg.length, torrent9: results.torrent9.length } };
}

export async function downloadYGGTorrent(userId, downloadUrl) {
  const { rows } = await pool.query("SELECT cookies FROM tracker_accounts WHERE user_id=$1 AND tracker_type='ygg' AND status='active'", [userId]);
  if (!rows.length) throw new Error('No active YGG session');
  const resp = await axios.get(downloadUrl, { headers: { Cookie: rows[0].cookies, 'User-Agent': 'Mozilla/5.0' }, responseType: 'arraybuffer', timeout: 15000 });
  return resp.data;
}

function formatSize(bytes) {
  if (!bytes) return 'N/A';
  if (bytes >= 1024**3) return (bytes / 1024**3).toFixed(1) + ' GB';
  if (bytes >= 1024**2) return (bytes / 1024**2).toFixed(0) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

function detectLanguage(title) {
  const t = title.toUpperCase();
  if (/\bMULTI\b/.test(t)) return 'MULTI';
  if (/\bTRUEFRENCH\b|\bFRENCH\b|\b(VFF|VFQ|VF2|VFI)\b/.test(t)) return 'VF';
  if (/\bVOSTFR\b|\bSUBFRENCH\b/.test(t)) return 'VOSTFR';
  if (/\bVF\b/.test(t)) return 'VF';
  return 'VO';
}

function detectQuality(title) {
  const t = title.toUpperCase();
  if (/\b4K\b|\b2160P?\b|\bUHD\b/.test(t)) return '4K';
  if (/\b1080P?\b|\bFULLHD\b/.test(t)) return '1080p';
  if (/\b720P?\b|\bHD\b/.test(t)) return '720p';
  if (/\bHDRIP\b|\bBDRIP\b|\bBLURAY\b|\bWEBRIP\b|\bWEB-?DL\b/.test(t)) return '1080p';
  return 'Unknown';
}

export default { addAccount, getAccounts, removeAccount, loginYGG, searchYGG, searchTorrent9, searchAllTrackers, downloadYGGTorrent, getJackettIndexers, getAvailableJackettIndexers, addJackettIndexer, removeJackettIndexer, TRACKERS };
