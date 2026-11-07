// docs/27 §1 rule 6: each src/ folder is a module; others reach it only through its index.ts.
// The whole package is the date-fns facade (docs/34 §7), so the date restrictions are off here.
import { libraryBlocks } from '@ab/config/lint';

const blocks = libraryBlocks({ root: import.meta.dirname, module: 'src/[^/.]+' });
const facade = { files: ['src/**/*.ts'], rules: { 'no-restricted-properties': 'off' } };
export default { react: false, blocks: [...blocks, facade] };
