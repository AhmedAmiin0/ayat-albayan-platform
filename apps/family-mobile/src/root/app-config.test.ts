import app from '../../app.json';

// The startup cover is the staff app's; the app keeps its own name and icons.
test('the app is named in English; its icons are its own, not the staff mark', () => {
  expect(app.expo.name).toBe('Ayat Al-Bayan');
  expect(app.expo.icon).toBe('./assets/icon.png');
  expect(JSON.stringify(app.expo)).not.toContain('../staff-mobile/assets');
});
