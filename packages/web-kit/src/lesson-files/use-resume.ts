import { resumeStore, type ResumeMap, type ResumeStorage } from '@ab/client-core';
import { useSyncExternalStore } from 'react';

// localStorage may be missing or throw (private window): then only this visit's stops.

const local: ResumeStorage = {
  getItem: (key) => Promise.resolve().then(() => window.localStorage.getItem(key)),
  setItem: (key, value) => Promise.resolve().then(() => window.localStorage.setItem(key, value)),
};

const store = resumeStore(local);

export const useResumeMap = (): ResumeMap => useSyncExternalStore(store.subscribe, store.current);

export const saveResume = (input: { id: string; position: number; duration: number }): void =>
  store.save(input);
