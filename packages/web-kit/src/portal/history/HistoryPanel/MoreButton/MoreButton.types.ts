export interface MoreButtonProps {
  query: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
}
