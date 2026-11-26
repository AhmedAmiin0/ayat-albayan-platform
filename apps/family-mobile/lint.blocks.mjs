// The family app's lint blocks (flat-config shape), read by oxlint.config.ts (docs/31b). Its
// screens sit on @ab/mobile-kit (docs/50 §7).
import {
  boundaries,
  domainModuleRegex,
  forbiddenImports,
  LOCAL_HOOKS,
  noParentImports,
  reactRestrictions,
} from '@ab/config/lint';

const root = import.meta.dirname;
const CODE = ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'];
const VIEWS = ['src/**/*.tsx', 'app/**/*.tsx'];
const RAW_TEXT = { name: 'react-native', importNames: ['Text'], message: 'Use the kit AppText.' };
const API_CALLS = {
  regex: '^@ab/mobile-kit(/lib/http/api)?$',
  names: ['apiFetch', 'apiSend'],
  message: 'Call the API from a hook, not a component.',
};

export default {
  react: true,
  blocks: [
    { ignores: ['*.cjs'] },
    ...reactRestrictions({ files: CODE, effects: VIEWS, compiler: true, react19: true }),
    // Another feature folder only through its index.ts; `@/…`, never `../` (docs/32 R12).
    boundaries({
      root,
      files: CODE,
      // root/ is the app's frame: only app/_layout imports it.
      module: domainModuleRegex({ base: 'src', exempt: ['root'] }),
      alias: { '@/': 'src/' },
    }),
    noParentImports({ root, files: CODE }),
    // RTL: a raw Text with no textAlign can sit at the physical left (docs/07 §14.1).
    { files: VIEWS, rules: { 'no-restricted-imports': ['error', { paths: [RAW_TEXT] }] } },
    forbiddenImports({ files: [...VIEWS, ...LOCAL_HOOKS], bans: [API_CALLS] }),
  ],
};
