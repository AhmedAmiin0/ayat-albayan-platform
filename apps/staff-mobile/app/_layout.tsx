import { CrashScreen } from '@ab/mobile-kit';
// The staff app's root; the family app's is apps/family-mobile/app/_layout.tsx (docs/50 §7).
export { ObservedRootLayout as default } from '@/core/root';

export const ErrorBoundary = CrashScreen;
