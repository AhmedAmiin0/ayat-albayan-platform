import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { TemplatePreview } from './TemplatePreview';
import { meetReminder, plainReminder } from '../shared/thread-fixtures';

// The composer's preview draws the template like WhatsApp (owner 2026-10-28).

test('the body filled in, the footer and the meeting button with the code typed so far', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderWithQuery(<TemplatePreview template={{ ...meetReminder, footer_ar: 'Ayat Al-Bayan' }} params={{ button: 'abc-defg-hij' }} />);
  expect(screen.getByText(t.inbox.composer.preview)).toBeTruthy();
  expect(screen.getByTestId('template-footer').props.children).toBe('Ayat Al-Bayan');
  fireEvent.press(screen.getByTestId('template-button-url'));
  expect(open).toHaveBeenCalledWith('https://meet.google.com/abc-defg-hij');
  open.mockRestore();
});

test('a synced header and call button come from display', async () => {
  const display = { header: { type: 'text' as const, text: 'Reminder' }, buttons: [{ type: 'phone_number' as const, text: 'Call us', phone: '+966500000000' }] };
  await renderWithQuery(<TemplatePreview template={{ ...plainReminder, display }} params={{}} />);
  expect(screen.getByText('Reminder')).toBeTruthy();
  expect(screen.getByText('Call us')).toBeTruthy();
});

test('no buttons: no rows', async () => {
  await renderWithQuery(<TemplatePreview template={{ ...plainReminder, buttons: [], display: null }} params={{}} />);
  expect(screen.queryByTestId('template-buttons')).toBeNull();
});
