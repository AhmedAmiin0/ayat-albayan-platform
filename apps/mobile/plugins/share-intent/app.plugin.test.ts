import { addShareIntake } from './app.plugin';

// The Expo SDK 57 template's MainActivity.kt (the parts the plugin edits).
const MAIN = `package com.example.app

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"
}
`;

const out = addShareIntake(MAIN, 'ayatalbayan');
const lines = out.split('\n').map((l) => l.trim());

test('the generated MainActivity.kt (snapshot: review any change against docs/38 corrections 2 and 3)', () => {
  expect(out).toMatchSnapshot();
});

test('a stale share is dropped first thing in onCreate, before super.onCreate runs the listeners', () => {
  const at = lines.indexOf('override fun onCreate(savedInstanceState: Bundle?) {');
  expect(lines.slice(at + 1, at + 4)).toEqual([
    'abDropStaleShare(this, savedInstanceState)',
    'setTheme(R.style.AppTheme);',
    'super.onCreate(null)',
  ]);
  expect(out).toContain('savedInstanceState == null && !fromHistory');
  expect(out).toContain('Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY');
});

test('a restored activity also drops the VIEW share URL (font size, density: process alive)', () => {
  expect(out).toContain('intent.data?.toString() == "ayatalbayan://expo-sharing"');
  expect(out).toContain('val stale = abIsShare(activity.intent) || abIsShareView(activity.intent)');
  expect(out).toContain('if (!stale || (savedInstanceState == null && !fromHistory)) return');
});

test('onNewIntent takes the share BEFORE super (the delegate may return early while the app loads)', () => {
  const at = lines.indexOf('override fun onNewIntent(intent: Intent) {');
  expect(lines.slice(at + 1, at + 3)).toEqual(['abTakeShare(this, intent)', 'super.onNewIntent(intent)']);
});

test('the share is kept for expo-sharing and the intent becomes the VIEW URL +native-intent routes', () => {
  expect(out).toContain('SharingSingleton.intent = Intent(intent)');
  expect(out).toContain('intent.action = Intent.ACTION_VIEW');
  expect(out).toContain('intent.data = Uri.parse("ayatalbayan://expo-sharing")');
  expect(out).toContain('activity.intent = intent');
  expect(out).toContain('import expo.modules.sharing.SharingSingleton');
});

test('is idempotent (a second prebuild changes nothing) and keeps imports single', () => {
  expect(addShareIntake(out, 'ayatalbayan')).toBe(out);
  expect(out.match(/^import android\.os\.Bundle$/gm)).toHaveLength(1);
});

test('fails the build loudly when the template changed shape', () => {
  expect(() => addShareIntake('package x\nclass MainActivity', 'ayatalbayan')).toThrow(/onCreate/);
});
