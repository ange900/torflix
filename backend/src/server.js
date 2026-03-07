import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { initializeDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import authRoutes from './auth/auth.routes.js';
import otaRoutes from './routes/ota.js';
import authTvRoutes from './routes/auth-tv.js';
import moviesRoutes from './routes/movies.routes.js';
import tvRoutes from './routes/tv.routes.js';
import torrentRoutes from './routes/torrent.routes.js';
import streamRoutes from './routes/stream.routes.js';
import playbackRoutes from './routes/playback.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import adminRoutes from './routes/admin.routes.js';
import favoritesRoutes from './routes/favorites.routes.js';
import statsRoutes from './routes/stats.routes.js';
import ratingsRoutes from './routes/ratings.routes.js';
import trackerRoutes from './routes/tracker.routes.js';
import twofaRoutes from './routes/twofa.routes.js';
import homepageRoutes from './routes/homepage.routes.js';
import searchRoutes from './routes/search.routes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","Authorization"], credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes - AVANT le 404 handler
app.use('/api/auth', authRoutes);
app.use('/api/ota', otaRoutes);
app.use('/api/auth/tv', authTvRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/tv', tvRoutes);
app.use('/api/torrents', torrentRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/playback', playbackRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/2fa', twofaRoutes);
app.use('/api/homepage', homepageRoutes);
import watchPartyRoutes from './routes/watchparty.routes.js';
import preferencesRoutes from './routes/preferences.routes.js';
app.use('/api/watch-party', watchPartyRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/search', searchRoutes);

// 404 + error handlers - APRÈS les routes
app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Connecting to Redis...');
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => { const { redisClient } = await import('./config/redis.js'); await redisClient.quit(); process.exit(0); });
process.on('SIGINT', async () => { const { redisClient } = await import('./config/redis.js'); await redisClient.quit(); process.exit(0); });

startServer();
export default app;
