import { clamp, clampPan, distance, isDoubleTap, isTap, pinchScale, toggleScale } from './zoom';

const size = { width: 400, height: 800 };

test('clamp keeps a value within its bounds', () => {
  expect(clamp(5, 1, 4)).toBe(4);
  expect(clamp(0.5, 1, 4)).toBe(1);
  expect(clamp(2, 1, 4)).toBe(2);
});

test('the distance between two fingers', () => {
  expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
});

test('a pinch scales by how far the fingers spread, from the scale it started at, within 1×–4×', () => {
  expect(pinchScale({ startScale: 1, startDistance: 100, distance: 200 })).toBe(2);
  expect(pinchScale({ startScale: 2, startDistance: 100, distance: 150 })).toBe(3);
  expect(pinchScale({ startScale: 2, startDistance: 100, distance: 400 })).toBe(4);
  expect(pinchScale({ startScale: 1.5, startDistance: 100, distance: 20 })).toBe(1);
  expect(pinchScale({ startScale: 2, startDistance: 0, distance: 50 })).toBe(2);
});

test('a double tap toggles 1× and 2.5×; from any zoom it goes back to 1×', () => {
  expect(toggleScale(1)).toBe(2.5);
  expect(toggleScale(2.5)).toBe(1);
  expect(toggleScale(3.7)).toBe(1);
});

test('a pan stays inside the zoomed photo, and at 1× there is no pan', () => {
  expect(clampPan({ offset: { x: 500, y: -900 }, scale: 2, size })).toEqual({ x: 200, y: -400 });
  expect(clampPan({ offset: { x: 50, y: 60 }, scale: 2, size })).toEqual({ x: 50, y: 60 });
  expect(clampPan({ offset: { x: 50, y: 60 }, scale: 1, size })).toEqual({ x: 0, y: 0 });
});

test('a double tap is two taps within 300 ms; a tap is a release that barely moved', () => {
  expect(isDoubleTap(1000, 1200)).toBe(true);
  expect(isDoubleTap(1000, 1400)).toBe(false);
  expect(isDoubleTap(0, 100)).toBe(false);
  expect(isTap(3, 4)).toBe(true);
  expect(isTap(30, 0)).toBe(false);
});
