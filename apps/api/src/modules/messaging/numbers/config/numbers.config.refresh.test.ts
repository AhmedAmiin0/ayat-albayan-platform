import { afterEach, describe, expect, it, vi } from 'vitest';
import { numbersOverlay, setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { config } from './numbers.config.fakes';
import { numberRow } from '@/modules/messaging/numbers/numbers.fakes';

afterEach(() => setNumbersOverlay(null));

describe('NumbersConfig.refresh: the order of loads and a failed boot', () => {
  it('module mode with nothing loaded yet fails closed: every line blank, nothing stamped', async () => {
    const c = config('module', vi.fn(async () => Promise.reject(new Error('vault down'))));
    expect(await c.refresh()).toBe(false);
    expect(numbersOverlay()?.values).toMatchObject({ WA_PHONE_NUMBER_ID: '', WA_ACCESS_TOKEN: '', WA_CHAT_PHONE_NUMBER_ID: '' });
    expect(numbersOverlay()?.numberIds).toEqual({});
  });

  it('a slow older load never overwrites a newer one', async () => {
    let release: (rows: ReturnType<typeof numberRow>[]) => void = () => undefined;
    const slow = new Promise<ReturnType<typeof numberRow>[]>((resolve) => (release = resolve));
    const defaults = vi.fn().mockReturnValueOnce(slow).mockResolvedValueOnce([numberRow({ phone_number_id: '1000000002' })]);
    const c = config('module', defaults);
    const older = c.refresh();
    await c.refresh();
    release([numberRow({ phone_number_id: '1000000001' })]);
    await older;
    expect(numbersOverlay()?.values.WA_PHONE_NUMBER_ID).toBe('1000000002');
  });

  it('reload() after a write reads nothing while the database config is off (docs/25 §7)', async () => {
    const defaults = vi.fn(async () => [numberRow()]);
    expect(await config('module', defaults).reload()).toBe(true);
    expect(defaults).not.toHaveBeenCalled();
    expect(numbersOverlay()).toBeNull();
  });
});
