// The family app's entry (package.json main): it names its audience for the shared session gate
// (@ab/mobile-kit: guardians and students stay signed in, staff get «wrongApp»), then the router.
import { setAudience } from '@ab/mobile-kit';
import 'expo-router/entry';

setAudience('family');
