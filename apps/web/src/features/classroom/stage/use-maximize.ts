import { useCallback, useEffect, useState, type RefObject } from 'react';

/** `fullscreen`: the Fullscreen API on the stage; `overlay`: a fixed full-viewport layer (iOS Safari, which only fullscreens <video>). */
export type MaximizeMode = 'fullscreen' | 'overlay';

export interface FullscreenDocLike {
  fullscreenEnabled?: boolean | undefined;
}

/** The Fullscreen API where the browser offers it on this element, else the overlay. */
export function maximizeModeOf(el: { requestFullscreen?: unknown } | null, doc: FullscreenDocLike): MaximizeMode {
  return el !== null && typeof el.requestFullscreen === 'function' && doc.fullscreenEnabled === true ? 'fullscreen' : 'overlay';
}

export interface Maximize {
  maximized: boolean;
  mode: MaximizeMode | null;
  toggle: () => void;
  exit: () => void;
}

const leaveFullscreen = () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
};

/**
 * «تكبير الشاشة» / «تصغير» for the shared screen on the stage. Esc leaves either mode (the browser
 * does it for fullscreen, a key listener for the overlay); a refused fullscreen falls back to the overlay.
 */
export function useMaximize(ref: RefObject<HTMLElement | null>): Maximize {
  const [mode, setMode] = useState<MaximizeMode | null>(null);

  const exit = useCallback(() => {
    leaveFullscreen();
    setMode(null);
  }, []);
  const enter = useCallback(() => {
    const el = ref.current;
    if (el && maximizeModeOf(el, document) === 'fullscreen') {
      setMode('fullscreen');
      el.requestFullscreen().catch(() => setMode('overlay'));
      return;
    }
    setMode('overlay');
  }, [ref]);

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setMode((m) => (m === 'fullscreen' ? null : m));
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      leaveFullscreen();
    };
  }, []);

  useEffect(() => {
    if (mode !== 'overlay') return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode]);

  return { maximized: mode !== null, mode, toggle: () => (mode ? exit() : enter()), exit };
}
