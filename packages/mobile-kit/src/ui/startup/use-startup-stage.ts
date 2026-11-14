import { useEffect, useState } from 'react';
import { QUIET_TEXT_AFTER_MS, RETRY_AFTER_MS, startupStage, TEXT_AFTER_MS, type StartupMode, type StartupStage } from './startup-mode';

const ORDER: StartupStage[] = ['mark', 'connecting', 'retry'];
const later = (a: StartupStage, b: StartupStage) => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a);

/** The startup stage, moved on by timers from mount; `restart` («إعادة المحاولة») counts again from now. */
export function useStartupStage(mode: StartupMode): { stage: StartupStage; restart: () => void } {
  const [start, setStart] = useState(() => Date.now());
  const [stage, setStage] = useState<StartupStage>(() => startupStage(mode, 0));
  useEffect(() => {
    // Only forward: a quiet screen that already said «جارٍ الاتصال…» never goes back to the mark alone.
    const update = () => setStage((now) => later(now, startupStage(mode, Date.now() - start)));
    const timers = [TEXT_AFTER_MS, QUIET_TEXT_AFTER_MS, RETRY_AFTER_MS].map((at) =>
      setTimeout(update, Math.max(0, at - (Date.now() - start))),
    );
    return () => timers.forEach(clearTimeout);
  }, [mode, start]);
  const restart = () => {
    setStage('connecting');
    setStart(Date.now());
  };
  return { stage, restart };
}
