export const ROOTS = [
  'apps/staff-web/src',
  'apps/family-web/src',
  'packages/web-kit/src',
  'apps/api/src',
  'packages/core/src',
  'packages/i18n/src',
  'packages/time/src',
  'packages/catalog/src',
  'packages/settings/src',
  'packages/money/src',
  'packages/schedule/src',
  'packages/shared/src',
  'packages/client-core/src',
  'e2e',
];
export const CODE = /\.(ts|tsx|mjs)$/;
export const UNIT =
  /\.test\.(ts|tsx|mjs)$|(^|\/)(node_modules|dist|__snapshots__|playwright-report|test-results)\//;
export const ALIAS = {
  '@ab/core': 'packages/core/src/index.ts',
  '@ab/i18n': 'packages/i18n/src/index.ts',
  '@ab/time': 'packages/time/src/index.ts',
  '@ab/catalog': 'packages/catalog/src/index.ts',
  '@ab/settings': 'packages/settings/src/index.ts',
  '@ab/settings/seed': 'packages/settings/src/seed/index.ts',
  '@ab/money': 'packages/money/src/index.ts',
  '@ab/schedule': 'packages/schedule/src/index.ts',
  '@ab/shared': 'packages/shared/src/index.ts',
  '@ab/shared/testing': 'packages/shared/src/testing/index.ts',
  '@ab/client-core': 'packages/client-core/src/index.ts',
  '@ab/web-kit': 'packages/web-kit/src/index.ts',
  '@ab/web-kit/room': 'packages/web-kit/src/room.ts',
  '@ab/web-kit/testing': 'packages/web-kit/src/testing/index.ts',
};
