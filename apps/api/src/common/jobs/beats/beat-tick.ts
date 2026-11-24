import { jobBeats } from './beat-book';
import type { BeatPlan, BeatSink } from './beat-book';

/**
 * For a job with its own timers (not a Ticker): registers its heartbeat now and returns the timer
 * callback, which records each timed pass as a success or an error (an error the job logged and
 * caught counts too). A pass that never ends records nothing, so the job goes stale. Never throws.
 */
export function beatTick(
  plan: BeatPlan,
  run: () => Promise<unknown>,
  beats: BeatSink = jobBeats,
): () => void {
  beats.register(plan);
  return () => {
    beats.begin(plan.name);
    void run().then(
      () => beats.ok(plan.name),
      (e: unknown) => beats.fail(plan.name, e),
    );
  };
}
