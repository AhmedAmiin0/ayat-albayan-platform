import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { settingsForm, settingsUpdate } from '../messaging/settings-form';

const form = settingsForm(SETTING_DEFAULTS);
const sent = (f: typeof form) => {
  const r = settingsUpdate(f);
  return r.ok ? r.value : r.errors;
};

describe('settings form: the custom-config settings', () => {
  it('the defaults round-trip: contact kept, no consent notice, recordings kept forever', () => {
    expect(form['recordingRetentionDaysOn']).toBe(false);
    expect(sent(form)).toMatchObject({
      academyContact: { site: 'ayatalbayan.com', whatsapp: '+966566101447' },
      recordingConsentNotice: null,
      recordingRetentionDays: null,
      activityRetentionDays: 180,
      defaultLessonMinutes: 45,
    });
  });

  it('recording retention ON sends its days; 0 is refused', () => {
    const on = { ...form, recordingRetentionDaysOn: true, recordingRetentionDays: '30' };
    expect(sent(on)).toMatchObject({ recordingRetentionDays: 30 });
    expect(sent({ ...on, recordingRetentionDays: '0' })).toEqual({ recordingRetentionDays: t.settings.invalid });
  });

  it('contact: empty boxes are left out; a bad number or email is refused on the setting', () => {
    const f = { ...form, 'academyContact.email': ' a@b.co ', 'academyContact.site': '' };
    expect(sent(f)).toMatchObject({ academyContact: { whatsapp: '+966566101447', email: 'a@b.co' } });
    expect(sent({ ...f, 'academyContact.whatsapp': '0566101447' })).toEqual({ academyContact: t.settings.invalidText });
    expect(sent({ ...f, 'academyContact.email': 'nope' })).toEqual({ academyContact: t.settings.invalidText });
  });

  it('the consent notice: empty boxes are null (no notice), a filled one is sent', () => {
    expect(sent({ ...form, 'recordingConsentNotice.ar': 'نص', 'recordingConsentNotice.en': '' })).toMatchObject({
      recordingConsentNotice: { ar: 'نص' },
    });
  });
});
