import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { seenStore } from '@ab/client-core';

// docs/50 §6: new marks are per device; opening a report clears it at once on every screen.

const store = seenStore(AsyncStorage);

/** The report ids opened on this phone; every reader re-renders on a change. */
export const useSeenReports = (): readonly string[] =>
  useSyncExternalStore(store.subscribe, store.current);

export const markReportSeen = (id: string): void => store.mark(id);
