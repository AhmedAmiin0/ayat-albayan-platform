import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { publicConfigQuery } from '@/core/lib/query/public-config';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { TeacherLessonCard } from './TeacherLessonCard';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
  apiSend: () => Promise.resolve({}),
}));

afterEach(() => jest.restoreAllMocks());

const LINK = 'https://meet.google.com/abc';
const noop = () => undefined;

/**
 * Both ways in read «ادخل الحلقة»: the card has exactly one, and pressing it opens the fixed link or
 * not (the classroom button asks the API first, and is off outside the join window).
 */
async function pressJoin(): Promise<boolean> {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  open.mockClear(); // jest-expo's Linking.openURL is one shared mock across tests
  const buttons = screen.getAllByRole('button', { name: t.classroom.enter });
  expect(buttons).toHaveLength(1);
  await fireEvent.press(buttons[0] as (typeof buttons)[number]);
  return open.mock.calls.some(([url]) => url === LINK);
}

/** The academy setting (meeting_link_auto) counts only when the lesson carries no flag of its own. */
async function renderCard(platform: boolean | undefined, academyAuto: boolean) {
  const client = createTestQueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: academyAuto });
  const l = lesson({ id: 'l1', meeting_link: LINK, ...(platform === undefined ? {} : { platform_classroom: platform }) });
  await renderWithQuery(
    <TeacherLessonCard lesson={l} tz="Africa/Cairo" report={null} busy={false} onConfirm={noop} onReport={noop} />,
    client,
  );
}

test('platform_classroom false: the fixed link, even with the academy setting meeting_link_auto on', async () => {
  await renderCard(false, true);
  expect(await pressJoin()).toBe(true);
});

test('platform_classroom absent (cached before migration 490): the academy default ON, the classroom', async () => {
  await renderCard(undefined, true);
  expect(await pressJoin()).toBe(false);
});

test('platform_classroom absent with the academy default OFF: the fixed link', async () => {
  await renderCard(undefined, false);
  expect(await pressJoin()).toBe(true);
});

test('platform_classroom true: the platform classroom, no fixed link, even with the setting off', async () => {
  await renderCard(true, false);
  expect(await pressJoin()).toBe(false);
});
