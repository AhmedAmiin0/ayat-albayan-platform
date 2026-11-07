import type { LiveRow } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { deleteStoreFile, openExpoPort } from '@/inbox/thread/store/expo-port';
import { createMessageStore, type MessageStore } from '@/inbox/thread/store/message-store';
import type { SqlPort } from '@/inbox/thread/store/sql-port';
import { readState } from '@/inbox/thread/store/store-read';
import { createQueue } from '@/inbox/thread/store/store-queue';
import { createSyncEngine } from '@/inbox/thread/store/sync-engine';
import { fetchSyncPage } from '@/inbox/thread/store/sync-fetch';
import { createStoreReader } from './store-reader';

// The app's one inbox store session (docs/43 43-7): the signed-in user's SQLite store, its sync
// engine and the screens' reader. Started by the staff trees (useInboxStore); stopped, and the
// rows wiped, on sign-out or when the inbox is no longer the user's.

/** What the screens read (empty until a session starts). */
export const storeReader = createStoreReader();

interface Session {
  owner: string;
  port: SqlPort;
  store: MessageStore;
  engine: ReturnType<typeof createSyncEngine>;
  /** Started by the app's trees (fallback timer on); false while only push wakes hold it. */
  started: boolean;
  /** Push wakes holding it now: the last one out closes a session the app never started. */
  wakes: number;
}

/** What a push wake gets (push-wake.ts): one sync of the owner's store, then let go of it. */
export interface StoreWake {
  /** syncNow: joins the run in flight and asks for exactly one more after it (a new push). */
  sync(): Promise<void>;
  /** The last wake out closes a session the app never started (rows kept, request aborted). */
  release(): Promise<void>;
}

let session: Session | null = null;
const serial = createQueue();

/** The store on its file, ready for `owner`; a failed open closes the connection again. */
async function openFor(owner: string): Promise<{ port: SqlPort; store: MessageStore }> {
  const port = await openExpoPort();
  const store = createMessageStore(port);
  await store.open(owner).catch(async (error: unknown) => {
    await port.close();
    throw error;
  });
  return { port, store };
}

/** A session for `owner` (not started): the store, its engine, the screens' reader on it. */
async function openSession(owner: string): Promise<Session> {
  const { port, store } = await openFor(owner);
  const engine = createSyncEngine({ store, owner, fetchPage: fetchSyncPage });
  session = { owner, port, store, engine, started: false, wakes: 0 };
  storeReader.attach(store, owner);
  return session;
}

/** Starts (or keeps) the store for `owner`; another owner's session stops and wipes first. */
export const startInboxStore = (owner: string): Promise<void> =>
  serial(async () => {
    const current =
      session?.owner === owner ? session : await stop().then(() => openSession(owner));
    if (current.started) return;
    current.started = true;
    current.engine.start();
  });

async function stop(): Promise<void> {
  const ending = session;
  session = null;
  storeReader.detach();
  ending?.engine.stop();
  await ending?.store.wipe();
  await ending?.port.close();
}

/** Sign-out / the inbox gone: the engine stops, every row is wiped; never throws. */
export const stopInboxStore = (): Promise<void> =>
  serial(async () => {
    // No session in this run (signed out at start): the file of an earlier one goes.
    await (session ? stop() : deleteStoreFile()).catch(() => undefined);
  });

/** The file's owner as it is, without opening (or wiping) a store for anyone. */
async function storedOwner(): Promise<string | null> {
  const port = await openExpoPort();
  // No tables yet (a wiped or never-used file): nobody's.
  const owner = await readState(port).then(
    (s) => s.owner,
    () => null,
  );
  await port.close();
  return owner;
}

const idleWake = (s: Session): boolean => s.wakes === 0 && !s.started && session === s;

/**
 * One wake out. The last one out of a session the app never started: the engine stops at once
 * (its request aborted, even with the queue busy), the connection closes in turn; rows kept.
 */
const releaseFor = (woken: Session) => (): Promise<void> => {
  woken.wakes -= 1;
  if (!idleWake(woken)) return Promise.resolve();
  session = null;
  storeReader.detach();
  woken.engine.stop();
  return serial(() => woken.port.close());
};

function wakeOf(s: Session): StoreWake {
  s.wakes += 1;
  return { sync: () => s.engine.syncNow(), release: releaseFor(s) };
}

/**
 * A message push woke the app (push-wake.ts, docs/43 §5): the signed-in `owner`'s session, the
 * app's own when one runs, else one opened only when the file already holds this owner's rows
 * (the app started the store for them before). Anyone else (another account's session or rows,
 * signed out and wiped): null, nothing opened, nothing wiped.
 */
export const wakeInboxStore = (owner: string): Promise<StoreWake | null> =>
  serial(async () => {
    const running = session;
    const theirs = running ? false : (await storedOwner()) === owner;
    const woken = running ?? (theirs ? await openSession(owner) : null);
    return woken?.owner === owner ? wakeOf(woken) : null;
  });

/** A realtime event's ticks into the store (docs/44 K1, a visual patch; the sync still runs). */
export const patchInboxStore = async (phone: string, rows: readonly LiveRow[]): Promise<void> => {
  await session?.store.live(rows, { owner: session.owner, phone }).catch(() => false);
};

/** Something changed on the server (realtime, push, back in the foreground): sync soon. */
export const nudgeInboxStore = (): void => session?.engine.nudge();

/**
 * A chat's HTTP rows into the store (merged by id, mergeRead), so a chat the sync has not
 * reached yet opens from disk too. Queued rows wait for the sync: a send's own row has a
 * client id the server's copy does not share.
 */
export function putInboxReads(rows: readonly MessageView[]): void {
  const settled = rows.filter((m) => m.status !== 'queued');
  if (!session || settled.length === 0) return;
  void session.store.putReads(settled, session.owner).catch(() => undefined);
}
