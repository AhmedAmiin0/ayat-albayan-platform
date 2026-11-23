import { formatPhone, type ClockCycle, type Glyph, type NumberView, type ParityView, type Tone } from '@ab/shared';
import { t, ltr } from '@ab/mobile-kit';
import { formatAt } from '@/ops/activity/activity-format';

// Same ar.json keys as the web's numbers page.

const n = () => t.numbers;

interface ChipWords {
  tone: Tone;
  glyph: Glyph;
  label: string;
}

export function sourceLine(parity: Pick<ParityView, 'source'>): string {
  return n().source.current.replace('{{source}}', n().source[parity.source]);
}

export function parityLine(parity: Pick<ParityView, 'differences'>): string {
  const count = parity.differences.length;
  return count === 0 ? n().mobile.parityOk : n().mobile.parityDiff.replace('{{count}}', String(count));
}

/** Before the first check it says so; after a check without a number only the role shows. */
export function numberSubtitle(view: Pick<NumberView, 'purpose' | 'display_phone_e164' | 'checked_at'>): string {
  const role = n().purpose[view.purpose];
  if (view.display_phone_e164) return `${role} · ${ltr(formatPhone(view.display_phone_e164))}`;
  return view.checked_at ? role : `${role} · ${n().chips.notChecked}`;
}

/** Read-only; the driver is changed on the web. */
export function driverLine(view: Pick<NumberView, 'provider'>): string {
  return `${n().fields.provider}: ${n().provider[view.provider]}`;
}

export function stateChips(view: Pick<NumberView, 'enabled' | 'is_default'>): ChipWords[] {
  const chips: ChipWords[] = [
    view.enabled
      ? { tone: 'ok', glyph: 'fill', label: n().chips.enabled }
      : { tone: 'neutral', glyph: 'struck', label: n().chips.disabled },
  ];
  if (view.is_default) chips.push({ tone: 'neutral', glyph: 'fill', label: n().chips.default });
  return chips;
}

/** Null before the first check. */
export function healthChip(view: Pick<NumberView, 'health'>): ChipWords | null {
  if (!view.health) return null;
  return view.health.ok
    ? { tone: 'ok', glyph: 'fill', label: n().health.ok }
    : { tone: 'bad', glyph: 'struck', label: n().health.failed };
}

/** In the viewer's `tz`; null when never checked. */
export function checkedLine(view: Pick<NumberView, 'checked_at'>, cycle: ClockCycle, tz: string): string | null {
  if (!view.checked_at) return null;
  return n().chips.checkedAt.replace('{{at}}', formatAt(view.checked_at, cycle, tz));
}
