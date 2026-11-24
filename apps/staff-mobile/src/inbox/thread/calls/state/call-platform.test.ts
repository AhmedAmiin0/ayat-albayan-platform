import { fakeRtc } from './call-test-kit';
import { peerMaker } from './call-platform';

const ICE = [{ urls: ['stun:stun.example.org'] }];

test('the native module loads at the first call, not when the provider mounts', async () => {
  const rtc = fakeRtc();
  const load = jest.fn(async () => rtc.deps);
  const make = peerMaker(load);
  expect(load).not.toHaveBeenCalled();
  await make(ICE);
  expect(load).toHaveBeenCalledTimes(1);
  expect(rtc.peers).toHaveLength(1);
});

test('a binary without WebRTC: the call fails as «unsupported», never a crash', async () => {
  const make = peerMaker(async () => null);
  await expect(make(ICE)).rejects.toMatchObject({ problem: 'unsupported' });
});
