import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/lib/i18n';
import { publicConfigQuery } from '@/lib/public-config';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { lesson } from '@/today/fixtures';
import { TeacherLessonCard } from './TeacherLessonCard';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
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

/** The academy setting is the opposite of the lesson's own flag: only the lesson's flag may count. */
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

test('platform_classroom absent: treated as false (fixed link)', async () => {
  await renderCard(undefined, true);
  expect(await pressJoin()).toBe(true);
});

test('platform_classroom true: the platform classroom, no fixed link, even with the setting off', async () => {
  await renderCard(true, false);
  expect(await pressJoin()).toBe(false);
});
