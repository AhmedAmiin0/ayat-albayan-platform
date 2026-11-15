// The family app's entry (package.json main): it names its audience for the shared session gate
// (@ab/mobile-kit: guardians and students stay signed in, staff get «wrongApp»), then the router.
import { setAudience } from '@ab/mobile-kit';
import * as SplashScreen from 'expo-splash-screen';
import 'expo-router/entry';

setAudience('family');
// The startup cover hides it once its mark is drawn (root/family-brand.ts), so the hand-off from
// the native splash shows no frame without the mark.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
