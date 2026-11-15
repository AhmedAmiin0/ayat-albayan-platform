import { VALUE_CONFIRM, type SettingKey } from '@ab/shared';

export type ConfirmKind = 'typed' | 'plain';

/**
 * What a save asks first (VALUE_CONFIRM): plain for the booking-wide switches; typed for retention
 * days that delete data, but only when the deleting starts (from OFF) or gets earlier (a shorter
 * period). Lengthening the period or turning it off deletes nothing more, so it saves at once.
 */
export function confirmKind(key: SettingKey, value: unknown, prev?: unknown): ConfirmKind | undefined {
  const kind = VALUE_CONFIRM[key];
  if (kind !== 'typed') return kind;
  if (typeof value !== 'number') return undefined;
  return typeof prev === 'number' && value >= prev ? undefined : 'typed';
}
