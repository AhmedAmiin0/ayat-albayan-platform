import { EVOLUTION_EVENTS, type EvolutionEvent } from '@ab/shared';
import { useId } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { defaultEvents } from './config-draft';

const w = t.numbers.evolution.config.webhook;

export interface WebhookEventsProps {
  events: readonly EvolutionEvent[];
  error?: string;
  onChange: (events: EvolutionEvent[]) => void;
}

/** Ticked or not, kept in Evolution's own order. */
const toggled = (events: readonly EvolutionEvent[], event: EvolutionEvent) =>
  EVOLUTION_EVENTS.filter((e) => (e === event) !== events.includes(e));

/** «الأحداث المرسلة»: one checkbox per Evolution event (names as Evolution spells them). */
export function WebhookEvents({ events, error, onChange }: WebhookEventsProps) {
  const hintId = useId();
  return (
    <fieldset aria-describedby={hintId} className="grid gap-2">
      <legend className="text-sm font-semibold">{w.events}</legend>
      <p id={hintId} className="text-xs text-ink-3">{w.eventsHint}</p>
      <div dir="ltr" className="grid gap-1 sm:grid-cols-2">
        {EVOLUTION_EVENTS.map((event) => (
          <label key={event} className="flex min-h-11 items-center gap-2 font-mono text-xs sm:min-h-0">
            <input
              type="checkbox"
              checked={events.includes(event)}
              onChange={() => onChange(toggled(events, event))}
            />
            {event}
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <Button type="button" size="sm" variant="ghost" onClick={() => onChange(defaultEvents())}>
        {w.defaults}
      </Button>
    </fieldset>
  );
}
