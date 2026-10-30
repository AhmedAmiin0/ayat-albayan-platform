import { OWNED_SETTING_KEYS, SETTINGS_REGISTRY, type Permission } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { SEED_ENTRIES } from '@ab/shared';
import { boundsOf, changedBy } from '@/common/configuration/config-store/io/config-entries.mapper';
import { isModuleOwned, mayDescribe, mayView, ownerOf, OWNER_MAY_DESCRIBE } from './config-ownership';
import { configRow } from '@/common/configuration/config-store/config-store.fakes';

const user = (role: AuthUser['role'], permissions: Permission[]): AuthUser => ({ id: 'u', email: null, role, permissions });

describe('config ownership (decided in code)', () => {
  it('every OWNED_SETTING_KEYS key is owned, with its owner', () => {
    for (const [key, owner] of Object.entries(OWNED_SETTING_KEYS)) expect([key, ownerOf(key)]).toEqual([key, owner]);
  });

  it('a seed entry with ownedBy or a `patch: false` entry is not writable on «القيم»', () => {
    for (const e of SEED_ENTRIES) if (e.ownedBy) expect(isModuleOwned(e.key)).toBe(true);
    expect(isModuleOwned('comms_source')).toBe(true);
    expect(isModuleOwned('upload_max_mb')).toBe(false);
    expect(ownerOf('no_such_key')).toBeNull();
  });

  it('description permission per owner (exhaustive map)', () => {
    expect(Object.keys(OWNER_MAY_DESCRIBE).sort()).toEqual(['communications', 'google_sync', 'messages_gate', 'notifications']);
    const editor = user('sales', ['settings.write']);
    const numbers = user('sales', ['settings.write', 'numbers.manage']);
    const admin = user('admin', ['settings.write', 'numbers.manage']);
    expect([mayDescribe(editor, 'messaging_enabled'), mayDescribe(editor, 'comms_source'), mayDescribe(editor, 'google_sync_mode')]).toEqual([true, false, false]);
    expect([mayDescribe(numbers, 'comms_source'), mayDescribe(numbers, 'google_sync_mode')]).toEqual([true, false]);
    expect([mayDescribe(admin, 'google_sync_mode'), mayDescribe(editor, 'upload_max_mb')]).toEqual([true, true]);
    const rules = user('sales', ['settings.write', 'notifications.manage']);
    expect([mayDescribe(editor, 'follow_up_hours'), mayDescribe(rules, 'follow_up_hours')]).toEqual([false, true]);
  });

  it('Google rows are viewable by base admins only', () => {
    expect(mayView(user('sales', ['settings.read']), 'google_sync_enabled')).toBe(false);
    expect(mayView(user('admin', []), 'google_sync_enabled')).toBe(true);
    expect(mayView(user('sales', ['settings.read']), 'messaging_enabled')).toBe(true);
  });
});

describe('config entries mapper', () => {
  it('bounds are the code entry min/max/options/length/items/nullable fields', () => {
    expect(boundsOf(SETTINGS_REGISTRY.late_cancel_hours)).toEqual({ min: expect.any(Number), max: expect.any(Number), nullable: true });
    expect(boundsOf(SETTINGS_REGISTRY.comms_source)).toEqual({ options: ['legacy', 'module'] });
    expect(boundsOf(SETTINGS_REGISTRY.follow_up_hours)).toMatchObject({ maxItems: expect.any(Number) });
  });

  it('changedBy: nothing for a missing or never-written row; an admin null save keeps its writer', () => {
    const names = new Map([['admin-1', 'منى']]);
    expect(changedBy(undefined, names)).toEqual({ updatedAt: null, updatedByName: null });
    expect(changedBy(configRow('k', null, { updatedBy: null }), names)).toEqual({ updatedAt: null, updatedByName: null });
    expect(changedBy(configRow('k', null), names)).toEqual({ updatedAt: '2026-10-23T10:00:00.000Z', updatedByName: 'منى' });
  });
});
