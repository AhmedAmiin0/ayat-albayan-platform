import en from '@ab/shared/i18n/en.json';
import { describe, expect, it, vi } from 'vitest';
import { SETTINGS } from './settings-fixture';
import { settingsForm, settingsUpdate } from './settings-form';

// The UI in English: follow-up hours show as «24, 72» and still save as [24, 72].
vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));

describe('settings form in English', () => {
  it('shows follow-up hours with the English list joiner and reads them back', () => {
    const form = settingsForm(SETTINGS);
    expect(form.followUpHours).toBe('24, 72');
    const result = settingsUpdate(form);
    expect(result.ok && result.value.followUpHours).toEqual([24, 72]);
  });
});
