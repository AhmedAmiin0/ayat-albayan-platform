import { z } from 'zod';
import { layerNameSchema } from '../map/index.ts';

const boundarySchema = z.object({
  file: z.string(),
  /** The module regex before the moves: a deep import inside one old module was legal. */
  old: z.string(),
  /** Text edits; `{G}` is the group alternation, `{F}` the feature regex, `{R}` the route list. */
  edits: z.array(z.tuple([z.string(), z.string()])),
});

const FEATURES = "'src/features/(?:{G})/[^/]+|src/features/[^/]+/[^/]+'";
const MOBILE_IMPORT = ['  domainModuleRegex,\n', ''] as const;

export const BOUNDARIES = z
  .record(layerNameSchema, boundarySchema)
  .readonly()
  .decode({
    api: {
      file: 'apps/api/lint.blocks.mjs',
      old: 'src/modules/[^/]+/[^/]+',
      edits: [
        [
          "module: 'src/modules/[^/]+/[^/]+',",
          "module: 'src/modules/(?:{G})/[^/]+|src/modules/[^/]+/[^/]+',",
        ],
      ],
    },
    shared: {
      file: 'packages/shared/lint.blocks.mjs',
      old: 'src/(?:core|people)/[^/.]+|src/messaging/numbers|src/[^/.]+',
      edits: [
        [
          "module: 'src/(?:core|people)/[^/.]+|src/messaging/numbers|src/[^/.]+',",
          "module: 'src/(?:{G})/[^/.]+|src/(?:{D})/[^/.]+|src/[^/.]+',",
        ],
      ],
    },
    'client-core': {
      file: 'packages/client-core/lint.blocks.mjs',
      old: 'src/(?:core|messaging|people|teaching|finance)/[^/.]+|src/[^/.]+',
      edits: [
        [
          "module: 'src/(?:core|messaging|people|teaching|finance)/[^/.]+|src/[^/.]+',",
          "module: 'src/(?:{G})/[^/.]+|src/(?:core|{D})/[^/.]+|src/[^/.]+',",
        ],
      ],
    },
    'staff-web': {
      file: 'apps/staff-web/lint.blocks.mjs',
      old: 'src/features/[^/]+/[^/]+',
      edits: [["module: 'src/features/[^/]+/[^/]+'", `module: ${FEATURES}`]],
    },
    'family-web': {
      file: 'apps/family-web/lint.blocks.mjs',
      old: 'src/features/[^/]+',
      edits: [["module: 'src/features/[^/]+'", `module: ${FEATURES}`]],
    },
    'staff-mobile': {
      file: 'apps/staff-mobile/lint.blocks.mjs',
      old: 'src/(?:(?:sales)/[^/]+|(?!core/|test/|sales/)[^/]+)',
      edits: [
        [...MOBILE_IMPORT],
        ['  routeImportGroup,\n', ''],
        [
          "// docs/32 g1: the domains already regrouped into `src/<domain>/<module>` (two-level modules). Each\n// c-row move adds its domain here in the same PR that moves ALL of src/<domain>/ into\n// src/<domain>/<module>/ (a listed domain makes each sub-folder its own module).\nconst DOMAINS = ['sales'];\n",
          `// docs/68: a feature is src/features/<domain>/<feature> or <domain>/<group>/<feature>.\nconst FEATURES = ${FEATURES};\n`,
        ],
        [
          "group: routeImportGroup({ prefix: '@/', exempt: ['core'], domains: DOMAINS }),",
          'group: {R},',
        ],
        [
          '(@/<feature>), not its internals.',
          '(@/features/<domain>/<feature>), not its internals.',
        ],
        [
          "module: domainModuleRegex({ base: 'src', exempt: ['core', 'test'], domains: DOMAINS }),",
          'module: FEATURES,',
        ],
      ],
    },
    'family-mobile': {
      file: 'apps/family-mobile/lint.blocks.mjs',
      old: 'src/(?!root/)[^/]+',
      edits: [
        [...MOBILE_IMPORT],
        [
          "      // root/ is the app's frame: only app/_layout imports it.\n      module: domainModuleRegex({ base: 'src', exempt: ['root'] }),",
          `      module: ${FEATURES},`,
        ],
      ],
    },
  });
