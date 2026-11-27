export interface ErrorStateProps {
  /** Usually the query's `refetch`. */
  onRetry: () => void;
  message?: string;
}
