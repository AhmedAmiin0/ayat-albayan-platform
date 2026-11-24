import { WA_LINES } from '@ab/catalog';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { TemplateLineBlock } from './TemplateLineBlock';
import type { Notice } from '@/features/messaging/templates/use-template-actions';
import type { TemplateLines as Lines } from './use-template-lines';

export interface TemplateLinesProps {
  lines: Lines;
  onNotice: (notice: Notice) => void;
}

export function TemplateLines({ lines, onNotice }: TemplateLinesProps) {
  const p = t.templates.perNumber;
  return (
    <div className="mb-4 min-w-0">
      <h3 className="mb-1 text-sm font-bold">{p.title}</h3>
      <p className="mb-2 max-w-[70ch] text-xs text-ink-2">{p.intro}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {WA_LINES.map((line) => (
          <TemplateLineBlock key={line} line={line} facts={lines.factsOf(line)} phone={lines.phones[line]} onNotice={onNotice} />
        ))}
      </div>
    </div>
  );
}
