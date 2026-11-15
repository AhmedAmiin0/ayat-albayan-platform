import { Button } from '@/components/ui/form/button';

export interface ConvertRowProps {
  hint: string;
  label: string;
  /** false when the API would refuse (the hint says why). */
  allowed: boolean;
  onAsk: () => void;
}

/** One conversion: its explanation and its button, which asks for the confirm. */
export function ConvertRow({ hint, label, allowed, onAsk }: ConvertRowProps) {
  return (
    <section className="grid gap-2">
      <p className="text-sm text-ink-3">{hint}</p>
      <Button type="button" variant="secondary" disabled={!allowed} onClick={onAsk}>
        {label}
      </Button>
    </section>
  );
}
