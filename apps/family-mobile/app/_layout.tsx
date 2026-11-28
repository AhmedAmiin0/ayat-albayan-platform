import { CrashScreen } from '@ab/mobile-kit';
// The family app's root (apps/family, docs/50 §7); the staff app's is apps/mobile/app/_layout.tsx.
export { ObservedRootLayout as default } from '@/root';

export const ErrorBoundary = CrashScreen;
