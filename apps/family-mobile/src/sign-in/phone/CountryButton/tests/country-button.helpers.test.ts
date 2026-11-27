import { buttonStyle } from '@/sign-in/phone/CountryButton/country-button.helpers';

test('a pressed button takes the press wash and keeps its edge; at rest it is clear', () => {
  expect(buttonStyle('edge', 'wash')({ pressed: true })).toMatchObject({
    backgroundColor: 'wash',
    borderEndColor: 'edge',
  });
  expect(buttonStyle('edge', 'wash')({ pressed: false }).backgroundColor).toBe('transparent');
});
