import type { GateScreen } from '@ab/client-core';
import type { ReactNode } from 'react';
import { BrandLockup } from '@ab/web-kit/components/shell/BrandLockup';
import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { StatusCard } from '@/features/platform/short-links-gate/parts/StatusCard';
import { CodeScreen } from '@/features/platform/short-links-gate/screens/CodeScreen';
import { PhoneScreen } from '@/features/platform/short-links-gate/screens/PhoneScreen';
import { RestrictedScreen } from '@/features/platform/short-links-gate/screens/RestrictedScreen';
import { SignedInScreen } from '@/features/platform/short-links-gate/screens/SignedInScreen';
import { LoadingScreen, OpeningScreen } from '@/features/platform/short-links-gate/screens/WaitScreen';
import { type Gate, type Go, useGate } from '@/features/platform/short-links-gate/use-gate';

const SCREENS: Readonly<Record<GateScreen, (gate: Gate) => ReactNode>> = {
  loading: (gate) => <LoadingScreen gate={gate} />,
  signed_in: (gate) => <SignedInScreen gate={gate} />,
  phone: (gate) => <PhoneScreen gate={gate} />,
  code: (gate) => <CodeScreen gate={gate} />,
  full: () => <StatusCard kind="full" />,
  restricted: (gate) => <RestrictedScreen gate={gate} />,
  expired: () => <StatusCard kind="expired" />,
  revoked: () => <StatusCard kind="revoked" />,
  not_found: () => <StatusCard kind="not_found" />,
  opening: (gate) => <OpeningScreen gate={gate} />,
};

/** The boards draw no language switch beside the continue-as button (the login's own language). */
const NO_LANGUAGE: ReadonlySet<GateScreen> = new Set<GateScreen>(['signed_in']);

const assign: Go = (url) => window.location.assign(url);

interface Props {
  code: string;
  /** Test seam: the navigation to the target (a full load). */
  go?: Go;
}

/**
 * /l/<code>, the web gate of a managed short link (docs/19 «Gate flow»; boards
 * docs/design/short-links/LinkXGate*.dc.html): no login, no app shell. The academy's lockup, the
 * screen of the moment (client-core gateScreen), then the other language.
 */
export function GatePage({ code, go = assign }: Props) {
  const gate = useGate(code, go);
  return (
    <main className="grid min-h-dvh items-center justify-items-center bg-margin px-6 py-6 sm:py-10">
      <div className="grid w-full max-w-[400px] gap-4">
        <div className="mb-3">
          <BrandLockup />
        </div>
        {SCREENS[gate.screen](gate)}
        {!NO_LANGUAGE.has(gate.screen) && <LanguageSwitch className="justify-self-center" />}
      </div>
    </main>
  );
}
