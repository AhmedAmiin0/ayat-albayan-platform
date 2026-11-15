import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { settingText, textAt } from './setting-text';

describe('setting words from the registry', () => {
  it('textAt reads a dotted i18n path; an unknown path comes back as written', () => {
    expect(textAt('settings.hints.uploadMaxMb')).toBe(t.settings.hints.uploadMaxMb);
    expect(textAt('config.sections.custom')).toBe(t.config.sections.custom);
    expect(textAt('settings.nope.missing')).toBe('settings.nope.missing');
    expect(textAt('settings.sections')).toBe('settings.sections'); // an object, not a string
  });

  it('a plain setting has a label and its hint', () => {
    expect(settingText('upload_max_mb')).toEqual({ label: t.settings.uploadMaxMb, hint: t.settings.hints.uploadMaxMb });
  });

  it('a nullable number also has its switch words', () => {
    const words = settingText('late_cancel_hours');
    expect(words.label).toBe(t.settings.lateCancelHours);
    expect(words.toggle).toBe(t.settings.lateCancel);
  });

  it('a setting without a hint has no hint key', () => {
    const words = settingText('messaging_enabled');
    expect(words.label).toBe(t.templates.settings.messagingEnabled);
    expect(Object.keys(words)).not.toContain('toggle');
  });
});
