// docs/27 §1 rule 6: each src/ folder (assistant, ledger, pricing, status-style) is a module;
// others reach it only through its index.ts.
import { libraryBlocks } from '@ab/config/lint';

const blocks = libraryBlocks({ root: import.meta.dirname, module: 'src/[^/.]+' });
export default { react: false, blocks };
