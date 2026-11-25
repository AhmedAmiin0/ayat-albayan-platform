import { noteRestoredCache } from './boot-mark';
import type { CacheStorage } from './measured-storage.types';

/** The persister reads its one value only on restore: noting that read costs no second read. */
export function measuredStorage(storage: CacheStorage): CacheStorage {
  return {
    getItem: async (key) => {
      const value = await storage.getItem(key);
      noteRestoredCache(value);
      return value;
    },
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
  };
}
