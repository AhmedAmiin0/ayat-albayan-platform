import { describe, expect, it } from 'vitest';
import { staffMaySend, triesAfterWindow } from './chat-send.js';

describe('staffMaySend: every staff send follows the text rule (owner 2026-11-01)', () => {
  it.each([
    { open: true, tryAfterWindow: false, staff: false, may: true, tries: false },
    { open: true, tryAfterWindow: true, staff: true, may: true, tries: false },
    { open: false, tryAfterWindow: true, staff: true, may: true, tries: true },
    { open: false, tryAfterWindow: true, staff: false, may: false, tries: false },
    { open: false, tryAfterWindow: false, staff: true, may: false, tries: false },
    { open: false, tryAfterWindow: undefined, staff: true, may: false, tries: false },
  ])('open $open, Kapso $tryAfterWindow, staff $staff → $may', ({ staff, may, tries, ...chat }) => {
    expect(staffMaySend(chat, staff)).toBe(may);
    expect(triesAfterWindow(chat, staff)).toBe(tries);
  });
});
