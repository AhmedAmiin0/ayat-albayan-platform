// What each kit path that is no longer public becomes (docs/64 PR 5).
export const KIT_TABLE = {
  moves: { '@ab/mobile-kit/testing/query': '@ab/mobile-kit/testing' },
  namespaces: {
    '@ab/mobile-kit/lib/http/access-token': { spec: '@ab/mobile-kit/testing', name: 'AccessToken' },
    '@ab/mobile-kit/lib/http/api': { spec: '@ab/mobile-kit/testing', name: 'HttpApi' },
    '@ab/mobile-kit/lib/http/read-within': { spec: '@ab/mobile-kit/testing', name: 'ReadWithin' },
  },
};
