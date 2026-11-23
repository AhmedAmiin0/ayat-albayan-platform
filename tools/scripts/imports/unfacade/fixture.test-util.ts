import { makeRepo } from '../../ci-checks/move-module/fixture.test-util.ts';

const manifest = (name: string): string => JSON.stringify({ name });

/** Three domain packages and the facade; shared's own `utc` shadows the one from @ab/time. */
export const DOMAIN: Record<string, string> = {
  'package.json': manifest('root'),
  'packages/core/package.json': manifest('@ab/core'),
  'packages/core/src/index.ts': "export * from './phone.js';\n",
  'packages/core/src/phone.ts':
    'export const toE164 = (s: string) => s;\nexport type Phone = string;\n',
  'packages/i18n/package.json': manifest('@ab/i18n'),
  'packages/i18n/src/index.ts': "export * from './strings.js';\n",
  'packages/i18n/src/strings.ts': 'export const t = (k: string) => k;\n',
  'packages/time/package.json': manifest('@ab/time'),
  'packages/time/src/index.ts': "export * from './zone/index.js';\n",
  'packages/time/src/zone/index.ts': 'export type Zone = string;\nexport const utc = 0;\n',
  'packages/shared/package.json': manifest('@ab/shared'),
  'packages/shared/src/index.ts': [
    "export * from '@ab/core';",
    "export * from '@ab/i18n';",
    "export * from '@ab/time';",
    "export * from './own.js';",
    "export type * from './kinds/index.js';",
    '',
  ].join('\n'),
  'packages/shared/src/own.ts': 'export const own = 1;\nexport const utc = 1;\n',
  'packages/shared/src/kinds/index.ts': 'export type Kind = string;\n',
};

/** A throw-away monorepo of the packages above plus `files`. */
export const repo = (files: Record<string, string>): string => makeRepo({ ...DOMAIN, ...files });

/** An app workspace named `name` at apps/<name> with `deps`. */
export const app = (name: string, deps: Record<string, string>): Record<string, string> => ({
  [`apps/${name}/package.json`]: `${JSON.stringify({ name, dependencies: deps }, null, 2)}\n`,
});
