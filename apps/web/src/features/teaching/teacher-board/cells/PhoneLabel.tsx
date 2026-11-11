/** The column's name before a stacked cell on phones (the table head is sr-only there). */
export function PhoneLabel({ text }: { text: string }) {
  return (
    <span aria-hidden="true" className="me-1.5 text-xs text-ink-3 sm:hidden">
      {text}
    </span>
  );
}
