import { appKind } from './app-kind';

const mockExtra: { current: unknown } = { current: undefined };
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: mockExtra.current };
    },
  },
}));

test.each([
  [{ appVariant: 'family' }, 'family'],
  [{ appVariant: 'stripetest' }, 'staff'],
  [{ eas: { projectId: 'p' } }, 'staff'],
  [undefined, 'staff'],
])('extra %j → the %s app', (extra, kind) => {
  mockExtra.current = extra;
  expect(appKind()).toBe(kind);
});
