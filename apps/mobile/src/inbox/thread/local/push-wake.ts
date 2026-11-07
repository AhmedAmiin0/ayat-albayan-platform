import { jsonText } from '@ab/client-core';
import { PUSH_WAKE_KINDS } from '@ab/shared';
import { BackgroundNotificationTaskResult as Result } from 'expo-notifications';
import { z } from 'zod';
import { supabase } from '@/core/lib/http/supabase';
import { type StoreWake, wakeInboxStore } from './store-session';

// A message push while the app is in the background or killed (docs/43 §5, APK 0.6.0): the push
// is only a wake-up. The phone store runs the same sync as on a nudge; nothing of the payload is
// ever written (its preview is the banner's, not a row).

/** The whole wake (session, open, sync) gives up after this (a headless task gets ~30 s). */
const WAKE_BUDGET_MS = 20_000;

/** The task's payload (FCM on Android, APNs on iOS): the push's own data as a JSON string. */
const wakePayload = z.object({
  data: z.object({ dataString: jsonText(z.object({ kind: z.enum(PUSH_WAKE_KINDS) })) }),
});

/** A message push the store should sync for (a tap's response, any other kind, bad JSON: no). */
export function isWakePush(payload: unknown): boolean {
  try {
    return wakePayload.safeParse(payload).success;
  } catch {
    return false; // JSON.parse threw inside the schema
  }
}

export interface WakeDeps {
  /** The persisted session's user id; undefined when signed out. */
  signedIn: () => Promise<string | undefined>;
  wake: (owner: string) => Promise<StoreWake | null>;
  budgetMs: number;
}

const liveDeps: WakeDeps = {
  signedIn: async () => (await supabase.auth.getSession()).data.session?.user.id,
  wake: wakeInboxStore,
  budgetMs: WAKE_BUDGET_MS,
};

/** `work`, or a rejection once `signal` aborts (the work itself is left to settle). */
function within<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  const late = new Promise<never>((_, reject) => {
    const fail = () => reject(new Error('push wake: out of time'));
    signal.addEventListener('abort', fail);
    if (signal.aborted) fail();
  });
  return Promise.race([work, late]);
}

/** A wake that comes back after the deadline is let go of at once. */
async function wakeWithin(pending: Promise<StoreWake | null>, signal: AbortSignal) {
  return within(pending, signal).catch((error: unknown) => {
    void pending.then((w) => w?.release()).catch(() => undefined);
    throw error;
  });
}

async function syncFor(deps: WakeDeps, signal: AbortSignal): Promise<Result> {
  const owner = await within(deps.signedIn(), signal);
  const wake = owner ? await wakeWithin(deps.wake(owner), signal) : null;
  if (!wake) return Result.NoData;
  try {
    await within(wake.sync(), signal);
    return Result.NewData;
  } finally {
    await wake.release();
  }
}

/**
 * The background notification task's body (push-task.ts): for a message push and the signed-in
 * user whose store this is, one sync (joined with the app's own when it runs), bounded by
 * budgetMs; on time-out the wake's request is aborted. Never throws.
 */
export async function onPushWake(payload: unknown, deps: WakeDeps = liveDeps): Promise<Result> {
  if (!isWakePush(payload)) return Result.NoData;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), deps.budgetMs);
  try {
    return await syncFor(deps, abort.signal);
  } catch {
    return Result.Failed;
  } finally {
    clearTimeout(timer);
  }
}
