import { vi } from 'vitest';
import type { IntegrationConfigRepo, PlainRow, SecretStatus } from './integration-config.repo';

/** Tests only: IntegrationConfigQueries with vi.fn()s; values are obviously fake. */
export function fakeQueries(over: { raw?: Record<string, string>; plain?: PlainRow[]; secrets?: SecretStatus[] } = {}) {
  return {
    rawValues: vi.fn(async () => over.raw ?? {}),
    plainRows: vi.fn(async () => over.plain ?? []),
    secretStatus: vi.fn(async () => over.secrets ?? []),
    writePlain: vi.fn(async () => undefined),
    setSecret: vi.fn(async () => undefined),
    clearSecret: vi.fn(async () => true),
  };
}
export type FakeQueries = ReturnType<typeof fakeQueries>;
export const asQueries = (q: FakeQueries): IntegrationConfigRepo => q as unknown as IntegrationConfigRepo;
