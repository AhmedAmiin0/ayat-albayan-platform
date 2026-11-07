// docs/27 §1 rule 6, as in @ab/shared before k4: the settings kernel (src/*.ts, domains/, seed/,
// validation/) is one module, and custom-config/ is its own; others reach it through its index.ts.
import { libraryBlocks } from '@ab/config/lint';

const blocks = libraryBlocks({ root: import.meta.dirname, module: 'src/custom-config' });
export default { react: false, blocks };
