import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';

/** A composer's failure line under its box (role=alert), named by its box's aria-describedby. */
export function ComposerError({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs text-danger">
      <NuqtaGlyph shape="struck" />
      <span>{text}</span>
    </p>
  );
}
