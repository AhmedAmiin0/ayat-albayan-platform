import { slotWindow } from './use-slot-week';

// Moved with the staff picker (the family's «اطلب موعدًا آخر» pages the same Riyadh weeks).
test('a Riyadh week: from its Saturday midnight, never before now', () => {
  const now = new Date('2026-11-16T10:00:00.000Z');
  expect(slotWindow('2026-11-21', now)).toEqual({
    from: '2026-11-20T21:00:00.000Z',
    to: '2026-11-27T21:00:00.000Z',
  });
  expect(slotWindow('2026-11-14', now)).toEqual({
    from: '2026-11-16T10:00:00.000Z',
    to: '2026-11-20T21:00:00.000Z',
  });
});
