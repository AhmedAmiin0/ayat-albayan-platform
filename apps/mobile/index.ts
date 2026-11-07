// The app's entry (package.json main). The push sync task (docs/43 §5) is defined here, when the
// bundle loads (after the router entry's import, as imports run first): a message push that starts
// the app in the background with no screen (Android, killed) loads this bundle and runs the task.
import { definePushSyncTask } from '@/inbox/thread/local/push-task';
import 'expo-router/entry';

definePushSyncTask();
