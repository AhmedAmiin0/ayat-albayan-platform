import { describe, expect, it } from 'vitest';
import { bodyExamples, templateProblem } from './template-review';
import { templateRow } from './whatsapp.fakes';

// The reschedule starter (owner 2026-10-18), exactly as migration 460 seeds it: Meta's rules accept it.
const BODY = 'السلام عليكم {{1}}،\nنودّ إعادة جدولة موعد الحلقة التجريبية.\nما الوقت الذي يناسبكم؟';

describe('trial_reschedule passes the submit checks', () => {
  const row = templateRow({ key: 'trial_reschedule', meta_name: 'trial_reschedule', body_ar: BODY, params: ['contact_name'], line: 'chat', footer_ar: null, buttons: [] });

  it('no problem Meta would reject it on', () => {
    expect(templateProblem(row)).toBeNull();
  });

  it('its sample value is a name, not the param’s key', () => {
    expect(bodyExamples(row)).toEqual(['أحمد']);
  });
});
