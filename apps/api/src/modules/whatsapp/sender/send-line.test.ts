import type { WaLine } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { lineOf } from './send-line';

const chat = { line: 'chat' as const };
const notifications = { line: 'notifications' as const };

interface Case {
  name: string;
  row: { template_key: string | null; line: WaLine | null };
  template: { line: WaLine } | null;
  chatOn: boolean;
  line: WaLine;
}

const CASES: Case[] = [
  { name: 'a producer template stamped chat', row: { template_key: 'booking_confirmation', line: 'chat' }, template: notifications, chatOn: true, line: 'notifications' },
  { name: 'a producer template, no stamp', row: { template_key: 'lesson_reminder', line: null }, template: notifications, chatOn: true, line: 'notifications' },
  { name: 'a chat starter, chat configured', row: { template_key: 'academy_welcome', line: null }, template: chat, chatOn: true, line: 'chat' },
  { name: 'a chat starter, one line (falls back)', row: { template_key: 'academy_welcome', line: null }, template: chat, chatOn: false, line: 'notifications' },
  { name: 'a template not in the registry', row: { template_key: 'gone', line: null }, template: null, chatOn: true, line: 'notifications' },
  { name: 'a text stamped chat', row: { template_key: null, line: 'chat' }, template: null, chatOn: true, line: 'chat' },
  { name: 'a text stamped chat, one line (due() never reads it)', row: { template_key: null, line: 'chat' }, template: null, chatOn: false, line: 'chat' },
  { name: 'a text stamped notifications', row: { template_key: null, line: 'notifications' }, template: null, chatOn: true, line: 'notifications' },
  { name: 'a text, no stamp (history / one line)', row: { template_key: null, line: null }, template: null, chatOn: false, line: 'notifications' },
];

describe('lineOf — the line a queued row leaves from (docs/12 §13.3, §13.18)', () => {
  it.each(CASES)('$name → $line', ({ row, template, chatOn, line }) => {
    expect(lineOf(row, template, chatOn)).toBe(line);
  });
});
