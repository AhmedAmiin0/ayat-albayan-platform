import { resumeStore, type ResumeMap, type ResumeStorage } from '@ab/client-core';
import { useSyncExternalStore } from 'react';

// «تتابع من حيث توقفت» in this browser: @ab/client-core's store over localStorage, which can be
// missing or throw (a private window): then this visit's stops only.

const local: ResumeStorage = {
  getItem: (key) => Promise.resolve().then(() => window.localStorage.getItem(key)),
  setItem: (key, value) => Promise.resolve().then(() => window.localStorage.setItem(key, value)),
};

const store = resumeStore(local);

export const useResumeMap = (): ResumeMap => useSyncExternalStore(store.subscribe, store.current);

export const saveResume = (input: { id: string; position: number; duration: number }): void =>
  store.save(input);
