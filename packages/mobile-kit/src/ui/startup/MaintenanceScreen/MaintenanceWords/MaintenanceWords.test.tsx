import { render, screen } from '@testing-library/react-native';
import { type } from '../../../../theme';
import { MaintenanceWords } from './MaintenanceWords';

const loaded = (family: string) => family;
const notLoaded = () => undefined;

test('the title is a header in the display font; the body in the ui font', async () => {
  await render(<MaintenanceWords title="عنوان" body="نص" font={loaded} />);
  expect(screen.getByRole('header', { name: 'عنوان' })).toHaveStyle({ fontFamily: type.display });
  expect(screen.getByText('نص')).toHaveStyle({ fontFamily: type.ui[400] });
});

test('before the fonts load: the system font for both lines', async () => {
  await render(<MaintenanceWords title="عنوان" body="نص" font={notLoaded} />);
  expect(screen.getByRole('header', { name: 'عنوان' })).not.toHaveStyle({
    fontFamily: type.display,
  });
  expect(screen.getByText('نص')).not.toHaveStyle({ fontFamily: type.ui[400] });
});
