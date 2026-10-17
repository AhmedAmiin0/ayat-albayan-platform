import { describe, expect, it } from 'vitest';
import { lineTone, webhookState, type LineField } from './line-status';

const ACT = { tone: 'act', glyph: 'struck', known: true };
const OK = { tone: 'ok', glyph: 'fill', known: true };
const HALF = { tone: 'neutral', glyph: 'half', known: true };
const HOLLOW = { tone: 'neutral', glyph: 'hollow', known: true };

const TABLE: readonly (readonly [LineField, string, object])[] = [
  ['status', 'CONNECTED', OK],
  ['status', 'PENDING', HALF],
  ['status', 'DISCONNECTED', ACT],
  ['status', 'FLAGGED', ACT],
  ['status', 'RESTRICTED', ACT],
  ['status', 'UNVERIFIED', ACT],
  ['status', 'DELETED', ACT],
  ['quality_rating', 'GREEN', OK],
  ['quality_rating', 'YELLOW', HALF],
  ['quality_rating', 'RED', ACT],
  ['quality_rating', 'NONE', HALF],
  ['name_status', 'APPROVED', OK],
  ['name_status', 'AVAILABLE_WITHOUT_REVIEW', OK],
  ['name_status', 'PENDING_REVIEW', HALF],
  ['name_status', 'NONE', HALF],
  ['name_status', 'DECLINED', ACT],
  ['name_status', 'EXPIRED', ACT],
  ['code_verification_status', 'VERIFIED', OK],
  ['code_verification_status', 'NOT_VERIFIED', HOLLOW],
  ['code_verification_status', 'EXPIRED', HOLLOW],
];

describe('lineTone (docs/12 §13.10)', () => {
  it.each(TABLE)('%s %s', (field, value, expected) => {
    expect(lineTone(field, value)).toEqual(expected);
  });

  it('act only where the admin must act: the same word elsewhere is not saffron', () => {
    const acts = TABLE.filter(([, , v]) => v === ACT).map(([f, w]) => `${f}:${w}`);
    expect(acts).toEqual([
      'status:DISCONNECTED',
      'status:FLAGGED',
      'status:RESTRICTED',
      'status:UNVERIFIED',
      'status:DELETED',
      'quality_rating:RED',
      'name_status:DECLINED',
      'name_status:EXPIRED',
    ]);
    expect(lineTone('code_verification_status', 'EXPIRED').tone).toBe('neutral');
    expect(lineTone('quality_rating', 'DECLINED').tone).not.toBe('act');
  });

  it('an unknown word falls back to neutral-hollow, marked unknown (shown raw)', () => {
    expect(lineTone('status', 'BANANA')).toEqual({ tone: 'neutral', glyph: 'hollow', known: false });
    expect(lineTone('quality_rating', 'UNKNOWN').known).toBe(false);
  });

  it('reads Meta words case-insensitively', () => {
    expect(lineTone('status', 'connected')).toEqual(OK);
  });
});

describe('webhookState', () => {
  const app = (id: string | null) => ({ id, name: 'App', override_callback_uri: null });

  it.each([
    ['unknown', { app_id: 'a1', subscribed_apps: null }],
    ['none', { app_id: 'a1', subscribed_apps: [] }],
    ['ours', { app_id: 'a1', subscribed_apps: [app('crm'), app('a1')] }],
    ['other', { app_id: 'a1', subscribed_apps: [app('crm')] }],
    ['unverified', { app_id: null, subscribed_apps: [app('crm')] }],
    ['none', { app_id: null, subscribed_apps: [] }],
    ['unknown', { app_id: null, subscribed_apps: null }],
  ] as const)('%s', (state, view) => {
    expect(webhookState({ app_id: view.app_id, subscribed_apps: view.subscribed_apps ? [...view.subscribed_apps] : null })).toBe(state);
  });
  it('a kapso line (docs/19): apps present → kapso (neutral, never «app id not set»); none or unknown as before', () => {
    expect(webhookState({ app_id: null, subscribed_apps: [app('kapso-app')], provider: 'kapso' })).toBe('kapso');
    expect(webhookState({ app_id: null, subscribed_apps: [], provider: 'kapso' })).toBe('none');
    expect(webhookState({ app_id: null, subscribed_apps: null, provider: 'kapso' })).toBe('unknown');
    expect(webhookState({ app_id: 'a1', subscribed_apps: [app('a1')], provider: 'meta' })).toBe('ours');
  });
});
