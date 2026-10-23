import { formatPhone, type Glyph, type NumberView, type ParityView, type Tone } from '@ab/shared';
import { t } from '@/lib/i18n';
import { ltr } from '@/ui/Ltr';
import { formatAt } from './activity-format';

// «الأرقام» in words on the phone (same ar.json keys as the web's numbers page).

const n = () => t.numbers;

export interface ChipWords {
  tone: Tone;
  glyph: Glyph;
  label: string;
}

/** «المصدر الآن: الأرقام». */
export function sourceLine(parity: Pick<ParityView, 'source'>): string {
  return n().source.current.replace('{{source}}', n().source[parity.source]);
}

/** «الإعداد مطابق» or «توجد فروق: 2». */
export function parityLine(parity: Pick<ParityView, 'differences'>): string {
  const count = parity.differences.length;
  return count === 0 ? n().mobile.parityOk : n().mobile.parityDiff.replace('{{count}}', String(count));
}

/** «دور الإشعارات · ⁦+1 555 000 1111⁩», or «لم يُفحص بعد» before the first check. */
export function numberSubtitle(view: Pick<NumberView, 'purpose' | 'display_phone_e164'>): string {
  const phone = view.display_phone_e164 ? ltr(formatPhone(view.display_phone_e164)) : n().chips.notChecked;
  return `${n().purpose[view.purpose]} · ${phone}`;
}

/** «مفعّل» ok / «متوقف» neutral struck, then «الافتراضي لدوره» when it is. */
export function stateChips(view: Pick<NumberView, 'enabled' | 'is_default'>): ChipWords[] {
  const chips: ChipWords[] = [
    view.enabled
      ? { tone: 'ok', glyph: 'fill', label: n().chips.enabled }
      : { tone: 'neutral', glyph: 'struck', label: n().chips.disabled },
  ];
  if (view.is_default) chips.push({ tone: 'neutral', glyph: 'fill', label: n().chips.default });
  return chips;
}

/** «سليم» / «فشل آخر فحص»; null before the first check. */
export function healthChip(view: Pick<NumberView, 'health'>): ChipWords | null {
  if (!view.health) return null;
  return view.health.ok
    ? { tone: 'ok', glyph: 'fill', label: n().health.ok }
    : { tone: 'bad', glyph: 'struck', label: n().health.failed };
}

/** «آخر فحص: …» in Riyadh time, or null. */
export function checkedLine(view: Pick<NumberView, 'checked_at'>): string | null {
  return view.checked_at ? n().chips.checkedAt.replace('{{at}}', formatAt(view.checked_at)) : null;
}
