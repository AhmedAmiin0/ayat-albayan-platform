import { OKHTTP_SECONDS, registerFactory } from './app.plugin';

// The Expo SDK template's MainApplication.kt (the part the plugin edits).
const MAIN = `package com.example.app

import android.app.Application

class MainApplication : Application(), ReactApplication {
  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }
}
`;

const REGISTER =
  'OkHttpClientProvider.setOkHttpClientFactory(AbOkHttpClientFactory(applicationContext))';

test('registers the factory first thing in onCreate, before React Native loads', () => {
  const out = registerFactory(MAIN);
  expect(out).toContain('import com.facebook.react.modules.network.OkHttpClientProvider');
  const lines = out.split('\n').map((l) => l.trim());
  const at = lines.indexOf('super.onCreate()');
  expect(lines.slice(at + 1, at + 3)).toEqual([REGISTER, 'loadReactNative(this)']);
});

test('is idempotent (a second prebuild changes nothing)', () => {
  const once = registerFactory(MAIN);
  expect(registerFactory(once)).toBe(once);
});

test('fails the build loudly when the template changed shape', () => {
  expect(() => registerFactory('package x\nclass MainApplication')).toThrow(/super.onCreate/);
});

test("the factory keeps React Native's builder and adds the ping and the timeouts", () => {
  const kt = registerFactory(MAIN);
  expect(kt.startsWith('package com.example.app\n')).toBe(true);
  expect(kt).toContain('private class AbOkHttpClientFactory(private val context: Context)');
  expect(kt).toContain('OkHttpClientProvider.createClientBuilder(context)'); // cookie jar + cache
  expect(OKHTTP_SECONDS).toEqual({ ping: 15, connect: 15, read: 120, slowRead: 300 });
  for (const line of ['pingInterval(15L', 'connectTimeout(15L', 'readTimeout(120L']) {
    expect(kt).toContain(line);
  }
  // NetworkingModule resets a call timeout on every fetch: the whole-call deadline is apiFetch's.
  expect(kt).not.toContain('callTimeout');
});

test('one base client (one cache, one pool); each caller gets its own cookie container', () => {
  const kt = registerFactory(MAIN);
  expect(kt).toContain('private val base: OkHttpClient by lazy');
  expect(kt).toContain('base.newBuilder().cookieJar(ReactCookieJarContainer()).build()');
});

test('the read timeout waits longer than the slowest server read (a 45 s PDF render)', () => {
  // OkHttp's read timeout also covers the wait for the response headers (the first byte).
  expect(OKHTTP_SECONDS.read).toBeGreaterThanOrEqual(2 * 45);
  expect(OKHTTP_SECONDS.slowRead).toBeGreaterThan(OKHTTP_SECONDS.read);
});

/** The AB_SLOW_READ pattern the Kotlin carries, run here against sample paths. */
function slowReadPattern(kt: string): RegExp {
  const [, source = '$^'] = /AB_SLOW_READ = Regex\("(.+)"\)/.exec(kt) ?? [];
  return new RegExp(source);
}

test('chat files, PDF pages and booking media get the slow read timeout; nothing else', () => {
  const kt = registerFactory(MAIN);
  expect(kt).toContain('chain.withReadTimeout(300, TimeUnit.SECONDS)');
  const slow = slowReadPattern(kt);
  const chat = '/threads/%2B9665/messages/m1';
  for (const path of [`${chat}/file`, `${chat}/pdf/2`, '/threads/%2B9665/media/m1']) {
    expect(slow.test(path)).toBe(true);
  }
  for (const path of ['/threads', '/threads/%2B9665/media', '/threads/%2B9665/media/m1/x']) {
    expect(slow.test(path)).toBe(false);
  }
});
