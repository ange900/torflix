import http from 'http';
import axios from 'axios';

const JACKETT_URL = process.env.JACKETT_URL || 'http://jackett:9117';
const JACKETT_KEY = process.env.JACKETT_API_KEY || '1gu7miltp8zwwoxakpyho2qelhsna0vg';
const CONFIG_DIR = '/config/Jackett/Indexers';
const DEF_DIR = '/app/Jackett/Definitions';

// ── Docker socket REST API (sans CLI) ─────────────────────────────
function dockerRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      socketPath: '/var/run/docker.sock',
      method, path,
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getJackettContainerId() {
  const { data } = await dockerRequest('GET', '/containers/json?all=1');
  const c = data.find(c => c.Names?.some(n => n.includes('jackett')));
  if (!c) throw new Error('Container jackett introuvable');
  return c.Id;
}

async function execInJackett(cmd) {
  const id = await getJackettContainerId();

  // Créer l'exec
  const { data: execData } = await dockerRequest('POST', `/containers/${id}/exec`, {
    AttachStdout: true, AttachStderr: true,
    Cmd: ['sh', '-c', cmd],
  });

  // Lancer et récupérer l'output
  return new Promise((resolve, reject) => {
    const req = http.request({
      socketPath: '/var/run/docker.sock',
      method: 'POST',
      path: `/exec/${execData.Id}/start`,
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        // Docker multiplexe stdout/stderr avec un header 8 bytes
        const buf = Buffer.concat(chunks);
        let result = '';
        let offset = 0;
        while (offset < buf.length) {
          if (offset + 8 > buf.length) break;
          const size = buf.readUInt32BE(offset + 4);
          result += buf.slice(offset + 8, offset + 8 + size).toString();
          offset += 8 + size;
        }
        resolve(result.trim() || buf.toString().replace(/[\x00-\x08]/g, '').trim());
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ Detach: false, Tty: false }));
    req.end();
  });
}

async function restartJackett() {
  const id = await getJackettContainerId();
  await dockerRequest('POST', `/containers/${id}/restart?t=3`);
}

// ── API publique ──────────────────────────────────────────────────

export async function getJackettIndexers() {
  try {
    const files = await execInJackett(`ls ${CONFIG_DIR}`);
    const configured = files.split('\n')
      .map(f => f.trim())
      .filter(f => f.endsWith('.json') && !f.endsWith('.bak'))
      .map(f => f.replace('.json', ''));

    const results = await Promise.all(configured.map(async id => {
      try {
        const { data } = await axios.get(`${JACKETT_URL}/api/v2.0/indexers/${id}/results`, {
          params: { apikey: JACKETT_KEY, Query: 'test', Limit: 1 },
          timeout: 8000,
        });
        return { id, status: 'ok', results: data.Results?.length || 0 };
      } catch {
        return { id, status: 'error', results: 0 };
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
    const output = await execInJackett(
      `find ${DEF_DIR} -name "*.yml" | xargs grep -l "type: public" 2>/dev/null`
    );
    const configuredRaw = await execInJackett(`ls ${CONFIG_DIR}`);
    const configured = configuredRaw.split('\n')
      .map(f => f.trim())
      .filter(f => f.endsWith('.json') && !f.endsWith('.bak'))
      .map(f => f.replace('.json', ''));

    return output.split('\n')
      .filter(Boolean)
      .map(f => {
        const id = f.split('/').pop().replace('.yml', '').trim();
        return { id, configured: configured.includes(id) };
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch (err) {
    console.error('[Jackett] getAvailable:', err.message);
    return [];
  }
}

export async function addJackettIndexer(indexerId) {
  try {
    let sitelink = '';
    try {
      const yml = await execInJackett(`cat ${DEF_DIR}/${indexerId}.yml`);
      const m = yml.match(/links:\s*\n\s*-\s*(.+)/);
      if (m) sitelink = m[1].trim();
    } catch {}

    const json = JSON.stringify([
      { id: 'sitelink', type: 'inputstring', name: 'Site Link', value: sitelink },
      { id: 'cookieheader', type: 'hiddendata', name: 'CookieHeader', value: '' },
      { id: 'lasterror', type: 'hiddendata', name: 'LastError', value: null },
      { id: 'tags', type: 'inputtags', name: 'Tags', value: '' }
    ]);

    // Écrire via tee (évite les problèmes de quotes)
    await execInJackett(
      `printf '%s' '${json.replace(/'/g, "'\\''")}' > ${CONFIG_DIR}/${indexerId}.json`
    );

    await restartJackett();
    await new Promise(r => setTimeout(r, 3000));
    return { success: true, id: indexerId };
  } catch (err) {
    throw new Error(`Ajout impossible: ${err.message}`);
  }
}

export async function removeJackettIndexer(indexerId) {
  try {
    await execInJackett(`rm -f ${CONFIG_DIR}/${indexerId}.json ${CONFIG_DIR}/${indexerId}.json.bak`);
    await restartJackett();
    await new Promise(r => setTimeout(r, 3000));
    return { success: true };
  } catch (err) {
    throw new Error(`Suppression impossible: ${err.message}`);
  }
}
