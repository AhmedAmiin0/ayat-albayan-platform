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
  expect(OKHTTP_SECONDS).toEqual({ ping: 15, connect: 15, read: 30, call: 60 });
  for (const line of ['pingInterval(15L', 'connectTimeout(15L', 'readTimeout(30L', 'callTimeout(60L']) {
    expect(kt).toContain(line);
  }
});

test('only API (X-AB-Client) and auth calls keep the whole-call cap', () => {
  const kt = registerFactory(MAIN);
  expect(kt).toContain('request.header("X-AB-Client") != null && !AB_SLOW_READ');
  expect(kt).toContain('Regex("/messages/[^/]+/(file|pdf/[0-9]+)$")');
  expect(kt).toContain('startsWith("/auth/v1/")');
  expect(kt).toContain('(chain.call().timeout() as? AsyncTimeout)?.exit()');
});
