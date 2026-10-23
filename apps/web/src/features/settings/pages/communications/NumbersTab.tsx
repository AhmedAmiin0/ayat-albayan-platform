import { LinesCard } from '@/features/messaging/LinesCard';
import { NumbersPanel } from '@/features/numbers/NumbersPanel';

/** «الأرقام»: the numbers (docs/23 phase 3) and the WhatsApp lines check, as they were. */
export function NumbersTab({ onNote }: { onNote: (message: string) => void }) {
  return (
    <div className="grid gap-8">
      <NumbersPanel query="" onSaved={onNote} />
      <LinesCard />
    </div>
  );
}
