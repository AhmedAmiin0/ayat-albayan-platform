// One voice note (or video) plays at a time across the app, and every voice note records alike:
// the inbox and the student chat share these (now in @ab/mobile-kit, shared with the family app).
export {
  claimPlayback,
  ensureAudioMode,
  releasePlayback,
  voiceOptions,
} from '@ab/mobile-kit/lib/audio';
