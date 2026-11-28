import { render, screen } from '@testing-library/react-native';
import { t } from '../../../../lib/i18n/i18n';
import { AppearancePickerShowcase } from '../AppearancePicker.showcase';

test('the picker in the app direction and in an LTR frame, each a named group of three', async () => {
  await render(<AppearancePickerShowcase />);
  expect(screen.getAllByLabelText(t.theme.label)).toHaveLength(2);
  expect(screen.getAllByRole('radio')).toHaveLength(6);
  expect(await screen.findAllByRole('radio', { name: t.theme.auto, checked: true })).toHaveLength(
    2,
  );
});
