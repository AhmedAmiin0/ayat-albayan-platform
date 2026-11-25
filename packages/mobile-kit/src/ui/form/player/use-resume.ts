import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { resumeStore, type ResumeMap } from '@ab/client-core';

// One device store shared by the player (it saves) and the recordings list.

const store = resumeStore(AsyncStorage);

/** Every saved stop; a reader re-renders when one changes. */
export const useResumeMap = (): ResumeMap => useSyncExternalStore(store.subscribe, store.current);

export const saveResume = (input: { id: string; position: number; duration: number }): void =>
  store.save(input);
