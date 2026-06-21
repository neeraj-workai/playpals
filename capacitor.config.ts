import type { CapacitorConfig } from '@capacitor/cli';

// Per-game identity. When you CLONE this template for a new game, change appId +
// appName here, and the ad unit IDs in src/core/config.ts.
const config: CapacitorConfig = {
  appId: 'com.viralgames.playpals',
  appName: 'PlayPals',
  webDir: 'dist',
  // After `npx cap add android`, add your AdMob App ID to
  // android/app/src/main/AndroidManifest.xml (see README "Ad setup").
};

export default config;
