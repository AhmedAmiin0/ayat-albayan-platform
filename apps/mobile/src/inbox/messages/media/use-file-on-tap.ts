import { useCallback, useEffect, useRef, useState } from 'react';
import { signedStaleTime, type ThreadFile, useThreadFile } from '../hooks/thread-file';
import { mediaProblem, type MediaProblem } from '../photo/media-problem';

type TapFile =
  | { step: 'idle' }
  | { step: 'fetching' }
  | { step: 'ready'; file: ThreadFile }
  | { step: 'problem'; problem: MediaProblem };

/**
 * A voice note's or video's signed URL, asked ONLY on the tap (W6): rendering or refetching the thread
 * never signs one. A second tap while fetching, or once ready while the URL is fresh, asks nothing; after
 * a failure, or once the signed URL is (nearly) expired, it asks again.
 */
export function useFileOnTap(phone: string, messageId: string) {
  const fetchFile = useThreadFile(phone, messageId);
  const [state, setState] = useState<TapFile>({ step: 'idle' });
  const live = useRef(true);
  useEffect(
    () => () => {
      live.current = false;
    },
    [],
  );
  const busy = state.step === 'fetching' || (state.step === 'ready' && signedStaleTime(state.file) > 0);

  const open = useCallback(() => {
    if (busy) return;
    setState({ step: 'fetching' });
    fetchFile().then(
      (file) => live.current && setState({ step: 'ready', file }),
      (e: unknown) => live.current && setState({ step: 'problem', problem: mediaProblem(e) }),
    );
  }, [busy, fetchFile]);
  /** The player could not play the fetched file: «اضغط لإعادة المحاولة». */
  const fail = useCallback(() => setState({ step: 'problem', problem: 'failed' }), []);
  return { state, open, fail };
}
