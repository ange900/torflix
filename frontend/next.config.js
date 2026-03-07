/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/stream/:sessionId/status',
        destination: 'http://torflix-backend:4000/api/stream/:sessionId/status',
      },
      {
        source: '/api/stream/:sessionId/video',
        destination: 'http://torflix-backend:4000/api/stream/:sessionId/video',
      },
      {
        source: '/api/stream/:sessionId',
        destination: 'http://torflix-backend:4000/api/stream/:sessionId',
      },
      {
        source: '/api/:path*',
        destination: 'http://torflix-backend:4000/api/:path*',
      },
    ];
  },
};
export default nextConfig;
