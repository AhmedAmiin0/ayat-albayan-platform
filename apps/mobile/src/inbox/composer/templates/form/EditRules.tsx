import { dateClockText, nextEditAt, type TemplateStatus } from '@ab/shared';
import { useViewerClock } from '@/core/lib/clock';
import { locale } from '@/core/lib/i18n/locale';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Section } from '@/core/ui/surface/Section';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';

interface EditRulesProps {
  status: TemplateStatus;
  edits: readonly string[];
  codeBound: boolean;
}

const DAY = { weekday: 'long', day: 'numeric', month: 'long' } as const;

/** When the next edit opens, read at this moment (outside render: the clock is impure). */
const nextFrom = (input: Pick<EditRulesProps, 'status' | 'edits'>): string | null =>
  nextEditAt({ ...input, now: new Date() });

/** Meta's edit rules, the code-bound one, and when the next edit opens when it is not now. */
export function EditRules({ status, edits, codeBound }: EditRulesProps) {
  const { color } = useTheme();
  const clock = useViewerClock();
  const next = nextFrom({ status, edits });
  const when = (iso: string) => dateClockText(new Date(iso), { ...clock, locale }, DAY);
  const words = t.templates.edit;
  const lines = [words.limitApproved, words.limitFixed, words.limitReview];
  return (
    <Section title={t.templates.edit.limitsTitle}>
      {lines.map((line) => (
        <AppText key={line} style={{ fontSize: type.size.xs, color: color.ink2 }}>
          {line}
        </AppText>
      ))}
      {codeBound ? <Note>{t.templates.edit.codeBound}</Note> : null}
      {next ? <Note>{t.templates.edit.nextAt.replace('{when}', when(next))}</Note> : null}
    </Section>
  );
}
