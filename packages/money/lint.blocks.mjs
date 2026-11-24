// docs/27 §1 rule 6: each src/ folder (assistant, ledger, pricing, status-style) is a module;
// others reach it only through its index.ts.
import { libraryBlocks } from '@ab/config/lint';

// The package owns the net-paid rule (netPaid / netPaidIn), so it may write the signed sum.
const ownsNetPaid = { rules: { 'ab/no-refund-sums': 'off' } };

const blocks = [...libraryBlocks({ root: import.meta.dirname, module: 'src/[^/.]+' }), ownsNetPaid];
export default { react: false, blocks };
