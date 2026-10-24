import { vi } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import { NumbersConfig } from './numbers.config';
import { numberRow } from './numbers.fakes';
import type { NumbersQueries } from './numbers.queries';
import type { NumbersSecrets } from './numbers.secrets';
import { NumbersSettings } from './numbers.settings';

// Test-only (excluded from the build): a NumbersConfig over a stored source and fake rows (`defaults` =
// each role's default enabled number, `all` = every wa_numbers row).

export function config(source: 'legacy' | 'module', defaults = vi.fn(async () => [numberRow()]), all = vi.fn(async () => [numberRow()])) {
  const queries = { defaults, all } as unknown as NumbersQueries;
  const secrets = { read: vi.fn(async () => ({ access_token: 'token-fake' })) } as unknown as NumbersSecrets;
  return new NumbersConfig(readerOf(NumbersSettings, { comms_source: source }), queries, secrets);
}
