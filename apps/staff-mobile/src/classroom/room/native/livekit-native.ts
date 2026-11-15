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
 * open in the browser. Cheap (no JS of the SDK is loaded), so the join buttons can ask it on every
 * press.
 */
export const nativeRoomAvailable = (): boolean => modules.LivekitReactNativeModule != null;

let cached: LiveKitNative | null | undefined;

function load(): LiveKitNative | null {
  if (!nativeRoomAvailable()) return null;
  try {
    // Loaded lazily (after the module check), never at boot: an APK without it never loads it.
    // oxlint-disable-next-line typescript/no-require-imports -- lazy native module
    const sdk = require('@livekit/react-native') as Sdk;
    sdk.registerGlobals();
    return {
      sdk,
      // oxlint-disable-next-line typescript/no-require-imports -- after registerGlobals
      lk: require('livekit-client') as Client,
      // oxlint-disable-next-line typescript/no-require-imports -- the fork the SDK runs on
      rtc: require('@livekit/react-native-webrtc') as Rtc,
    };
  } catch {
    return null;
  }
}

/**
 * The SDK with its globals registered once, or null where the native module is missing or fails to
 * load.
 */
export function liveKitNative(): LiveKitNative | null {
  cached ??= load();
  return cached;
}
