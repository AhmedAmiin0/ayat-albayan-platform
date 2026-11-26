export function DayChip({ text }: { text: string }) {
  return (
    <li className="flex justify-center py-1" role="presentation">
      <span className="rounded-full border border-rule bg-page px-3 py-0.5 text-2xs font-semibold text-ink-2">
        {text}
      </span>
    </li>
  );
}
