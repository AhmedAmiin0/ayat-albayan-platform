import { cn } from '@/lib/utils';

// Funnel colours: open → blue/amber, trial → violet, won → green, closed → grey.
const TONES: Record<string, string> = {
  new: 'bg-sky-100 text-sky-800',
  contacted: 'bg-blue-100 text-blue-800',
  interested_no_slot: 'bg-amber-100 text-amber-800',
  no_reply: 'bg-orange-100 text-orange-800',
  trial_booked: 'bg-violet-100 text-violet-800',
  trial_done: 'bg-purple-100 text-purple-800',
  converted: 'bg-emerald-100 text-emerald-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-zinc-200 text-zinc-700',
  rejected: 'bg-zinc-200 text-zinc-700',
};

/** Pill for a lead or job-applicant status; `label` comes from ar.json enums. */
export function StatusChip({ status, label }: { status: string; label: string }) {
  return (
    <span
      data-status={status}
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
        TONES[status] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}
