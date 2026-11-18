/** A family lesson card's mint date tile: «الأحد» over «16». Decorative (the heading says it). */
export function DateTile({ weekday, day }: { weekday: string; day: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-[58px] shrink-0 place-content-center justify-items-center rounded-[14px]
        bg-fam-mint text-fam-mint-ink"
    >
      <span className="text-xs font-bold leading-snug">{weekday}</span>
      <span className="text-xl font-extrabold leading-tight text-ink">{day}</span>
    </span>
  );
}
