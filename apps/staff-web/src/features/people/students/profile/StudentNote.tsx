import { NuqtaGlyph } from '@ab/web-kit/components/ui/display/nuqta-glyph';
import { cn } from '@ab/web-kit/lib/utils';

type StudentNoteProps = { text: string | null; className?: string };

/** docs/07 §6 hamish note style. */
export function StudentNote({ text, className }: StudentNoteProps) {
  if (!text) return null;
  return (
    <span className={cn('font-semibold text-ink', className)}>
      <NuqtaGlyph shape="fill" className="me-1.5 inline-block size-[9px] text-act" />
      {text}
    </span>
  );
}
