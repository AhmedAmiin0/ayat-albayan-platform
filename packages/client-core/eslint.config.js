import { boundaries, config } from '@ab/config/eslint';
// docs/27 §1 rule 6: another folder of the package only through its index.ts (existing deep imports: eslint-suppressions.json).
export default config(boundaries({ files: ['src/**/*.ts'], module: 'src/[^/]+(?=/)' }));
