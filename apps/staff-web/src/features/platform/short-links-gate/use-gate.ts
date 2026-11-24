import {
  type GateScreen, type GateStep, type GateViewResult, gateScreen, openTarget,
} from '@ab/client-core';
import type { AccountProfile, ShortLinkGateView, ShortLinkOpenResult } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { signOut } from '@ab/web-kit/auth/sign-in';
import { profileQuery } from '@/features/people/account';
import { type Me, meQuery } from '@/features/people/auth';
import { gateSends, gateViewQuery } from './gate-api';
import { type GatePhone, useGatePhone } from './use-gate-phone';

/** The page's way to the target: a full load (the target may be another site). */
export type Go = (url: string) => void;

export interface Gate {
  code: string;
  screen: GateScreen;
  /** The link's title, shown once the visitor is known (signed in, or after the code). */
  title: string | null;
  codesAvailable: boolean;
  /** The view could not be read (not a 404): the loading screen says so. */
  failed: boolean;
  signedIn: boolean;
  name: string;
  /** The target once the outcome is open, for the manual fallback link. */
  target: string | null;
  opening: boolean;
  openFailed: boolean;
  open: () => void;
  otherPhone: () => void;
  signOut: () => Promise<void>;
  phone: GatePhone;
}

const viewOf = (data: GateViewResult | undefined): ShortLinkGateView | null =>
  data?.kind === 'view' ? data.view : null;

/** What the card shows of the view: the title (null = hidden) and whether codes can go out. */
function shownOf(data: GateViewResult | undefined): Pick<Gate, 'title' | 'codesAvailable'> {
  const known = viewOf(data);
  return { title: known?.title ?? null, codesAvailable: known?.codesAvailable ?? true };
}

/** The profile's name, else the login's email. */
const nameOf = (profile: AccountProfile | undefined, me: Me | null | undefined): string =>
  profile?.full_name ?? me?.email ?? '';

/**
 * The web gate /l/<code> (docs/19 «Gate flow»): the public view, the session (meQuery, as the
 * other public pages read it), the visitor's step and the last open / verify answer give the
 * screen (client-core gateScreen); outcome open navigates to the target.
 */
export function useGate(code: string, go: Go): Gate {
  const queryClient = useQueryClient();
  const view = useQuery({ ...gateViewQuery(code), retry: false });
  const me = useQuery({ ...meQuery, retry: false });
  const signedIn = Boolean(me.data);
  const profile = useQuery({ ...profileQuery, enabled: signedIn });
  const [step, setStep] = useState<GateStep>('start');
  const [result, setResult] = useState<ShortLinkOpenResult | null>(null);
  const settle = (answer: ShortLinkOpenResult) => {
    setResult(answer);
    const target = openTarget(answer);
    if (target !== null) go(target);
  };
  const phone = useGatePhone({ code, onStep: setStep, onResult: settle });
  const opener = useMutation({ mutationFn: gateSends.open, onSuccess: settle });
  const restart = (next: GateStep) => {
    setResult(null);
    setStep(next);
  };
  return {
    code, signedIn, phone,
    screen: gateScreen({ view: me.isPending ? undefined : view.data, signedIn, step, result }),
    ...shownOf(view.data),
    failed: view.isError,
    name: nameOf(profile.data, me.data),
    target: openTarget(result),
    opening: opener.isPending,
    openFailed: opener.isError,
    open: () => opener.mutate(code),
    otherPhone: () => restart('phone'),
    signOut: async () => {
      await signOut(queryClient);
      queryClient.setQueryData(meQuery.queryKey, null);
      restart('start');
    },
  };
}
