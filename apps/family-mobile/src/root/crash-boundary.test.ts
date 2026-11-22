import { CrashScreen } from '@ab/mobile-kit';
import * as tabs from '../../app/(tabs)/_layout';
import * as root from '../../app/_layout';

// A render throw below a layout shows the crash screen instead of unmounting the app (R-MOB-01).
test.each([
  ['root', root],
  ['tabs', tabs],
])('the %s layout catches with the crash screen', (_name, layout) => {
  expect(layout.ErrorBoundary).toBe(CrashScreen);
});
