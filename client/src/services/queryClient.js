// client/src/services/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 1, // 1 minute default freshness for catalog & inventory
      gcTime: 1000 * 60 * 10, // 10 minutes garbage collection time
      retry: (failureCount, error) => {
        // Do not retry 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export default queryClient;
