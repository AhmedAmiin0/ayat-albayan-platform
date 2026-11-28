import type { ShortLinkGateView, ShortLinkOpenResult, ShortLinkOutcome } from '@ab/shared';
import { z } from 'zod';
import type { GateViewResult } from './api';

// The web gate /l/<code> of a managed link (docs/19 «Gate»; boards docs/design/short-links/
// LinkXGate*.dc.html): which screen shows, from the public view, the session, the visitor's
// own step and the last open / verify answer. Ordered rules, the first that holds wins.

export const GATE_SCREENS = [
  'loading',
  'signed_in',
  'phone',
  'code',
  'full',
  'restricted',
  'expired',
  'revoked',
  'not_found',
  /** outcome open: the app navigates to the target. */
  'opening',
] as const;
export type GateScreen = (typeof GATE_SCREENS)[number];

/** `start` is what the session offers; `phone` confirms another number. */
export type GateStep = 'start' | 'phone' | 'code';

export interface GateState {
  /** The view query's data; undefined while it loads. */
  view: GateViewResult | undefined;
  signedIn: boolean;
  step: GateStep;
  /** Null before an answer, or after choosing to confirm another number. */
  result: ShortLinkOpenResult | null;
}

type GoneScreen = Extract<GateScreen, 'expired' | 'revoked'>;

/** Why a gone link is gone; a link that turned gone after the view loaded reads as expired. */
export const goneScreen = (view: ShortLinkGateView | null): GoneScreen =>
  view?.goneReason ?? 'expired';

const viewOf = (s: GateState): ShortLinkGateView | null =>
  s.view?.kind === 'view' ? s.view.view : null;

/** Only an http(s) URL is ever navigated to (never javascript:, data:, …). */
const webUrl = z.url({ protocol: /^https?$/ });

/** The target to navigate to once the outcome is open and it is http(s), else null. */
export function openTarget(result: ShortLinkOpenResult | null): string | null {
  const target = result?.outcome === 'open' ? result.target : null;
  const parsed = webUrl.safeParse(target);
  return parsed.success ? parsed.data : null;
}

type OutcomeRule = (view: ShortLinkGateView | null, result: ShortLinkOpenResult) => GateScreen;

const OUTCOME_SCREEN: Record<ShortLinkOutcome, OutcomeRule> = {
  /** An open answer with a target that is not http(s) is a dead end, never a navigation. */
  open: (_view, result) => (openTarget(result) === null ? 'not_found' : 'opening'),
  gone: goneScreen,
  not_allowed: () => 'restricted',
  limit_reached: () => 'full',
};

/** The screen an open / verify answer leads to (`view`: the gate view, for a gone link). */
export function outcomeScreen(
  result: ShortLinkOpenResult,
  view: ShortLinkGateView | null,
): GateScreen {
  return OUTCOME_SCREEN[result.outcome](view, result);
}

type Rule = readonly [(s: GateState) => boolean, (s: GateState) => GateScreen];

const isGone = (s: GateState): boolean => viewOf(s)?.state === 'gone';
const hasResult = (s: GateState): boolean => s.result !== null;
const onStep = (step: GateStep) => (s: GateState): boolean => s.step === step;

const RULES: readonly Rule[] = [
  [(s) => s.view === undefined, () => 'loading'],
  [(s) => s.view?.kind === 'not_found', () => 'not_found'],
  [isGone, (s) => goneScreen(viewOf(s))],
  [hasResult, (s) => (s.result ? outcomeScreen(s.result, viewOf(s)) : 'loading')],
  [onStep('code'), () => 'code'],
  [onStep('phone'), () => 'phone'],
  [(s) => s.signedIn, () => 'signed_in'],
];

/** The gate's screen now. */
export function gateScreen(state: GateState): GateScreen {
  const hit = RULES.find(([holds]) => holds(state));
  return hit ? hit[1](state) : 'phone';
}

/** Screens with nothing left to do but read (no button to the target). */
const DEAD_ENDS = new Set<GateScreen>(['full', 'expired', 'revoked', 'not_found']);
export const isDeadEnd = (screen: GateScreen): boolean => DEAD_ENDS.has(screen);
