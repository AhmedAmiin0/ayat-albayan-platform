import type { FamilyPick } from '@ab/client-core';
import { renderHook } from '@testing-library/react-native';
import { useFamilyCapture } from './use-family-capture';

// docs/56: capture stays blocked unless the profile AND the child in view are test accounts.

const mockPrevent = jest.fn();
const mockFlags: { profile: boolean; pick: FamilyPick } = {
  profile: false,
  pick: { state: 'loading' },
};
jest.mock('@ab/mobile-kit', () => ({
  ...jest.requireActual('@ab/mobile-kit'),
  usePreventCapture: (blocked: boolean) => mockPrevent(blocked),
  useIsTestAccount: (enabled: boolean) => enabled && mockFlags.profile,
}));
jest.mock('@/portal', () => ({ useFamilyPick: () => mockFlags.pick }));

const child = (is_test?: boolean): FamilyPick => ({
  state: 'one',
  student: {
    id: 's1',
    code: 'AB-0001',
    name: 'سارة',
    tz: 'Asia/Riyadh',
    contact_is_self: false,
    is_test,
  },
});

const LOADING: FamilyPick = { state: 'loading' };
const CHOOSE: FamilyPick = { state: 'choose' };

interface Case {
  signedIn: boolean;
  profile: boolean;
  pick: FamilyPick;
}

/** The last block decision for a login state. */
async function decided({ signedIn, profile, pick }: Case) {
  mockFlags.profile = profile;
  mockFlags.pick = pick;
  await renderHook(() => useFamilyCapture(signedIn));
  return mockPrevent.mock.lastCall?.[0];
}

beforeEach(() => jest.clearAllMocks());

test.each<[string, Case]>([
  ['booting or signed out', { signedIn: false, profile: true, pick: child(true) }],
  ['signed in, the child not known yet', { signedIn: true, profile: true, pick: LOADING }],
  ['a guardian with two children, none picked', { signedIn: true, profile: true, pick: CHOOSE }],
  [
    'a real guardian or student, a real child',
    { signedIn: true, profile: false, pick: child(false) },
  ],
  ['an older API without the flag', { signedIn: true, profile: true, pick: child() }],
  ['a test profile with a real child', { signedIn: true, profile: true, pick: child(false) }],
  ['a real profile with a test child', { signedIn: true, profile: false, pick: child(true) }],
])('blocked: %s', async (_name, state) => {
  expect(await decided(state)).toBe(true);
});

test('allowed only when the profile and the child in view are both test accounts', async () => {
  expect(await decided({ signedIn: true, profile: true, pick: child(true) })).toBe(false);
});

test('blocked again when the double-test case ends (another child, or signed out)', async () => {
  mockFlags.profile = true;
  mockFlags.pick = child(true);
  const view = await renderHook(
    ({ signedIn }: { signedIn: boolean }) => useFamilyCapture(signedIn),
    {
      initialProps: { signedIn: true },
    },
  );
  expect(mockPrevent).toHaveBeenLastCalledWith(false);
  mockFlags.pick = child(false);
  await view.rerender({ signedIn: true });
  expect(mockPrevent).toHaveBeenLastCalledWith(true);
  mockFlags.pick = child(true);
  await view.rerender({ signedIn: false });
  expect(mockPrevent).toHaveBeenLastCalledWith(true);
});
