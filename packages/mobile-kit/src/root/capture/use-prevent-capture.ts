import { useEffect } from 'react';
import { logWarning } from '../../lib/log/log';
import { captureGuard } from './capture-guard.registry';

const warnFailed = (): void => logWarning('capture guard: the native call failed');

/**
 * Keeps screenshots and screen recording blocked while `blocked` is true and allows them when it
 * turns false. Unmounting leaves the last state: an app-wide block is never lifted by accident.
 */
export function usePreventCapture(blocked: boolean): void {
  useEffect(() => {
    const guard = captureGuard();
    Promise.resolve()
      .then(() => (blocked ? guard.block() : guard.allow()))
      .catch(warnFailed);
  }, [blocked]);
}
