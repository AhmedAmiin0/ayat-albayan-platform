import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  EDITOR_MODULES,
  WILDCARD,
  permissionKey,
  type Permission,
  type PermissionAction,
  type PermissionModule,
} from '@ab/shared';

// Pure logic of the permission matrix. «إدارة» includes «عرض»: turning manage on turns view on,
// turning view off turns manage off. The wildcard is its own state: every cell reads as granted.

export type CheckState = 'all' | 'some' | 'none';

/** Catalogue order, no duplicates, nothing unknown. */
export const normalize = (perms: readonly string[]): Permission[] => ALL_PERMISSIONS.filter((p) => perms.includes(p));

export const hasWildcard = (perms: readonly string[]): boolean => perms.includes(WILDCARD);

const state = (on: number, total: number): CheckState => (on === 0 ? 'none' : on === total ? 'all' : 'some');

/** One cell. The wildcard counts as granted everywhere. */
export function isGranted(perms: readonly string[], module: PermissionModule, action: PermissionAction): boolean {
  return hasWildcard(perms) || perms.includes(permissionKey(module, action));
}

export interface Cell {
  module: PermissionModule;
  action: PermissionAction;
}

export function setPermission(perms: readonly string[], { module, action }: Cell, on: boolean): Permission[] {
  const next = new Set(perms);
  const view = permissionKey(module, 'view');
  const manage = permissionKey(module, 'manage');
  if (on) {
    next.add(view);
    if (action === 'manage') next.add(manage);
  } else if (action === 'manage') {
    next.delete(manage);
  } else {
    next.delete(view);
    next.delete(manage);
  }
  return normalize([...next]);
}

export const moduleState = (perms: readonly string[], module: PermissionModule): CheckState =>
  state(
    (['view', 'manage'] as const).filter((a) => isGranted(perms, module, a)).length,
    2,
  );

export const columnState = (perms: readonly string[], action: PermissionAction): CheckState =>
  state(EDITOR_MODULES.filter((m) => isGranted(perms, m, action)).length, EDITOR_MODULES.length);

export function setModule(perms: readonly string[], module: PermissionModule, on: boolean): Permission[] {
  return setPermission(setPermission(perms, { module, action: 'view' }, on), { module, action: 'manage' }, on);
}

export function setColumn(perms: readonly string[], action: PermissionAction, on: boolean): Permission[] {
  return EDITOR_MODULES.reduce<Permission[]>((acc, m) => setPermission(acc, { module: m, action }, on), normalize(perms));
}

export const setAll = (on: boolean): Permission[] => (on ? PERMISSION_GROUPS.flatMap((g) => [g.view, g.manage]) : []);

export const allState = (perms: readonly string[]): CheckState =>
  state(PERMISSION_GROUPS.flatMap((g) => [g.view, g.manage]).filter((p) => hasWildcard(perms) || perms.includes(p)).length, PERMISSION_GROUPS.length * 2);

/** How many catalogue cells are granted, for «{count} من {total} صلاحية». */
export const grantedCount = (perms: readonly string[]): number =>
  PERMISSION_GROUPS.flatMap((g) => [g.view, g.manage]).filter((p) => hasWildcard(perms) || perms.includes(p)).length;

export const TOTAL_CELLS = PERMISSION_GROUPS.length * 2;
