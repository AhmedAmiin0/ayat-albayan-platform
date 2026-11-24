import type * as SdkModule from '@livekit/react-native';
import type * as RtcModule from '@livekit/react-native-webrtc';
import type * as ClientModule from 'livekit-client';
import { NativeModules } from 'react-native';

type Sdk = typeof SdkModule;
type Client = typeof ClientModule;
type Rtc = typeof RtcModule;

/** LiveKit's three packages, loaded together on first use (docs/35). */
export interface LiveKitNative {
  sdk: Sdk;
  lk: Client;
  rtc: Rtc;
}

const modules: Record<string, unknown> = NativeModules;

/**
 * Does this binary carry LiveKit's native module? An APK built before docs/35 does not: its rooms
 * open in the browser. Checked before the SDK's JS is imported.
 */
const nativeRoomAvailable = (): boolean => modules.LivekitReactNativeModule != null;

/**
 * Imported on first use, never at boot: a module whose top level throws rejects its import, so
 * a bad native build reads as «no LiveKit». livekit-client needs the globals registered first.
 */
async function load(): Promise<LiveKitNative | null> {
  if (!nativeRoomAvailable()) return null;
  try {
    const sdk = await import('@livekit/react-native');
    sdk.registerGlobals();
    const [lk, rtc] = await Promise.all([
      import('livekit-client'),
      import('@livekit/react-native-webrtc'),
    ]);
    return { sdk, lk, rtc };
  } catch {
    return null;
  }
}

let cached: Promise<LiveKitNative | null> | undefined;

/**
 * The SDK with its globals registered once, or null where the native module is missing or fails to
 * load.
 */
export function liveKitNative(): Promise<LiveKitNative | null> {
  cached ??= load();
  return cached;
}
