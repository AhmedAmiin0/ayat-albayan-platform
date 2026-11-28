import { act, renderHook, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { closeChildSwitch, openChildSwitch, useChildSwitch } from '@/nav';
import { ChildSwitchSheet } from './ChildSwitchSheet';

// The children sheet is the kit Sheet on the native @expo/ui BottomSheet (the kit's jest setup
// stands in for it).

jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async () => ({ kind: 'guardian', students: [], renew_url: null })),
}));

beforeEach(() => closeChildSwitch());

test('presented while the switch is open; a swipe down (onDismiss) closes it', async () => {
  await renderWithQuery(<ChildSwitchSheet />, freshQueryClient());
  expect(screen.queryByTestId('child-switch-sheet')).toBeNull();
  await act(() => openChildSwitch());
  const sheet = screen.getByTestId('child-switch-sheet');
  expect(await screen.findByText(t.portal.app.pick.title)).toBeTruthy();
  await act(() => sheet.props.onDismiss());
  const state = await renderHook(() => useChildSwitch());
  expect(state.result.current.open).toBe(false);
});

test('sized to its rows and named for screen readers', async () => {
  await renderWithQuery(<ChildSwitchSheet />, freshQueryClient());
  await act(() => openChildSwitch());
  const sheet = screen.getByTestId('child-switch-sheet');
  expect(sheet.props.snapPoints).toBeUndefined();
  expect(screen.getByLabelText(t.portal.app.pick.title)).toBeTruthy();
});
