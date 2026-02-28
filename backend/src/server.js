require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');

const authRoutes = require('./routes/auth');
const moviesRoutes = require('./routes/movies');
const searchRoutes = require('./routes/search');
const torrentRoutes = require('./routes/torrents');
const streamRoutes = require('./routes/stream');
const progressRoutes = require('./routes/progress');
const accountsRoutes = require('./routes/accounts');
const { initDB } = require('./models/db');
const { initRedis } = require('./utils/redis');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 4000;

// ── Middleware ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('short'));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'TorFlix API', version: '1.0.0' });
});

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/torrents', torrentRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/accounts', accountsRoutes);

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ── Start ──
async function start() {
  try {
    await initDB();
    console.log('✅ PostgreSQL connected');

    await initRedis();
    console.log('✅ Redis connected');

    server.listen(PORT, () => {
      console.log(`
  ╔══════════════════════════════════════════╗
  ║          TorFlix Backend API             ║
  ║       🎬 http://localhost:${PORT}           ║
  ╚══════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

start();
