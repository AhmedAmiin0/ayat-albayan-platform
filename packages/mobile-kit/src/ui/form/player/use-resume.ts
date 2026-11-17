import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { resumeStore, type ResumeMap } from '@ab/client-core';

// «تتابع من حيث توقفت» on this phone: @ab/client-core's store over AsyncStorage, shared by the
// player (it saves) and the recordings list («توقفت عند 12:40»).

const store = resumeStore(AsyncStorage);

/** Every saved stop; a reader re-renders when one changes. */
export const useResumeMap = (): ResumeMap => useSyncExternalStore(store.subscribe, store.current);

export const saveResume = (input: { id: string; position: number; duration: number }): void =>
  store.save(input);
