// Metro resolves an imported image to an asset id that <Image source> takes (expo-env.d.ts is not
// checked in): the kit's brand marks, and each app's own images (their tsconfig includes this).
declare module '*.png' {
  const source: number;
  export default source;
}
