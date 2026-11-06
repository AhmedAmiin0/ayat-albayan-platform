import { backOr, backWithin, pushInTab } from './back-within';

const mockRouter = { canDismiss: jest.fn(), back: jest.fn(), replace: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
}));

beforeEach(() => jest.clearAllMocks());

test('a screen beneath in the stack: back pops it, the fallback is unused', () => {
  mockRouter.canDismiss.mockReturnValue(true);
  backWithin('/students');
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test('alone in its stack (tab history only): replace with the tab list, never back to Today', () => {
  mockRouter.canDismiss.mockReturnValue(false);
  backWithin('/students');
  expect(mockRouter.replace).toHaveBeenCalledWith('/students');
  expect(mockRouter.back).not.toHaveBeenCalled();
});

test('backOr: a function fallback runs only when nothing is beneath', () => {
  const fallback = jest.fn();
  mockRouter.canDismiss.mockReturnValue(true);
  backOr(fallback);
  expect(fallback).not.toHaveBeenCalled();
  mockRouter.canDismiss.mockReturnValue(false);
  backOr(fallback);
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

test('pushInTab anchors the tab list beneath the pushed screen', () => {
  pushInTab('/students/s1');
  expect(mockRouter.push).toHaveBeenCalledWith('/students/s1', { withAnchor: true });
});
