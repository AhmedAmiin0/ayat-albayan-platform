// What each kit path that is no longer public becomes (docs/64 PR 5).
export const KIT_TABLE = {
  moves: { '@ab/mobile-kit/testing/query': '@ab/mobile-kit/testing' },
  namespaces: {
    '@ab/mobile-kit/lib/http/access-token': { spec: '@ab/mobile-kit/testing', name: 'AccessToken' },
    '@ab/mobile-kit/lib/http/api': { spec: '@ab/mobile-kit/testing', name: 'HttpApi' },
    '@ab/mobile-kit/lib/http/read-within': { spec: '@ab/mobile-kit/testing', name: 'ReadWithin' },
    '@ab/web-kit/lib/http/env/env': { spec: '@ab/web-kit/testing', name: 'HttpEnv' },
  },
  deep: [
    {
      prefix: '@ab/web-kit/',
      root: '@ab/web-kit',
      entries: {
        '@ab/web-kit/room': [
          '@ab/web-kit/classroom/room/components/ClassroomRoom',
          '@ab/web-kit/portal/ChildPanel',
          '@ab/web-kit/portal/home/ChildCard',
          '@ab/web-kit/portal/lessons/RoomOverlay',
        ],
        '@ab/web-kit/testing': [
          '@ab/web-kit/classroom/room/livekit/fake-client',
          '@ab/web-kit/components/channel/channel.fixtures',
          '@ab/web-kit/lib/settings/confirmation-testing',
          '@ab/web-kit/portal/portal.api-fixture',
          '@ab/web-kit/portal/portal.fixtures',
          '@ab/web-kit/portal/portal.render',
          '@ab/web-kit/portal/recordings/recordings.fixtures',
        ],
      },
    },
  ],
  renames: {
    '@ab/web-kit/portal/recordings/RecordingsPanel': { RecordingsPanel: 'PortalRecordingsPanel' },
  },
};
