import { vi } from 'vitest';
import type { ConfigRow } from './config-store.types';

/** Tests only: a stored row with the usual metadata (version 1, written by `admin-1`). */
export function configRow(key: string, value: unknown, over: Partial<ConfigRow> = {}): ConfigRow {
  return {
    key,
    value,
    version: 1,
    description: null,
    descriptionSeed: null,
    descriptionEdited: false,
    updatedAt: '2026-10-23T10:00:00.000Z',
    updatedBy: 'admin-1',
    retiredAt: null,
    ...over,
  };
}

/**
 * Tests only: the ConfigStore surface SettingsService and the entry routes use, over `rows` (rev 1).
 * `set` / `describe` resolve; `onChange` keeps the listeners so `fire()` can call them.
 */
export function fakeConfigStore(rows: ConfigRow[] = []) {
  const listeners: (() => void)[] = [];
  const snap = () => Promise.resolve({ rev: 1, rows });
  return {
    fresh: vi.fn(snap),
    snapshot: vi.fn(snap),
    set: vi.fn(async (): Promise<void> => undefined),
    describe: vi.fn(async (): Promise<void> => undefined),
    names: vi.fn(async (): Promise<Map<string, string>> => new Map()),
    invalidate: vi.fn(),
    onChange: vi.fn((l: () => void) => {
      listeners.push(l);
    }),
    fire: () => listeners.forEach((l) => l()),
  };
}
