import { subscribeOnline, type SubscribeResume } from '@ab/client-core';
import { AppState, type AppStateStatus } from 'react-native';

const isActive = (state: AppStateStatus): boolean => state === 'active';

/** Back online, or the app back in the foreground: a failed draft save may go through now. */
export const subscribeResume: SubscribeResume = (listener) => {
  const offline = subscribeOnline(listener);
  const app = AppState.addEventListener('change', (state) => {
    if (isActive(state)) listener();
  });
  return () => {
    offline();
    app.remove();
  };
};
