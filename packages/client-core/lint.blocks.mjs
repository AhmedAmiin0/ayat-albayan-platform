// docs/27 §1 rule 6: another folder of the package only through its index.ts (existing deep
// imports: the suppressions baseline). src/index.ts is the package's public API and re-exports
// the folders.
// docs/32 d5 groups the folders as src/<group>/<folder>; a folder still directly under src/, or a
// loose file in a group, belongs to src/<name>.
import { libraryBlocks, syntaxExempt } from '@ab/config/lint';

const blocks = libraryBlocks({
  root: import.meta.dirname,
  module: 'src/(?:core|messaging|people|teaching|finance)/[^/.]+|src/[^/.]+',
});
// docs/36 H-1: the web/mobile HTTP client is the only place that calls fetch.
const fetchClient = syntaxExempt({ files: ['src/core/http/**'], http: true });
export default { react: false, blocks: [...blocks, fetchClient] };
