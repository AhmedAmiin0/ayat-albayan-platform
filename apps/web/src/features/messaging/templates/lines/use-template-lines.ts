import type { LineCheckView, TemplateLineView, WaLine } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { linesCheckQuery } from '@/features/messaging/messaging/api';
import { templateLinesQuery } from '@/features/messaging/templates/api';

/** Each number's formatted phone, when a lines check has run in this session. */
export type PhoneMap = Partial<Record<WaLine, string>>;

/** The formatted phones of a lines check (a line Meta did not answer is left out). */
export function phonesOf(views: readonly LineCheckView[] | undefined): PhoneMap {
  const phones: PhoneMap = {};
  for (const v of views ?? []) if (v.display_phone_number) phones[v.line] = v.display_phone_number;
  return phones;
}

export interface TemplateLines {
  /** GET /messaging/templates/lines (env facts + last sync), undefined while loading. */
  lines: readonly TemplateLineView[] | undefined;
  phones: PhoneMap;
  factsOf: (line: WaLine) => TemplateLineView | undefined;
}

/**
 * The two numbers for the template section: the server's facts (no Meta call) and the phones from
 * LinesCard's last check, read from the shared cache (this hook never asks Meta for them).
 */
export function useTemplateLines(): TemplateLines {
  const facts = useQuery(templateLinesQuery);
  const check = useQuery(linesCheckQuery);
  const lines = facts.data;
  const phones = useMemo(() => phonesOf(check.data), [check.data]);
  return useMemo(() => ({ lines, phones, factsOf: (line: WaLine) => lines?.find((l) => l.line === line) }), [lines, phones]);
}
