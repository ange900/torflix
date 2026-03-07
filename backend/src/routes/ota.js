import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
const BUNDLES_DIR = '/var/www/torflix-ota';
const VERSION_FILE = path.join(BUNDLES_DIR, 'version.json');

if (!fs.existsSync(BUNDLES_DIR)) fs.mkdirSync(BUNDLES_DIR, { recursive: true });

function getVersion() {
  try { return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8')); }
  catch { return { version: '1.0.0', buildNumber: 0, publishedAt: null, changelog: '' }; }
}

router.get('/version', (req, res) => {
  res.json({
    ...getVersion(),
    androidBundle: 'https://torflix.xyz/api/ota/bundle/android',
    iosBundle: 'https://torflix.xyz/api/ota/bundle/ios',
  });
});

router.get('/bundle/android', (req, res) => {
  const file = path.join(BUNDLES_DIR, 'index.android.bundle');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Bundle introuvable' });
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(file);
});

router.get('/bundle/ios', (req, res) => {
  const file = path.join(BUNDLES_DIR, 'main.jsbundle');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Bundle introuvable' });
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(file);
});

router.post('/publish', (req, res) => {
  const { secret, version, changelog } = req.body;
  if (secret !== process.env.OTA_SECRET) return res.status(401).json({ error: 'Non autorisé' });
  const data = { version, buildNumber: (getVersion().buildNumber || 0) + 1, publishedAt: new Date().toISOString(), changelog: changelog || '' };
  fs.writeFileSync(VERSION_FILE, JSON.stringify(data, null, 2));
  res.json({ status: 'ok', ...data });
});

export default router;
