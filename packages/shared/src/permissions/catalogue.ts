// The permission catalogue (owner, 2026-10-05; docs/04 §12). One `view` and one `manage` per module,
// plus the wildcard. `manage` implies `view` of the same module (see can()).
// CEILING: RLS stays keyed on the base role; these are enforced in the API and the UI only.

export const PERMISSION_MODULES = [
  'leads',
  'inbox',
  'job_applicants',
  'students',
  'teachers',
  'schedule',
  'classrooms',
  'feedback',
  'subscriptions',
  'payments',
  'payouts',
  'expenses',
  'invoices',
  'receivables',
  'finance',
  'pricing',
  'settings',
  'dashboard',
  'activity',
  'users',
  'roles',
  'translations',
  'recordings',
] as const;

export const PERMISSION_ACTIONS = ['view', 'manage'] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type ModulePermission = `${PermissionModule}.${PermissionAction}`;
export const WILDCARD = '*';
export type Permission = ModulePermission | typeof WILDCARD;

export const permissionKey = (module: PermissionModule, action: PermissionAction): ModulePermission =>
  `${module}.${action}`;

/** Every grantable permission, module by module (view before manage); the wildcard comes last. */
export const ALL_PERMISSIONS: readonly Permission[] = [
  ...PERMISSION_MODULES.flatMap((m) => PERMISSION_ACTIONS.map((a) => permissionKey(m, a))),
  WILDCARD,
];

/** Catalogued but without routes yet (the users module is coming): hidden from the role editor. */
export const RESERVED_MODULES: readonly PermissionModule[] = ['users'];

/** The modules an admin can grant today: the catalogue minus the reserved ones. */
export const EDITOR_MODULES: readonly PermissionModule[] = PERMISSION_MODULES.filter(
  (m) => !RESERVED_MODULES.includes(m),
);

/** The catalogue grouped for the editor: `{ module, view, manage }` rows. */
export const PERMISSION_GROUPS: readonly { module: PermissionModule; view: ModulePermission; manage: ModulePermission }[] =
  EDITOR_MODULES.map((module) => ({
    module,
    view: permissionKey(module, 'view'),
    manage: permissionKey(module, 'manage'),
  }));

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && ALL_PERMISSIONS.some((p) => p === value);
}

/** Pure check: the wildcard grants everything; `x.manage` also grants `x.view`. */
export function can(perms: readonly string[] | ReadonlySet<string>, key: Permission): boolean {
  const has = (k: string): boolean => (perms instanceof Set ? perms.has(k) : [...perms].includes(k));
  if (has(WILDCARD)) return true;
  if (has(key)) return true;
  return key.endsWith('.view') && has(`${key.slice(0, -'.view'.length)}.manage`);
}

/** True when the set grants at least one of the keys. */
export const canAny = (perms: readonly string[], keys: readonly Permission[]): boolean =>
  keys.some((k) => can(perms, k));
