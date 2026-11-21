// The family app's entry (package.json main): it names its audience for the shared session gate
// (@ab/mobile-kit: guardians and students stay signed in, staff get «wrongApp»), then the router.
import { installMobileErrorReporting, setAudience } from '@ab/mobile-kit';
import 'expo-router/entry';

setAudience('family');
// Optional error tracker: nothing at all unless the build sets EXPO_PUBLIC_SENTRY_DSN.
installMobileErrorReporting('family-mobile');
