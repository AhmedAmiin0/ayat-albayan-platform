// The phone's zone in tests: jest.shared.cjs points deviceTimeZone of both '@ab/time' and
// '@ab/shared' here, so a test moves the phone once whichever path the code imports from.
let zone = 'Asia/Riyadh';

export function deviceZone(): string {
  return zone;
}

export function setDeviceZone(next: string): void {
  zone = next;
}
