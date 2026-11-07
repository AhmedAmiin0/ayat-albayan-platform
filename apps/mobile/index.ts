// The app's entry (package.json main). The push sync task (docs/43 §5) is defined first, at
// module scope: a message push that starts the app in the background with no screen (Android,
// killed) loads this bundle and runs the task; the router entry then registers the app as before.
import { definePushSyncTask } from '@/inbox/thread/local/push-task';
import 'expo-router/entry';

definePushSyncTask();
