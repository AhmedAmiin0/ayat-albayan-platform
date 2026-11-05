import { type ConfigPlugin, withMainApplication } from 'expo/config-plugins';

// Expo config plugin (native: needs a new APK). Registers an OkHttpClientFactory, React Native's
// documented way to configure its OkHttp client, so a dead HTTP/2 connection is dropped (within
// about 30 s) instead of pinning every API read (owner 2026-11-05). Android only.

const IMPORTS = [
  'android.content.Context',
  'com.facebook.react.modules.network.OkHttpClientFactory',
  'com.facebook.react.modules.network.OkHttpClientProvider',
  'com.facebook.react.modules.network.ReactCookieJarContainer',
  'java.util.concurrent.TimeUnit',
  'okhttp3.Interceptor',
  'okhttp3.OkHttpClient',
];
const REGISTER = 'OkHttpClientProvider.setOkHttpClientFactory(AbOkHttpClientFactory(applicationContext))';
const ON_CREATE = /(override fun onCreate\(\)\s*\{\s*\n(\s*)super\.onCreate\(\)\s*\n)/;

interface Seconds {
  ping: number;
  connect: number;
  read: number;
  slowRead: number;
}

/**
 * The Kotlin appended to MainApplication.kt: React Native's own builder (cookie jar, 10 MB http
 * cache) plus an HTTP/2 ping, which is what drops a connection the network killed while the app
 * slept, and a connect timeout. The read timeout is only a backstop, well above the slowest server
 * read: it also covers the wait for the first byte (the response headers), and a chat PDF page may
 * take 45 s to render. One base client is built once (one cache directory, one connection pool to
 * ping); each caller (fetch, Fresco, WebSockets) gets it with its own cookie container, as before.
 * No call timeout: React Native's NetworkingModule replaces it on every fetch with the XHR timeout
 * (0), so the whole-call deadline of an API read lives in JS (apiFetch). Chat files, PDF pages and
 * booking media, which the API may first download from Meta and then render, read even longer.
 */
function factoryKotlin(s: Seconds): string {
  return `// plugins/okhttp-timeouts (owner 2026-11-05): chats stuck on a dead connection after a resume.
private class AbOkHttpClientFactory(private val context: Context) : OkHttpClientFactory {
  private val base: OkHttpClient by lazy {
    OkHttpClientProvider.createClientBuilder(context)
      .pingInterval(${String(s.ping)}L, TimeUnit.SECONDS)
      .connectTimeout(${String(s.connect)}L, TimeUnit.SECONDS)
      .readTimeout(${String(s.read)}L, TimeUnit.SECONDS)
      .addInterceptor(AbSlowReads)
      .build()
  }

  override fun createNewNetworkModuleClient(): OkHttpClient =
    base.newBuilder().cookieJar(ReactCookieJarContainer()).build()
}

// A chat file or PDF page, or a booking/invoice file: the API may download it first (Meta, the CRM).
private val AB_SLOW_READ = Regex("/messages/[^/]+/(file|pdf/[0-9]+)$|/threads/[^/]+/media/[^/]+$")

private object AbSlowReads : Interceptor {
  override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
    val slow = AB_SLOW_READ.containsMatchIn(chain.request().url.encodedPath)
    if (!slow) return chain.proceed(chain.request())
    return chain.withReadTimeout(${String(s.slowRead)}, TimeUnit.SECONDS).proceed(chain.request())
  }
}
`;
}

/**
 * Seconds: HTTP/2 ping, connect, read (per read, first byte included; a backstop, the ping finds
 * a dead connection), a slow read (chat file, PDF page, booking media).
 */
export const OKHTTP_SECONDS = { ping: 15, connect: 15, read: 120, slowRead: 300 } as const;

/**
 * MainApplication.kt with the imports, the factory registered first thing in onCreate (before
 * React Native builds its client) and the factory itself at the end of the file.
 */
export function registerFactory(source: string): string {
  if (source.includes(REGISTER)) return source;
  if (!ON_CREATE.test(source)) throw new Error('okhttp-timeouts: no super.onCreate() in MainApplication');
  const imports = IMPORTS.map((name) => `import ${name}`).join('\n');
  const withImports = source.replace(/^(package [^\n]+\n)/, `$1\n${imports}\n`);
  const registered = withImports.replace(ON_CREATE, (_all, head: string, indent: string) => `${head}${indent}${REGISTER}\n`);
  return `${registered.trimEnd()}\n\n${factoryKotlin(OKHTTP_SECONDS)}`;
}

/** The plugin. One self-contained file: Expo compiles a .ts plugin, not the modules it imports. */
const withOkHttpTimeouts: ConfigPlugin = (config) =>
  withMainApplication(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') throw new Error('okhttp-timeouts: MainApplication is not Kotlin');
    cfg.modResults.contents = registerFactory(cfg.modResults.contents);
    return cfg;
  });

export default withOkHttpTimeouts;
