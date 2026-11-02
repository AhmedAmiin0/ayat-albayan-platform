// The incoming-call ring (docs/28 §5), made with WebAudio: no audio file, two soft tones every 2 s.
// Browsers start audio only after a user gesture on the page: the context is resumed at once and on
// the next pointerdown; until then the full-screen incoming call is still shown.

export interface Ringtone {
  stop(): void;
}

type AudioCtor = new () => AudioContext;

function audioCtor(): AudioCtor | null {
  return typeof AudioContext === 'undefined' ? null : AudioContext;
}

/** Starts ringing; `stop()` ends it. A browser without WebAudio rings silently. */
export function startRingtone(make: AudioCtor | null = audioCtor()): Ringtone {
  if (!make) return { stop: () => undefined };
  let ctx: AudioContext;
  try {
    ctx = new make();
  } catch {
    return { stop: () => undefined };
  }
  const ring = () => {
    const at = ctx.currentTime;
    for (const [offset, freq] of [[0, 440], [0.4, 480]] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, at + offset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + offset + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at + offset);
      osc.stop(at + offset + 0.4);
    }
  };
  // Autoplay policy: a context made before any gesture starts suspended; resume it now and again on the
  // next pointerdown (the user touching the page) if it is still suspended.
  const resume = () => void ctx.resume().catch(() => undefined);
  const retry = () => {
    if (ctx.state === 'suspended') resume();
  };
  if (ctx.state === 'suspended') {
    resume();
    window.addEventListener('pointerdown', retry, { once: true });
  }
  ring();
  const timer = setInterval(ring, 2_000);
  return {
    stop() {
      clearInterval(timer);
      window.removeEventListener('pointerdown', retry);
      void ctx.close().catch(() => undefined);
    },
  };
}
