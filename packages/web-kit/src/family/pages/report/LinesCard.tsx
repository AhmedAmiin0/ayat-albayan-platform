import type { ReportLine } from '@ab/client-core';
import type { IconName } from '@ab/web-kit/components/ui/display/icon';
import { FamilyCard, type CardTone } from '@ab/web-kit/family/layout/FamilyCard';
import { CardHead } from '@ab/web-kit/family/pages/CardHead';
import { cn } from '@ab/web-kit/lib/utils';
import { LineTile, type LineEdge } from './LineTile';

/** How one of the report's cards looks: its id, title, icon and colours. */
export interface LinesLook {
  id: string;
  title: string;
  icon: IconName;
  tone: CardTone & LineEdge;
  /** Two tiles a row from the small breakpoint (the content card). */
  wide?: boolean;
}

interface Props {
  look: LinesLook;
  lines: readonly ReportLine[];
  /** Under the tiles («عُدّل التقرير بعد إرساله»). */
  footer?: string | null;
}

/** A report card (boards: «محتوى الحلقة», «ما المطلوب…», «ملاحظات…»): heading and line tiles. */
export function LinesCard({ look, lines, footer }: Props) {
  if (lines.length === 0) return null;
  return (
    <FamilyCard as="section" tone={look.tone} labelledBy={look.id} className="grid gap-4">
      <CardHead id={look.id} icon={look.icon} tone={look.tone} title={look.title} />
      <dl className={cn('grid gap-3', look.wide && 'sm:grid-cols-2')}>
        {lines.map((line) => (
          <LineTile key={line.key} line={line} edge={look.tone} />
        ))}
      </dl>
      {footer && <p className="text-xs text-ink-3">{footer}</p>}
    </FamilyCard>
  );
}
