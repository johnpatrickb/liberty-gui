import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.liberty.app',
  appName: 'liberty-gui',
  webDir: 'dist',
  ios: {
    "contentInset": "always"
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false,
    }
  }
};

export default config;
