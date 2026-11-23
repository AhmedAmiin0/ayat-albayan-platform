import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { PICKED_CHILD_KEY } from '@ab/client-core';
import { pathKey, t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { closeChildSwitch, openChildSwitch, useChildSwitch } from '#/nav/index.ts';
import { lesson, student } from '#/portal/portal.fixtures.ts';
import { ChildSwitchList } from './ChildSwitchList';

// The children sheet (owner 2026-11-16, canvas SwitchSheet, SwitchDone, Adult).

jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswers[path.split('?')[0] ?? ''] ?? {}),
}));

const ME = { id: 'g1', role: 'guardian', permissions: ['self.portal'] };
const sara = student({ id: 's1', name: 'سارة أحمد' });
const yusuf = student({ id: 's2', code: 'AB-0002', name: 'يوسف أحمد' });
const self = student({ id: 's3', code: 'AB-0003', name: 'خالد محمود', contact_is_self: true });
const report = { id: 'r1', lesson_id: 'l1', lesson_starts_at: null, sent_at: '2026-11-15T10:00:00Z' };
const mockAnswers: Record<string, unknown> = {
  '/auth/me': ME,
  '/portal/me': { kind: 'guardian', students: [sara, yusuf, self], renew_url: null },
  '/portal/students/s1/lessons': { lessons: [lesson(new Date(), 60 * 26)] },
  '/portal/students/s1/reports': { reports: [{ ...report, teacher: null, recording_id: null }] },
};

async function show() {
  const client = freshQueryClient();
  client.setQueryData(pathKey('/auth/me'), ME);
  await renderWithQuery(<ChildSwitchList />, client);
  await waitFor(() => expect(client.isFetching()).toBe(0));
}

// g1 works as يوسف on this phone.
beforeEach(async () => {
  closeChildSwitch();
  await AsyncStorage.setItem(PICKED_CHILD_KEY, JSON.stringify({ profileId: 'g1', studentId: 's2' }));
});

test('the guardian who studies first as «أنا», then the children; ✓ on the one in view', async () => {
  await show();
  await screen.findByText(/يوسف أحمد/);
  const rows = screen.getAllByRole('button');
  expect(rows[0]).toHaveTextContent(new RegExp(t.portal.app.pick.me));
  expect(rows[1]).toHaveTextContent(/سارة أحمد/);
  expect(rows[2]).toHaveTextContent(/يوسف أحمد/);
  expect(rows[2]?.props.accessibilityState).toMatchObject({ selected: true });
  expect(rows[1]?.props.accessibilityState).toMatchObject({ selected: false });
  expect(screen.getByText(/AB-0002/)).toBeTruthy();
});

test('a child with an unopened report shows «جديد» and the next lesson line', async () => {
  await show();
  expect(await screen.findByText(t.portal.newReport)).toBeTruthy();
  const next = new RegExp(t.portal.app.pick.next.split(' · ')[0] ?? '');
  expect(await screen.findByText(next)).toBeTruthy();
});

test('a press works as that child, closes the sheet and says whose page shows', async () => {
  await show();
  await act(() => openChildSwitch());
  await fireEvent.press(await screen.findByText('سارة أحمد'));
  const saved = await AsyncStorage.getItem(PICKED_CHILD_KEY);
  expect(saved).toContain('"studentId":"s1"');
  const sheet = await renderHook(() => useChildSwitch());
  expect(sheet.result.current).toEqual({
    open: false,
    notice: t.portal.app.pick.shown.replace('{name}', 'سارة'),
  });
});

test("the guardian's own row says «تُعرض الآن صفحتك»", async () => {
  await show();
  await fireEvent.press(await screen.findByText(t.portal.app.pick.me));
  const sheet = await renderHook(() => useChildSwitch());
  expect(sheet.result.current.notice).toBe(t.portal.app.pick.shownSelf);
});
