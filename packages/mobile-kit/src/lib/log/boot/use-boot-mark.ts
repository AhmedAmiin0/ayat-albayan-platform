import { useEffect } from 'react';
import { reportFirstScreen } from './boot-mark';

/** Reports the first screen once the root is ready (the startup cover lifts). */
export function useBootMark(ready: boolean): void {
  useEffect(() => {
    if (ready) reportFirstScreen();
  }, [ready]);
}
