import { afterEach, describe, expect, it, vi } from 'vitest';
import { numbersOverlay, setNumbersOverlay } from '../../common/integrations/numbers-overlay';
import { readerOf } from '../../common/settings/settings.fakes';
import { NumbersConfig } from './numbers.config';
import { numberRow } from './numbers.fakes';
import type { NumbersQueries } from './numbers.queries';
import type { NumbersSecrets } from './numbers.secrets';
import { NumbersSettings } from './numbers.settings';

function config(source: 'legacy' | 'module', defaults = vi.fn(async () => [numberRow()])) {
  const queries = { defaults } as unknown as NumbersQueries;
  const secrets = { read: vi.fn(async () => ({ access_token: 'token-fake' })) } as unknown as NumbersSecrets;
  return new NumbersConfig(readerOf(NumbersSettings, { comms_source: source }), queries, secrets);
}

afterEach(() => setNumbersOverlay(null));

describe('NumbersConfig', () => {
  it('legacy clears the overlay and never reads the numbers (today\'s config untouched)', async () => {
    setNumbersOverlay({ values: { WA_PHONE_NUMBER_ID: 'x' }, numberIds: {} });
    const defaults = vi.fn(async () => [numberRow()]);
    expect(await config('legacy', defaults).refresh()).toBe(true);
    expect(numbersOverlay()).toBeNull();
    expect(defaults).not.toHaveBeenCalled();
  });

  it('module sets each role\'s default number as the line keys', async () => {
    await config('module').refresh();
    expect(numbersOverlay()?.values).toMatchObject({ WA_PHONE_NUMBER_ID: '1000000001', WA_ACCESS_TOKEN: 'token-fake', WA_CHAT_PHONE_NUMBER_ID: '' });
    expect(numbersOverlay()?.numberIds).toEqual({ notifications: numberRow().id });
  });

  it('a failed load keeps the current state and never throws', async () => {
    const prev = { values: { WA_PHONE_NUMBER_ID: 'kept' }, numberIds: {} };
    setNumbersOverlay(prev);
    const c = config('module', vi.fn(async () => Promise.reject(new Error('db down'))));
    expect(await c.refresh()).toBe(false);
    expect(numbersOverlay()?.values).toEqual(prev.values);
  });

  it('onModuleInit reads nothing when the database config is off (vitest: INTEGRATION_CONFIG_FROM_DB=false)', async () => {
    const defaults = vi.fn(async () => [numberRow()]);
    const c = config('module', defaults);
    vi.stubEnv('INTEGRATION_CONFIG_FROM_DB', 'false');
    await c.onModuleInit();
    c.onModuleDestroy();
    vi.unstubAllEnvs();
    expect(defaults).not.toHaveBeenCalled();
    expect(numbersOverlay()).toBeNull();
  });
});
