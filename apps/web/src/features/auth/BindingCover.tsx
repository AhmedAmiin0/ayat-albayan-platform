import { PROGRAMS } from '@ab/shared';
import { Mark } from '@/components/ui/mark';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// The binding (docs/07 §1, §5): Mamluk tooled leather, gold fillets, four corner pieces and a
// central mandorla holding the mark. Login screen ONLY. Decorative, so aria-hidden. The corner
// pieces are genuinely physical, so they use left/right (docs/07 §14.1 exception).
const CORNERS = [
  'top-[30px] left-[30px] shell:top-[52px] shell:left-[52px]',
  'top-[30px] right-[30px] -scale-x-100 shell:top-[52px] shell:right-[52px]',
  'bottom-[30px] left-[30px] -scale-y-100 shell:bottom-[52px] shell:left-[52px]',
  'bottom-[30px] right-[30px] -scale-100 shell:bottom-[52px] shell:right-[52px]',
];

function Corner({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" className={cn('absolute size-16 text-gold-on-cover shell:size-[132px]', className)}>
      <path className="fill-leather-deep" stroke="currentColor" strokeWidth="1.2" d="M0 0H96A22 22 0 0 1 88.7 36.7A22 22 0 0 1 67.9 67.9A22 22 0 0 1 36.7 88.7A22 22 0 0 1 0 96Z" />
      <path fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth=".9" d="M84 0A18 18 0 0 1 77.6 32.1A18 18 0 0 1 59.4 59.4A18 18 0 0 1 32.1 77.6A18 18 0 0 1 0 84" />
      <path fill="none" stroke="currentColor" strokeOpacity=".4" strokeWidth=".8" strokeDasharray="1.5 3" d="M66 0A66 66 0 0 1 0 66" />
      <path fill="currentColor" d="M34 26 42 34 34 42 26 34Z" />
    </svg>
  );
}

function Mandorla() {
  return (
    <span className="relative grid h-[138px] w-[92px] place-items-center text-gold-on-cover shell:h-[252px] shell:w-[168px]">
      <svg viewBox="0 0 200 300" className="absolute inset-0 size-full">
        <path d="M100 6 106 12 100 18 94 12Z" fill="currentColor" />
        <path d="M100 282 106 288 100 294 94 288Z" fill="currentColor" />
        <path className="fill-leather-deep" stroke="currentColor" strokeWidth="1.5" d="M100 22C150 72 170 118 170 150S150 228 100 278C50 228 30 182 30 150S50 72 100 22Z" />
        <path fill="none" stroke="currentColor" strokeOpacity=".5" d="M100 40C141 84 157 122 157 150S141 216 100 260C59 216 43 178 43 150S59 84 100 40Z" />
        <path fill="none" stroke="currentColor" strokeOpacity=".35" strokeDasharray="1.5 3.5" d="M100 54C133 92 145 126 145 150S133 208 100 246C67 208 55 174 55 150S67 92 100 54Z" />
      </svg>
      <Mark size={64} className="relative size-[35px] text-gold-on-cover shell:size-16" />
    </span>
  );
}

export function BindingCover() {
  return (
    <div
      aria-hidden="true"
      className="ab-binding relative isolate order-first grid min-h-[300px] place-items-center overflow-hidden text-cover-ink shell:order-none shell:min-h-screen"
    >
      <div className="absolute inset-3.5 border border-gold-on-cover shell:inset-[26px]">
        <div className="absolute inset-[5px] border border-gold-on-cover/55" />
      </div>
      <div className="ab-blind absolute inset-[30px] shell:inset-[52px]" />
      {CORNERS.map((c) => (
        <Corner key={c} className={c} />
      ))}
      <div className="relative grid justify-items-center gap-1.5 text-center">
        <Mandorla />
        <b className="font-display text-[28px] leading-[1.4] text-gold-on-cover shell:text-[40px]">{t.app.brand}</b>
        <small className="text-sm opacity-90">{PROGRAMS.map((p) => t.enums.program[p]).join(t.teachers.listSeparator)}</small>
      </div>
    </div>
  );
}
