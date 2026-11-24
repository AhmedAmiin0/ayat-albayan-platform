// The shared mobile kit's own lint blocks (flat-config shape), read by oxlint.config.ts:
// docs/31b-oxlint-mapping.md. Its modules import each other by
// relative path (no `@/` alias: two apps consume these sources).
import { forbiddenImports, reactRestrictions, syntaxExempt } from '@ab/config/lint';

const SRC = ['src/**/*.{ts,tsx}'];
const TSX = ['src/**/*.tsx'];
const TEXT = {
  name: 'react-native',
  importNames: ['Text'],
  message: 'Use AppText (src/ui/primitives/AppText).',
};
// docs/36 «Stays exempt»: the reach wrapper and the connectivity probe call fetch (H-1), and the
// chat's recorded voice note is read from its local file:// copy (channel-voice);
// supabase-js's transport (a kept SDK, docs/36 §3.2) gets the read deadline.
const FETCH = [
  'src/lib/http/api.ts',
  'src/lib/http/auth-fetch.ts',
  'src/lib/connectivity/probe.ts',
  'src/channel/media/channel-voice.ts',
];

export default {
  react: true,
  blocks: [
    { ignores: ['*.cjs', '**/__snapshots__/**'] },
    // React 19.2 idioms; the React Compiler builds every file (babel.cjs), so no useMemo /
    // useCallback / memo.
    ...reactRestrictions({ files: SRC, effects: TSX, compiler: true, react19: true }),
    // RTL: a raw Text with no textAlign can sit at the physical left (docs/07 §14.1).
    {
      files: TSX,
      ignores: ['src/ui/primitives/AppText.tsx', '**/*.test.tsx'],
      rules: { 'no-restricted-imports': ['error', { paths: [TEXT] }] },
    },
    syntaxExempt({ files: FETCH, http: true }),
    // docs/32 R8: a component calls the API through a query or mutation hook.
    forbiddenImports({
      files: TSX,
      bans: [
        {
          regex: '(^|/)http/api$',
          names: ['apiFetch', 'apiSend'],
          message: 'Call the API from a hook, not a component.',
        },
      ],
    }),
  ],
};
