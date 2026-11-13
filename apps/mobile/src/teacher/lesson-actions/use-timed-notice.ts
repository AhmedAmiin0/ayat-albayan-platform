import { useEffect, useState } from 'react';

const NOTICE_MS = 5000;

/**
 * A line said once an action lands («أُلغيت الحلقة…», «سُجِّل تأكيد حضورك…»), gone after 5 s. Held
 * by the screen: a cancelled lesson's card leaves «اليوم», its notice must not leave with it.
 */
export function useTimedNotice() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (text === null) return undefined;
    const id = setTimeout(() => setText(null), NOTICE_MS);
    return () => clearTimeout(id);
  }, [text]);
  return { text, show: setText };
}
