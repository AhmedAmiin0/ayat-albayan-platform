/** The template's footer under the body: small grey text, in its own direction (WhatsApp's footer). */
export function TemplateFooter({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p dir="auto" className="mt-1 text-xs text-ink-3 [overflow-wrap:anywhere]">
      {text}
    </p>
  );
}
