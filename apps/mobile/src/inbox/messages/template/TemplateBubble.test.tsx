import type { MessageTemplateBlock, MessageView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { MessageBubble } from '../components/MessageBubble';
import { delivered, inbound, PHONE } from '../../shared/thread-fixtures';

// A template drawn like WhatsApp (owner 2026-10-28): header, body, grey footer, buttons under it.

const s = t.inbox.templateBubble;
const block = (over: Partial<MessageTemplateBlock> = {}): MessageTemplateBlock => ({ header: null, footer: null, buttons: [], ...over });
const show = (m: Partial<MessageView>) =>
  renderWithQuery(<MessageBubble message={{ ...delivered, template_key: 'lesson_reminder_meet', body: 'Salma’s lesson today', ...m }} phone={PHONE} />);

test('a text header in bold over the body, the footer under it in the small grey style', async () => {
  await show({ template: block({ header: { type: 'text', text: 'Reminder' }, footer: 'Ayat Al-Bayan' }) });
  expect(screen.getByText('Reminder')).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId('template-header').props.style).fontFamily).toBe('NotoSansArabic_700Bold');
  expect(screen.getByTestId('template-footer').props.children).toBe('Ayat Al-Bayan');
  expect(screen.getByText('Salma’s lesson today')).toBeTruthy();
});

test('a document header without a file names its kind', async () => {
  await show({ template: block({ header: { type: 'document' } }) });
  expect(screen.getByText(s.header.document)).toBeTruthy();
});

test('a URL button is a link that opens its address', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await show({ template: block({ buttons: [{ type: 'url', text: 'Join', url: 'https://meet.google.com/abc' }] }) });
  const link = screen.getByTestId('template-button-url');
  expect(link.props.accessibilityRole).toBe('link');
  expect(link.props.accessibilityLabel).toBe(s.opensLink.replace('{label}', 'Join'));
  fireEvent.press(link);
  expect(open).toHaveBeenCalledWith('https://meet.google.com/abc');
  open.mockRestore();
});

test('quick reply, call and copy code are display-only rows with their labels; no label = the kind’s', async () => {
  await show({
    template: block({
      buttons: [
        { type: 'quick_reply', text: 'Confirm' },
        { type: 'phone_number', text: 'Call us', phone: '+966500000000' },
        { type: 'copy_code', text: '' },
      ],
    }),
  });
  expect(screen.getByTestId('template-button-quick_reply').props.accessibilityLabel).toBe(s.displayOnly.replace('{label}', 'Confirm'));
  expect(screen.getByTestId('template-button-phone_number').props.accessibilityLabel).toBe(
    s.callNumber.replace('{label}', 'Call us').replace('{phone}', '+966500000000'),
  );
  expect(screen.getByText(s.button.copy_code)).toBeTruthy();
  expect(screen.getByTestId('template-button-quick_reply').props.accessibilityRole).toBeUndefined();
});

test('no block (an old row): no buttons, no header', async () => {
  await show({ template: undefined });
  expect(screen.queryByTestId('template-buttons')).toBeNull();
  expect(screen.queryByTestId('template-header')).toBeNull();
});

test('their tap on a template button: «ضغطة زرّ» over the tapped label', async () => {
  await show({ ...inbound, id: 'in-tap', body: 'Confirm', interactive_payload: { type: 'button', button: { text: 'Confirm', payload: 'confirm:l1' } } });
  expect(screen.getByTestId('tapped-button')).toBeTruthy();
  expect(screen.getByText(s.tapped)).toBeTruthy();
  expect(screen.getByText('Confirm')).toBeTruthy();
});

test('a typed text has no tap mark', async () => {
  await show({ ...inbound, id: 'in-typed', body: 'Confirm', interactive_payload: null });
  expect(screen.queryByTestId('tapped-button')).toBeNull();
});
