import { counted, SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { fill } from '@/features/platform/google-sync/google-format';
import { t } from '@/lib/i18n/i18n';
import { googleChips, integrationChips, sameValue, valuesSummary } from './hub-status';
import { googleStatus, item, settingsWith } from './hub-test-utils';

const H = t.settingsHub;
const summary = (n: number, modified: number, open: number) =>
  [counted(H.valuesCount, n), fill(H.valuesModified, { n: modified }), fill(H.valuesPublic, { n: open })].join(' · ');

describe('valuesSummary («القيم» — N قيمة · M معدَّلة · K عامة)', () => {
  it('the seeded defaults: 29 values, none changed, 8 public', () => {
    expect(valuesSummary({ ...SETTING_DEFAULTS })).toBe(summary(29, 0, 8));
  });

  it('counts only editable values that differ from the default', () => {
    const s = settingsWith({ booking_horizon_weeks: 6, upload_max_mb: 99, messaging_enabled: !SETTING_DEFAULTS.messaging_enabled });
    expect(valuesSummary(s)).toBe(summary(29, 2, 8));
  });

  it('an object value is compared by content, not by identity', () => {
    const contact = { ...SETTING_DEFAULTS.academy_contact };
    expect(valuesSummary(settingsWith({ academy_contact: contact }))).toBe(summary(29, 0, 8));
  });
});

describe('sameValue', () => {
  it('compares scalars, nulls, arrays and objects by content', () => {
    expect(sameValue(1, 1)).toBe(true);
    expect(sameValue(1, '1')).toBe(false);
    expect(sameValue(null, {})).toBe(false);
    expect(sameValue([1, 2], [1, 2])).toBe(true);
    expect(sameValue([1, 2], [2, 1])).toBe(false);
    expect(sameValue([], {})).toBe(false);
    expect(sameValue({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 })).toBe(true);
    expect(sameValue({ a: 1 }, { a: 1, b: undefined })).toBe(true);
    expect(sameValue({ a: 1 }, { a: 2 })).toBe(false);
  });
});

const ALL_SET = [
  item('LIVEKIT_URL', 'livekit', { set: true }),
  item('LIVEKIT_API_KEY', 'livekit', { secret: true, set: true }),
  item('LIVEKIT_API_SECRET', 'livekit', { secret: true, set: true }),
  item('EXPO_API_BASE', 'expo'),
  item('EXPO_ACCESS_TOKEN', 'expo', { secret: true, set: true }),
  item('WEB_PUSH_VAPID_PRIVATE_KEY', 'web_push', { secret: true, set: true }),
  item('FX_API_URL', 'fx', { set: true }),
  item('WA_ACCESS_TOKEN', 'wa_notifications', { secret: true }),
];

describe('integrationChips («التكاملات»)', () => {
  it('every service set: one chip (a WhatsApp gap is not one of the four services)', () => {
    expect(integrationChips(ALL_SET)).toEqual([{ tone: 'ok', glyph: 'fill', label: counted(H.servicesOk, 4) }]);
  });

  it('one service missing is named', () => {
    const items = ALL_SET.map((i) => (i.key === 'FX_API_URL' ? { ...i, set: false } : i));
    expect(integrationChips(items)).toEqual([
      { tone: 'ok', glyph: 'fill', label: counted(H.servicesOk, 3) },
      { tone: 'neutral', glyph: 'hollow', label: fill(H.serviceUnset, { name: t.integrations.groups.fx }) },
    ]);
  });

  it('several missing are counted; a service with no rows is not set up', () => {
    const items = ALL_SET.filter((i) => i.group !== 'fx').map((i) => (i.key === 'LIVEKIT_API_SECRET' ? { ...i, set: false } : i));
    expect(integrationChips(items)).toEqual([
      { tone: 'ok', glyph: 'fill', label: counted(H.servicesOk, 2) },
      { tone: 'neutral', glyph: 'hollow', label: counted(H.servicesUnset, 2) },
    ]);
    expect(integrationChips([])).toEqual([{ tone: 'neutral', glyph: 'hollow', label: counted(H.servicesUnset, 4) }]);
  });
});

describe('googleChips («مزامنة Google»)', () => {
  const sw = t.googleSync.switches;
  const status = t.googleSync.connection.status;

  it('connected in dry run', () => {
    expect(googleChips(googleStatus()).map((c) => c.label)).toEqual([status.connected, t.settingsHub.googleDryRun]);
  });

  it('live, off, and an error', () => {
    expect(googleChips(googleStatus({ settings: { enabled: true, mode: 'live', window_days: 60 } }))[1]?.label).toBe(sw.live);
    const off = googleChips(googleStatus({ settings: { enabled: false, mode: 'live', window_days: 60 } }));
    expect(off[1]).toEqual({ tone: 'neutral', glyph: 'struck', label: H.googleOff });
    const error = googleStatus({ connection: { status: 'error', email: null, scopes: [], connected_at: null, last_error: 'x' } });
    expect(googleChips(error)[0]).toEqual({ tone: 'bad', glyph: 'struck', label: status.error });
  });

  it('the OAuth client not set up says only that', () => {
    expect(googleChips(googleStatus({ configured: false }))).toEqual([{ tone: 'neutral', glyph: 'hollow', label: H.googleNotConfigured }]);
  });
});
