// Metro resolves an imported image to an asset id that <Image source> takes (expo-env.d.ts is not
// checked in). Each kit file that imports an image references this file, so an app that builds the
// kit's source gets the declaration through the package itself.
declare module '*.png' {
  const source: number;
  export default source;
}
