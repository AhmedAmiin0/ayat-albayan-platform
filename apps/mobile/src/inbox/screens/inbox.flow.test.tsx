import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderApp, resetApp } from '@/test/app-router';
import { pullToRefresh } from '@/test/pull-refresh';
import { GUARDIAN_PHONE, inboxBackend } from '../shared/flow-backend';
import { inbound, PHONE } from '../shared/thread-fixtures';
import { ticksLabel } from '../shared/ticks.helpers';

beforeEach(resetApp);

const UUID = expect.stringMatching(/^[0-9a-f-]{36}$/);
const names = t.templates.names;
const labels = t.inbox.composer.paramNames;

test('list → lead thread → reply → back: tags show, the reply is sent once, the list row follows', async () => {
  const { backend } = inboxBackend();
  const app = await renderApp({ url: '/inbox', backend });
  const row = within(await screen.findByRole('button', { name: /هدى سالم/ }));
  // Tags: lead status chip, where she came from; the guardian row says «ولي أمر» and «مشترك».
  expect(row.getByText(t.enums.leadStatus.new)).toBeTruthy();
  expect(row.getByText(t.enums.leadSource.facebook_ad)).toBeTruthy();
  const other = within(screen.getByRole('button', { name: /أم يوسف/ }));
  expect(other.getByText(t.inbox.kind.guardian)).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: /هدى سالم/ }));
  expect(await screen.findByText(inbound.body ?? '')).toBeTruthy();
  expect(app.pathname()).toBe(`/inbox/thread/${PHONE}`);
  expect(backend.sent('GET /threads/:phone')).toHaveLength(1);

  await fireEvent.changeText(screen.getByLabelText(t.inbox.composer.placeholder), 'أهلًا يا هدى');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  expect(await screen.findByText('أهلًا يا هدى')).toBeTruthy();
  await waitFor(() => expect(backend.sent('POST /threads/:phone/text')).toHaveLength(1));
  expect(backend.sent('POST /threads/:phone/text')[0]).toMatchObject({
    path: '/threads/%2B966552147730/text',
    body: { text: 'أهلًا يا هدى', clientRequestId: UUID },
  });
  expect(await screen.findByLabelText(ticksLabel(t.enums.messageStatus.sent))).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(app.pathname()).toBe('/inbox');
  // Finding (not fixed here): a send only invalidates ['threads', phone], never the list
  // ['threads','list',…], so the row keeps the old preview until a pull to refresh.
  expect(within(screen.getByRole('button', { name: /هدى سالم/ })).queryByText(/أهلًا يا هدى/)).toBeNull();
  await pullToRefresh();
  expect(await within(screen.getByRole('button', { name: /هدى سالم/ })).findByText(/أهلًا يا هدى/)).toBeTruthy();
});

test('a closed session: no free text, the template sheet → params → POST /threads/:phone/template', async () => {
  const { backend } = inboxBackend();
  const app = await renderApp({ url: '/inbox', backend });
  await fireEvent.press(await screen.findByRole('button', { name: /أم يوسف/ }));
  await screen.findByText('هل الحلقة بكرة؟');
  expect(app.pathname()).toBe(`/inbox/thread/${GUARDIAN_PHONE}`);
  expect(screen.queryByLabelText(t.inbox.composer.placeholder)).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
  await fireEvent.press(await screen.findByText(names.lesson_reminder_plain));
  await fireEvent.press(screen.getByRole('radio', { name: 'الأحد 4 أكتوبر 17:00' }));
  expect(screen.getByLabelText(labels.lesson_time).props.value).toBe('17:00');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));

  await waitFor(() => expect(backend.sent('POST /threads/:phone/template')).toHaveLength(1));
  expect(backend.sent('POST /threads/:phone/template')[0]?.body).toEqual({
    key: 'lesson_reminder_plain',
    params: { '1': 'سهيلة', '2': '17:00' },
    clientRequestId: UUID,
    lessonId: 'l-1',
  });
  expect(backend.sent('POST /threads/:phone/text')).toHaveLength(0);
});

test('searching with Arabic digits sends the term as typed; the number is found, the other row goes', async () => {
  const { backend } = inboxBackend();
  await renderApp({ url: '/inbox', backend });
  await screen.findByRole('button', { name: /أم يوسف/ });
  await fireEvent.changeText(screen.getByLabelText(t.inbox.searchPlaceholder), '٥٠١١١٢');
  await waitFor(() => expect(backend.sent('GET /threads').at(-1)?.query['search']).toBe('٥٠١١١٢'));
  expect(await screen.findByRole('button', { name: /أم يوسف/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /هدى سالم/ })).toBeNull();
});
