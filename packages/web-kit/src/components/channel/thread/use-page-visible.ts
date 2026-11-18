import { useEffect, useState } from 'react';

const visibleNow = (): boolean => document.visibilityState === 'visible';

/**
 * Whether the browser tab is shown (Page Visibility API): a hidden tab must not mark the chat
 * read; the value follows every visibilitychange, so a tab shown again re-marks at once.
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(visibleNow);
  useEffect(() => {
    const onChange = () => setVisible(visibleNow());
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}
