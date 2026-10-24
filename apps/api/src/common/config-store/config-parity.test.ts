import { SETTING_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { decodeAll } from './config-decode';
import { compareEffective, configParity } from './config-parity';

const row = (key: string, value: unknown) => ({ key, value });

describe('configParity (docs/26 §4 «Parity rules»)', () => {
  it('checks every registry key; no rows → no diffs', () => {
    expect(configParity([])).toEqual({ diffs: [], checkedKeys: SETTING_KEYS.length });
  });

  it('rule 1: JSON null and a missing row mean the same (the default) on both paths', () => {
    const rows = [row('late_cancel_hours', null), row('recording_retention_days', null), row('recording_consent_notice', null)];
    expect(configParity(rows).diffs).toEqual([]);
  });

  it('rule 2: valid and malformed values read the same on both paths', () => {
    const rows = [
      row('upload_max_mb', 4),
      row('booking_horizon_weeks', 0),
      row('follow_up_hours', [48, 24]),
      row('academy_timezone', 'Not/AZone'),
      row('academy_contact', { phone: 'x' }),
      row('default_meeting_title', ' حلقة '),
    ];
    expect(configParity(rows).diffs).toEqual([]);
  });

  it.each([['true'], [1], [null], ['yes'], [{}]])('rule 3: messaging switches stored %j are off on both paths', (stored) => {
    expect(configParity([row('messaging_enabled', stored), row('auto_messages_enabled', stored)]).diffs).toEqual([]);
  });

  it('rule 3: a stored true is on on both paths', () => {
    expect(configParity([row('messaging_enabled', true)]).diffs).toEqual([]);
  });

  it.each([['module'], ['legacy'], ['MODULE'], [null], [3]])('rule 4: comms_source stored %j agrees', (stored) => {
    expect(configParity([row('comms_source', stored)]).diffs).toEqual([]);
  });

  it('keys outside the registry (google, unknown) are not compared as registry keys', () => {
    expect(configParity([row('google_sync_mode', 'live'), row('custom_whatever', 1)]).diffs).toEqual([]);
  });
});

describe('compareEffective (the diff itself)', () => {
  const base = decodeAll([]);
  it('reports a key whose values differ; deep-equal values are not diffs', () => {
    const store = { ...base, upload_max_mb: 4, follow_up_hours: [...(base['follow_up_hours'] as number[])] };
    expect(compareEffective({ legacy: base, store, rows: [] })).toEqual([{ key: 'upload_max_mb', legacy: 10, store: 4 }]);
  });

  it('reports a broken fail-closed rule on either path', () => {
    const rows = [row('messaging_enabled', 'true'), row('comms_source', 'Module')];
    const store = { ...base, messaging_enabled: true, comms_source: 'module' };
    expect(compareEffective({ legacy: base, store, rows })).toEqual([
      { key: 'messaging_enabled', legacy: false, store: true },
      { key: 'comms_source', legacy: 'legacy', store: 'module' },
      { key: 'rule:messaging_enabled', legacy: false, store: true },
      { key: 'rule:comms_source', legacy: 'legacy', store: 'module' },
    ]);
  });
});
