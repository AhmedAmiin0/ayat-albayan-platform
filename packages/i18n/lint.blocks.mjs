// One flat module (docs/32 §4 @ab/i18n): the UI-string helpers. The JSON bundles stay in shared.
import { exportTypes } from '@ab/config/lint';

export default { react: false, blocks: [exportTypes] };
