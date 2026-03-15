import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sodeclick.app',
  appName: 'SodeClick',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
