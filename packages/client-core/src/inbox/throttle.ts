export interface Throttle {
  /** Runs now when idle; within the window, once more when it ends (however many calls came). */
  call(): void;
  /** Drops a pending trailing run. */
  cancel(): void;
}

/** Leading + trailing throttle: a burst of N calls inside `ms` becomes at most 2 runs. */
export function createThrottle(run: () => void, ms: number): Throttle {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending = false;
  const open = () => {
    timer = setTimeout(() => {
      timer = null;
      if (!pending) return;
      pending = false;
      run();
      open();
    }, ms);
  };
  return {
    call() {
      if (timer) {
        pending = true;
        return;
      }
      run();
      open();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = false;
    },
  };
}
