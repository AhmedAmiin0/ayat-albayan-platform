// One voice note (or video) plays at a time across the app, and every voice note records alike
// (the staff inbox and the student chat on both phones). A subpath, not the kit's index: it loads
// expo-audio, which an app's tests mock with modules that import the index themselves.
export { claimPlayback, ensureAudioMode, releasePlayback } from './playback';
export { voiceOptions } from './voice-options';
