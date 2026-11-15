import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { seenStore } from '@ab/client-core';

// «جديد» on reports this phone has not opened (docs/50 §6, on the device): @ab/client-core's
// store over AsyncStorage. Opening a report marks it at once on every screen.

const store = seenStore(AsyncStorage);

/** The report ids opened on this phone; every reader re-renders on a change. */
export const useSeenReports = (): readonly string[] =>
  useSyncExternalStore(store.subscribe, store.current);

export const markReportSeen = (id: string): void => store.mark(id);
