import { deleteStoreFile, openExpoPort } from '@/inbox/thread/store/expo-port';
import { createMessageStore, type MessageStore } from '@/inbox/thread/store/message-store';
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
  store: MessageStore;
  engine: ReturnType<typeof createSyncEngine>;
}

let session: Session | null = null;
const serial = createQueue();


/** Starts (or keeps) the store for `owner`; another owner's session stops and wipes first. */
export const startInboxStore = (owner: string): Promise<void> =>
  serial(async () => {
    if (session?.owner === owner) return;
    await stop();
    const store = createMessageStore(await openExpoPort());
    await store.open(owner);
    const engine = createSyncEngine({ store, owner, fetchPage: fetchSyncPage });
    session = { owner, store, engine };
    storeReader.attach(store, owner);
    engine.start();
  });

async function stop(): Promise<void> {
  const ending = session;
  session = null;
  storeReader.detach();
  ending?.engine.stop();
  await ending?.store.wipe();
}


/** Sign-out / the inbox gone: the engine stops, every row is wiped; never throws. */
export const stopInboxStore = (): Promise<void> =>
  serial(async () => {
    // No session in this run (signed out at start): the file of an earlier one goes.
    await (session ? stop() : deleteStoreFile()).catch(() => undefined);
  });

/** Something changed on the server (realtime, push, back in the foreground): sync soon. */
export const nudgeInboxStore = (): void => session?.engine.nudge();
