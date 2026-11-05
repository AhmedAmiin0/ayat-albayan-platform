import { type ConfigPlugin, withMainActivity } from 'expo/config-plugins';

// Expo config plugin (native: needs a new APK), docs/38 «Review corrections» 2 and 3. expo-sharing's
// own listener misses a share in two states, and replays an old one in a third:
// - the process is dead but the task sits in Recents: Android re-creates MainActivity from the task's
//   MAIN intent and hands the SEND to onNewIntent before expo-updates lets the delegate run, so the
//   listener never sees it. Here it is taken first: kept in SharingSingleton, and the activity's
//   intent becomes VIEW <scheme>://expo-sharing, which getInitialURL (cold) or React's VIEW emit
//   (warm) carries to app/+native-intent.ts;
// - a relaunch from history (Recents, or the launcher after process death) re-creates the activity
//   from the original SEND: that stale share is dropped before super.onCreate.

const MARK = '// plugins/share-intent (docs/38)';
const IMPORTS = ['android.app.Activity', 'android.content.Intent', 'android.net.Uri', 'expo.modules.sharing.SharingSingleton'];
const ON_CREATE = /(override fun onCreate\(savedInstanceState: Bundle\?\)\s*\{\s*\n)(\s*)/;
const CLASS_OPEN = /(class MainActivity : ReactActivity\(\) \{\n)/;

function onNewIntentKotlin(): string {
  return `  ${MARK}: a share reaches expo-sharing before React's delegate may drop it.
  override fun onNewIntent(intent: Intent) {
    abTakeShare(this, intent)
    super.onNewIntent(intent)
  }

`;
}

function helpersKotlin(scheme: string): string {
  return `${MARK}: SEND / SEND_MULTIPLE with a type, as expo-sharing's isShareIntent.
private fun abIsShare(intent: Intent?): Boolean =
  intent != null && intent.type != null && (intent.action == Intent.ACTION_SEND || intent.action == Intent.ACTION_SEND_MULTIPLE)

// Restored (savedInstanceState) or launched from history: the share it was created with is old.
private fun abDropStaleShare(activity: Activity, savedInstanceState: Bundle?) {
  val fromHistory = (activity.intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0
  if (!abIsShare(activity.intent) || (savedInstanceState == null && !fromHistory)) return
  activity.intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setPackage(activity.packageName)
}

// The share for getSharedPayloads, and the activity's intent as the URL expo-router routes to /share.
private fun abTakeShare(activity: Activity, intent: Intent) {
  if (!abIsShare(intent)) return
  SharingSingleton.intent = Intent(intent)
  intent.action = Intent.ACTION_VIEW
  intent.data = Uri.parse("${scheme}://expo-sharing")
  activity.intent = intent
}
`;
}

/** MainActivity.kt with the imports, the stale-share drop in onCreate, onNewIntent and the helpers. */
export function addShareIntake(source: string, scheme: string): string {
  if (source.includes(MARK)) return source;
  if (!ON_CREATE.test(source) || !CLASS_OPEN.test(source)) {
    throw new Error('share-intent: MainActivity has no onCreate(savedInstanceState) or class header');
  }
  const imports = IMPORTS.filter((name) => !source.includes(`import ${name}\n`))
    .map((name) => `import ${name}`)
    .join('\n');
  const withImports = source.replace(/^(package [^\n]+\n)/, `$1\n${imports}\n`);
  const dropped = withImports.replace(
    ON_CREATE,
    (_all, head: string, indent: string) => `${head}${indent}abDropStaleShare(this, savedInstanceState)\n${indent}`,
  );
  const withNewIntent = dropped.replace(CLASS_OPEN, `$1${onNewIntentKotlin()}`);
  return `${withNewIntent.trimEnd()}\n\n${helpersKotlin(scheme)}`;
}

/** The app's URL scheme (app.json "scheme"), the one expo-sharing's share_into_scheme holds too. */
const schemeOf = (scheme: string | string[] | undefined): string =>
  (Array.isArray(scheme) ? scheme[0] : scheme) ?? 'ayatalbayan';

/** The plugin. One self-contained file: Expo compiles a .ts plugin, not the modules it imports. */
const withShareIntent: ConfigPlugin = (config) =>
  withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') throw new Error('share-intent: MainActivity is not Kotlin');
    cfg.modResults.contents = addShareIntake(cfg.modResults.contents, schemeOf(config.scheme));
    return cfg;
  });

export default withShareIntent;
