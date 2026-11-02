import { useRef } from 'react';

/**
 * One idempotency key per body (rule 8): a retry after a 5xx / lost reply re-sends the same body
 * with the same id and gets the first package back; a changed child, price or day makes a new one.
 */
export function useBodyRequestId(): (body: object) => string {
  const request = useRef<{ body: string; id: string } | null>(null);
  return (body) => {
    const key = JSON.stringify(body);
    const held = request.current?.body === key ? request.current : null;
    const next = held ?? { body: key, id: crypto.randomUUID() };
    request.current = next;
    return next.id;
  };
}
