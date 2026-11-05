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
  expect(OKHTTP_SECONDS).toEqual({ ping: 15, connect: 15, read: 30, slowRead: 120 });
  for (const line of ['pingInterval(15L', 'connectTimeout(15L', 'readTimeout(30L']) {
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

test('chat files and PDF pages get the long read timeout', () => {
  const kt = registerFactory(MAIN);
  expect(kt).toContain('Regex("/messages/[^/]+/(file|pdf/[0-9]+)$")');
  expect(kt).toContain('chain.withReadTimeout(120, TimeUnit.SECONDS)');
});
