import { CrashScreen } from '@ab/mobile-kit';
// The family app's bottom tabs (owner 2026-11-15): per login, @ab/client-core familyTabs, and the
// child switch sheet over them (owner 2026-11-16).
export { SwitchTabs as default } from '#/switch/index.ts';

export const ErrorBoundary = CrashScreen;
