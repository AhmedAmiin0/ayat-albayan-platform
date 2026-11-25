import { Button } from '@ab/web-kit';

interface ActionItemProps {
  label: string;
  /** What the action does (the board's line under it). */
  hint: string;
  onClick: () => void;
  danger?: boolean;
}

export function ActionItem({ label, hint, onClick, danger = false }: ActionItemProps) {
  return (
    <div className="grid justify-items-start gap-1">
      <Button type="button" variant={danger ? 'danger-quiet' : 'secondary'} onClick={onClick}>
        {label}
      </Button>
      <p className="text-xs text-ink-3">{hint}</p>
    </div>
  );
}
