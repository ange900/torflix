const { createClient } = require('redis');

let client;

async function initRedis() {
  client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  client.on('error', (err) => console.error('Redis error:', err));
  await client.connect();
}

async function getCache(key) {
  if (!client) return null;
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

async function setCache(key, value, ttlSeconds = 3600) {
  if (!client) return;
  await client.setEx(key, ttlSeconds, JSON.stringify(value));
}

async function delCache(key) {
  if (!client) return;
  await client.del(key);
}

function getClient() { return client; }

module.exports = { initRedis, getCache, setCache, delCache, getClient };
