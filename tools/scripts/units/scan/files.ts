const CODE = /\.[cm]?[jt]sx?$/;
const TEST = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const IGNORED = /\.(?:d|gen)\.[cm]?[jt]sx?$/;

/** `X.<role>.ts(x)` belongs to unit X (owner's table, lane U0). */
export const ROLES: ReadonlySet<string> = new Set([
  'props',
  'types',
  'styles',
  'schemas',
  'mapper',
  'fakes',
  'fixtures',
  'constants',
  'hooks',
  'builder',
  'variants',
]);

export const isCode = (name: string): boolean => CODE.test(name) && !IGNORED.test(name);

export const isTest = (name: string): boolean => TEST.test(name);

export const stemOf = (name: string): string => name.replace(CODE, '');

/** The folder's barrel is the folder's own unit, never a unit of its own. */
export const BARREL = 'index';
