import { describe, expect, it } from 'vitest';
import { reportCards } from './report-cards';

const line = (key: string, value: string | null = key) => ({ key, label: `L ${key}`, value });

describe('reportCards: the report page’s lines on the family board', () => {
  it('attendance and the overall grade go to the hero; the rest to their cards in order', () => {
    const lines = ['attendance', 'program', 'segment.0', 'tajweed', 'overall', 'homework',
      'nextPlan', 'note'].map((k) => line(k));
    const cards = reportCards(lines);
    expect(cards.attendance?.key).toBe('attendance');
    expect(cards.overall?.key).toBe('overall');
    expect(cards.content.map((l) => l.key)).toEqual(['program', 'segment.0', 'tajweed']);
    expect(cards.todo.map((l) => l.key)).toEqual(['homework', 'nextPlan']);
    expect(cards.note?.key).toBe('note');
  });

  it('an absent lesson: attendance and the note only', () => {
    const cards = reportCards([line('attendance'), line('note', null)]);
    expect(cards.content).toEqual([]);
    expect(cards.todo).toEqual([]);
    expect(cards.overall).toBeNull();
    expect(cards.note?.value).toBeNull();
  });

  it('nothing at all: empty cards', () => {
    expect(reportCards([])).toEqual({
      attendance: null,
      overall: null,
      content: [],
      todo: [],
      note: null,
    });
  });
});
