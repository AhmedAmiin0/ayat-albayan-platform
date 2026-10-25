import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { cn } from '@/lib/utils';

type StudentNoteProps = { text: string | null; className?: string };

/** Action note («دورك»): 9px saffron nuqta + ink 600 words, one inline run (docs/07 §6 hamish). */
export function StudentNote({ text, className }: StudentNoteProps) {
  if (!text) return null;
  return (
    <span className={cn('font-semibold text-ink', className)}>
      <NuqtaGlyph shape="fill" className="me-1.5 inline-block size-[9px] text-act" />
      {text}
    </span>
  );
}
