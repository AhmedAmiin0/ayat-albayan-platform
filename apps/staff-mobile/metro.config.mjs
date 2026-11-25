import { metroConfig } from '@ab/config/metro';

// Expo awaits a promised config; it loads this file synchronously, so no top-level await.
export default metroConfig(import.meta.dirname);
