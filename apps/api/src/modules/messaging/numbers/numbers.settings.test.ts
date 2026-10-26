import { describe, expect, it } from 'vitest';
import { fakeSettings, readerOf } from '../../../common/settings/settings.fakes';
import { NumbersSettings } from './numbers.settings';

describe('NumbersSettings', () => {
  it('reads exactly comms_source, legacy by default', async () => {
    const values = await readerOf(NumbersSettings).read();
    expect(values).toEqual({ comms_source: 'legacy' });
  });

  it('writeSource writes comms_source only (never messaging_enabled)', async () => {
    const store = fakeSettings();
    await new NumbersSettings(store).writeSource('module', 'actor');
    expect(store.writeSwitch).toHaveBeenCalledWith('comms_source', 'module', 'actor');
  });
});
