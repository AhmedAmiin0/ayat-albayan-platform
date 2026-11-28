import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../../lib/i18n/i18n';
import { SwitchRowShowcase } from '../SwitchRow.showcase';

test('on, off, disabled both ways and an LTR row; a flip turns a live row on', async () => {
  await render(<SwitchRowShowcase />);
  expect(screen.getAllByRole('switch')).toHaveLength(5);
  const yes = screen.getByLabelText(t.common.yes);
  expect(yes.props.value).toBe(false);
  await fireEvent(yes, 'valueChange', true);
  expect(screen.getByLabelText(t.common.yes).props.value).toBe(true);
  expect(screen.getByLabelText(t.common.unset).props.disabled).toBe(true);
});
