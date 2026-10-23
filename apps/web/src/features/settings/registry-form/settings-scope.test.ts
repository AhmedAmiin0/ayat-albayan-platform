import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { settingsForm, settingsUpdate } from './settings-form';
import { afterSave, changedKeys, fieldsOf, movedKeys, refreshed } from './settings-scope';

const base = settingsForm(SETTING_DEFAULTS);

describe('settings-scope (a page sends only what it changed)', () => {
  it('changedKeys: only the page’s keys that differ from the baseline', () => {
    const form = { ...base, bookingHorizonWeeks: '9', uploadMaxMb: '3' };
    expect(changedKeys(['booking_horizon_weeks', 'follow_up_hours'], { form, initial: base })).toEqual(['booking_horizon_weeks']);
  });

  it('settingsUpdate scoped to the changed keys builds a body with those fields only', () => {
    const result = settingsUpdate({ ...base, bookingHorizonWeeks: '9' }, ['booking_horizon_weeks']);
    expect(result).toEqual({ ok: true, value: { bookingHorizonWeeks: 9 } });
  });

  it('movedKeys: by row key or camelCase field; a whole-settings answer moves nothing', () => {
    const sent = ['booking_horizon_weeks', 'follow_up_hours'] as const;
    expect(movedKeys({ saved: [], moved: ['followUpHours'] }, sent)).toEqual(['follow_up_hours']);
    expect(movedKeys({ saved: [], moved: ['booking_horizon_weeks'] }, sent)).toEqual(['booking_horizon_weeks']);
    expect(movedKeys(SETTING_DEFAULTS, sent)).toEqual([]);
  });

  it('afterSave: what was sent becomes the baseline of the written keys; a later edit stays dirty', () => {
    const sentForm = { ...base, bookingHorizonWeeks: '9' };
    const pair = afterSave({ form: { ...sentForm, bookingHorizonWeeks: '10' }, initial: base }, ['booking_horizon_weeks'], sentForm);
    expect(pair.initial['bookingHorizonWeeks']).toBe('9');
    expect(pair.form['bookingHorizonWeeks']).toBe('10');
  });

  it('refreshed: clean keys take the fresh value, dirty ones keep the edit', () => {
    const fresh = settingsForm({ ...SETTING_DEFAULTS, booking_horizon_weeks: 2, upload_max_mb: 5 });
    const pair = refreshed({ form: { ...base, bookingHorizonWeeks: '9' }, initial: base }, fresh);
    expect(pair.form['bookingHorizonWeeks']).toBe('9');
    expect(pair.form['uploadMaxMb']).toBe('5');
    expect(pair.initial['uploadMaxMb']).toBe('5');
    expect(fieldsOf(['upload_max_mb'], fresh)).toEqual({ uploadMaxMb: '5' });
  });
});
