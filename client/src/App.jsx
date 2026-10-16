// client/src/App.jsx
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from './services/queryClient.js';
import { router } from './router.jsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';

export const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
