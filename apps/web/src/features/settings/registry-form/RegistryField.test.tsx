import { SETTING_DEFAULTS } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { SettingsViewContext } from '@/components/settings/settings-view';
import { RegistryField } from './RegistryField';
import { isDefault, isDirty, resetPatch } from './settings-dirty';
import { settingsForm, type SettingsForm } from './settings-form';
import type { SettingsFormState } from './use-settings-form';
import type { SettingKey, SettingMeta } from '@ab/shared';

const saved = settingsForm({ ...SETTING_DEFAULTS, activity_retention_days: 30 });

/** A RegistryField on a real in-memory form (the page's hook minus the network). */
function Harness({ k, meta = {} }: { k: SettingKey; meta?: Record<string, SettingMeta> }) {
  const [form, setForm] = useState<SettingsForm>(saved);
  const set = (p: SettingsForm) => setForm((f) => ({ ...f, ...p }));
  const state: SettingsFormState = {
    form, initial: saved, errors: {}, set, submit: () => undefined, changed: [], saving: false, failed: false,
    dirty: (key) => isDirty(key, form, saved), atDefault: (key) => isDefault(key, form), reset: (key) => set(resetPatch(key)),
  };
  return (
    <SettingsViewContext.Provider value={{ query: '', meta }}>
      <RegistryField settingKey={k} state={state} />
    </SettingsViewContext.Provider>
  );
}

describe('RegistryField extras', () => {
  it('a number marks itself edited and resets to its default', () => {
    render(<Harness k="activity_retention_days" />);
    const input = screen.getByLabelText(t.config.activityRetentionDays) as HTMLInputElement;
    expect(input.value).toBe('30');
    expect(screen.queryByText(t.config.dirty)).toBeNull();
    fireEvent.change(input, { target: { value: '45' } });
    expect(screen.getByText(t.config.dirty)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.config.resetFor.replace('{name}', t.config.activityRetentionDays) }));
    expect(input.value).toBe('180');
    expect(screen.getByText(t.config.dirty)).toBeTruthy(); // 180 differs from the saved 30
    expect(screen.queryByRole('button', { name: new RegExp(t.config.reset) })).toBeNull(); // already the default
  });

  it('no reset button while the value is already the default', () => {
    render(<Harness k="booking_horizon_weeks" />);
    expect(screen.queryByRole('button', { name: new RegExp(t.config.reset) })).toBeNull();
  });

  it('a nullable number keeps its switch: off means keep forever, on shows the starting days', () => {
    render(<Harness k="recording_retention_days" />);
    const sw = screen.getByRole('checkbox', { name: t.config.recordingRetentionOn }) as HTMLInputElement;
    const days = screen.getByLabelText(t.config.recordingRetentionDays) as HTMLInputElement;
    expect(sw.checked).toBe(false);
    expect(days.disabled).toBe(true);
    fireEvent.click(sw);
    expect(days.disabled).toBe(false);
    expect(days.value).toBe('90');
    expect(screen.getByText(t.config.dirty)).toBeTruthy();
  });

  it('an object setting shows one box per field and edits them', () => {
    render(<Harness k="academy_contact" />);
    expect((screen.getByLabelText(t.config.fields.site) as HTMLInputElement).value).toBe('ayatalbayan.com');
    fireEvent.change(screen.getByLabelText(t.config.fields.email), { target: { value: 'a@b.co' } });
    expect(screen.getByText(t.config.dirty)).toBeTruthy();
  });

  it('says who changed it last and when', () => {
    const meta = { booking_horizon_weeks: { updatedAt: '2026-10-05T10:00:00Z', updatedBy: 'u1', updatedByName: 'منى' } };
    render(<Harness k="booking_horizon_weeks" meta={meta} />);
    expect(screen.getByText(/منى/)).toBeTruthy();
  });
});
