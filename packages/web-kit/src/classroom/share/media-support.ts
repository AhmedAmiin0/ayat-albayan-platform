/**
 * Feature detection for the share buttons: phone browsers (iOS Safari, Android Chrome) have no
 * getDisplayMedia, so «شارك الشاشة» / «اطلب مشاركة الشاشة» are hidden there instead of failing.
 */
export interface MediaDevicesLike {
  mediaDevices?: { getDisplayMedia?: unknown } | undefined;
}

const browserNavigator = (): MediaDevicesLike | undefined => (typeof navigator === 'undefined' ? undefined : navigator);

/** This browser can share a screen (navigator.mediaDevices.getDisplayMedia exists). */
export function canShareScreen(nav: MediaDevicesLike | undefined = browserNavigator()): boolean {
  return typeof nav?.mediaDevices?.getDisplayMedia === 'function';
}
