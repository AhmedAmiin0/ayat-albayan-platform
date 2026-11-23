import { CrashScreen } from '@ab/mobile-kit';
import * as tabs from '../../../app/(tabs)/_layout';
import * as root from '../../../app/_layout';
import * as assistant from '../../../app/assistant/_layout';
import * as sales from '../../../app/sales/_layout';
import * as teacher from '../../../app/teacher/_layout';

// A render throw below a layout shows the crash screen instead of unmounting the app (R-MOB-01).
test.each([
  ['root', root],
  ['admin', tabs],
  ['teacher', teacher],
  ['sales', sales],
  ['assistant', assistant],
])('the %s layout catches with the crash screen', (_name, layout) => {
  expect(layout.ErrorBoundary).toBe(CrashScreen);
});
