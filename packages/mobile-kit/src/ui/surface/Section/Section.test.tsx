import { render, screen } from '@testing-library/react-native';
import { AppText } from '../../primitives/AppText';
import { Section } from './Section';

test('a section: the title is a header and the content follows it', async () => {
  await render(
    <Section title="الحساب">
      <AppText>المحتوى</AppText>
    </Section>,
  );
  expect(screen.getByRole('header', { name: 'الحساب' })).toBeTruthy();
  expect(screen.getByText('المحتوى')).toBeTruthy();
});
