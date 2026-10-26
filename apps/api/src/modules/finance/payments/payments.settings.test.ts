import { SETTING_DEFAULTS, uploadMaxBytes } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { PaymentsSettings } from './payments.settings';

/** What PaymentsController read before the reader existed: the reader lists exactly these. */
const BEFORE = ['academy_timezone', 'upload_max_mb'] as const;

describe('PaymentsSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults', async () => {
    const values = await readerOf(PaymentsSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored zone and upload limit', async () => {
    const values = await readerOf(PaymentsSettings, { academy_timezone: 'Africa/Cairo', upload_max_mb: 4 }).read();
    expect(values).toEqual({ academy_timezone: 'Africa/Cairo', upload_max_mb: 4 });
    expect(uploadMaxBytes(values)).toBe(4 * 1024 * 1024);
  });
});
