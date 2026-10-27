const mockUses24 = jest.fn<boolean | null, []>();
jest.mock('./device-clock', () => ({ deviceUses24: () => mockUses24() }));

type Store = typeof import('./clock-store');

/** A fresh store (the phone's setting is read once per run). */
function freshCycle(): Store['clockCycle'] {
  let cycle: Store['clockCycle'] | undefined;
  jest.isolateModules(() => {
    cycle = jest.requireActual<Store>('./clock-store').clockCycle;
  });
  if (!cycle) throw new Error('store not loaded');
  return cycle;
}

test('«auto» follows the phone: 12 h phone → 12, 24 h or unknown → 24', () => {
  mockUses24.mockReturnValue(false);
  expect(freshCycle()()).toBe('12');
  mockUses24.mockReturnValue(true);
  expect(freshCycle()()).toBe('24');
  mockUses24.mockReturnValue(null);
  expect(freshCycle()()).toBe('24');
});
