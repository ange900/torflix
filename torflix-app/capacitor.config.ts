import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.torflix.app',
  appName: 'TorFlix',
  webDir: 'dist',
  server: {
    url: 'https://torfix.xyz',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
