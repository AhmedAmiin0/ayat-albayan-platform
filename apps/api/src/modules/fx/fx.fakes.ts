// Test doubles for FxService (not shipped behaviour): no network, no database.
import type { AcademySettings } from '@ab/shared';
import { vi } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import type { FxFetcher, FxSnapshot } from './fx.fetcher';
import type { FxQueries, FxRow } from './fx.queries';
import { FxService } from './fx.service';
import { FxSettings } from './fx.settings';

export const NOW = new Date('2026-10-02T12:00:00Z');
const HOUR = 3_600_000;

export function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * HOUR).toISOString();
}

export function fxRow(over: Partial<FxRow> = {}): FxRow {
  return {
    id: 'r1',
    base: 'SAR',
    quote: 'USD',
    rate: 0.266667,
    provider: 'open.er-api.com',
    provider_updated_at: hoursAgo(5),
    fetched_at: hoursAgo(2),
    ...over,
  };
}

export function snapshot(over: Partial<FxSnapshot> = {}): FxSnapshot {
  return {
    base: 'SAR',
    rates: { SAR: 1, USD: 0.2666, EGP: 12.9 },
    updatedAt: hoursAgo(1),
    provider: 'open.er-api.com',
    ...over,
  };
}

export function fakeFx(settings: Partial<AcademySettings> = {}) {
  const fetcher = { latest: vi.fn<FxFetcher['latest']>().mockResolvedValue(snapshot()) };
  const queries = {
    newest: vi.fn<FxQueries['newest']>().mockResolvedValue(null),
    save: vi.fn<FxQueries['save']>().mockResolvedValue(undefined),
  };
  const service = new FxService(fetcher, queries as unknown as FxQueries, readerOf(FxSettings, settings));
  return { fetcher, queries, service };
}
