import { DESCRIPTION_MAX } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { entriesAnswer, entryOf } from './entries-fixtures';
import { labelOf } from './value-text';
import { WRITER } from './values-fixtures';
import { ValuesScreen } from './ValuesScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: jest.fn(),
}));
jest.mock('@/core/lib/i18n/i18n-overrides', () => ({ refreshOverrides: jest.fn() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() } }));

const d = t.mobileValues.description;
const HORIZON = labelOf('booking_horizon_weeks');

const openEditor = async () => {
  const entry = entryOf('booking_horizon_weeks', { description: 'وصف كتبه المدير', descriptionEdited: true });
  mockApiFetch.mockImplementation(entriesAnswer({ permissions: WRITER, entries: [entry] }));
  await renderWithQuery(<ValuesScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`«${HORIZON}»`) }));
  const sheet = screen.getByTestId('value-sheet');
  await fireEvent.press(await within(sheet).findByRole('button', { name: d.edit }));
  return sheet;
};

beforeEach(() => jest.clearAllMocks());

test('describing: the title is «تعديل الوصف» with the value name under it, and focus moves to it', async () => {
  const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent');
  const sheet = await openEditor();
  expect(within(sheet).getByRole('header', { name: d.title })).toBeTruthy();
  expect(within(sheet).getByText(HORIZON)).toBeTruthy();
  await waitFor(() => expect(focus).toHaveBeenCalledWith(expect.anything(), 'focus'));
});

test('the box caps the text at the limit and reads the counter as its hint', async () => {
  const sheet = await openEditor();
  const box = within(sheet).getByLabelText(d.label);
  expect(box.props.maxLength).toBe(DESCRIPTION_MAX);
  expect(box.props.accessibilityHint).toBe(`15 / ${DESCRIPTION_MAX}`);
  await fireEvent.changeText(box, 'نص');
  expect(within(sheet).getByLabelText(d.label).props.accessibilityHint).toBe(`2 / ${DESCRIPTION_MAX}`);
});
