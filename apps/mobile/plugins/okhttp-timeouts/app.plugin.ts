import { type ConfigPlugin, withMainApplication } from 'expo/config-plugins';

// Expo config plugin (native: needs a new APK). Registers an OkHttpClientFactory, React Native's
// documented way to configure its OkHttp client, so a dead HTTP/2 connection is dropped within
// seconds instead of pinning every API read (owner 2026-11-05). Android only.

const IMPORTS = [
  'android.content.Context',
  'com.facebook.react.modules.network.OkHttpClientFactory',
  'com.facebook.react.modules.network.OkHttpClientProvider',
  'java.util.concurrent.TimeUnit',
  'okhttp3.Interceptor',
  'okhttp3.OkHttpClient',
  'okio.AsyncTimeout',
];
const REGISTER = 'OkHttpClientProvider.setOkHttpClientFactory(AbOkHttpClientFactory(applicationContext))';
const ON_CREATE = /(override fun onCreate\(\)\s*\{\s*\n(\s*)super\.onCreate\(\)\s*\n)/;

interface Seconds {
  ping: number;
  connect: number;
  read: number;
  call: number;
}

/**
 * The Kotlin appended to MainApplication.kt. React Native's own builder (cookie jar for fetch and
 * Fresco, 10 MB http cache) plus what it lacks: an HTTP/2 ping that drops a connection the network
 * killed while the app slept, and timeouts. The whole-call cap is for the Nest API (it tags
 * every request with X-AB-Client) and Supabase auth only: signed Storage uploads (chat files,
 * voice notes, receipts), chat files and PDF pages the API renders, images and anything else may
 * run longer, so their call timeout is dropped before they start; a stalled read still ends at
 * the read timeout. WebSockets copy this client, and OkHttp
 * ends the call timeout once a socket is upgraded.
 */
function factoryKotlin(s: Seconds): string {
  return `// plugins/okhttp-timeouts (owner 2026-11-05): chats stuck on a dead connection after a resume.
private class AbOkHttpClientFactory(private val context: Context) : OkHttpClientFactory {
  override fun createNewNetworkModuleClient(): OkHttpClient =
    OkHttpClientProvider.createClientBuilder(context)
      .pingInterval(${String(s.ping)}L, TimeUnit.SECONDS)
      .connectTimeout(${String(s.connect)}L, TimeUnit.SECONDS)
      .readTimeout(${String(s.read)}L, TimeUnit.SECONDS)
      .callTimeout(${String(s.call)}L, TimeUnit.SECONDS)
      .addInterceptor(AbWholeCallCap)
      .build()
}

// A chat file or PDF page: the API may fetch it from Meta first, then render it (the app allows 120 s).
private val AB_SLOW_READ = Regex("/messages/[^/]+/(file|pdf/[0-9]+)$")

private object AbWholeCallCap : Interceptor {
  override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
    val request = chain.request()
    val path = request.url.encodedPath
    val api = request.header("X-AB-Client") != null && !AB_SLOW_READ.containsMatchIn(path)
    val capped = api || path.startsWith("/auth/v1/")
    if (!capped) (chain.call().timeout() as? AsyncTimeout)?.exit()
    return chain.proceed(request)
  }
}
`;
}

/** Seconds: HTTP/2 ping, connect, read (per read, not the whole body), the whole API call. */
export const OKHTTP_SECONDS = { ping: 15, connect: 15, read: 30, call: 60 } as const;

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
