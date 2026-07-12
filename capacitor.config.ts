import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.btm.portal',
  appName: 'BTM Mobile App',
  webDir: 'out',
  server: {
    url: 'https://portal-internal-omega.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#003D79'
  }
};

export default config;