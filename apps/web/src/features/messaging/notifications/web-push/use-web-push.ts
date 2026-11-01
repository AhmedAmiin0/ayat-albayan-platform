import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { webPushKeyQuery } from '@/features/messaging/notifications/api';
import { rebindWebPush, subscribeWebPush, unsubscribeWebPush } from './web-push';
import { readPushEnv, webPushSupport, type WebPushSupport } from './web-push-support';

/** What the toggle shows: the browser's support, then the server's key, then this browser's state. */
export type WebPushView = Exclude<WebPushSupport, 'ready'> | 'not-configured' | 'loading' | 'on' | 'off';

export interface WebPushState {
  view: WebPushView;
  busy: boolean;
  /** The last enable / disable failed («تعذّر تغيير إشعارات المتصفح»). */
  failed: boolean;
  enable: () => void;
  disable: () => void;
}

interface ViewInput {
  support: WebPushSupport;
  publicKey: string | null | undefined;
  subscribed: boolean | null;
}

export function webPushView({ support, publicKey, subscribed }: ViewInput): WebPushView {
  if (support !== 'ready') return support;
  if (publicKey === null) return 'not-configured';
  if (publicKey === undefined || subscribed === null) return 'loading';
  return subscribed ? 'on' : 'off';
}

/**
 * Browser push for the toggle at the foot of the bell panel. Reads only on mount (support, the
 * server key, an existing subscription, re-bound to this session); the permission prompt comes
 * from enable(), i.e. a click.
 */
export function useWebPush(): WebPushState {
  const [support, setSupport] = useState(() => webPushSupport(readPushEnv()));
  const key = useQuery({ ...webPushKeyQuery, enabled: support === 'ready' });
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (support !== 'ready') return;
    let live = true;
    rebindWebPush().then(
      (s) => live && setSubscribed(s !== null),
      () => live && setSubscribed(false),
    );
    return () => {
      live = false;
    };
  }, [support]);

  const run = (task: () => Promise<boolean>) => {
    setBusy(true);
    setFailed(false);
    task()
      .then(setSubscribed, () => setFailed(true))
      .finally(() => {
        setBusy(false);
        setSupport(webPushSupport(readPushEnv())); // a refused prompt turns into «محظورة»
      });
  };
  return {
    view: key.isError ? 'off' : webPushView({ support, publicKey: key.data?.publicKey, subscribed }),
    busy,
    failed: failed || key.isError,
    enable: () =>
      run(async () => {
        const publicKey = key.data?.publicKey ?? (await key.refetch({ throwOnError: true })).data?.publicKey;
        if (!publicKey) throw new Error('web push is not configured');
        return (await subscribeWebPush(publicKey)) === 'subscribed';
      }),
    disable: () =>
      run(async () => {
        await unsubscribeWebPush();
        return false;
      }),
  };
}
