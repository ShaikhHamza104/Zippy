import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { Header } from '../src/components/common/Header.jsx';
import { HomePage } from '../src/pages/HomePage.jsx';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('Zippy Client Components', () => {
  it('renders Header with Zippy branding and 10 mins indicator', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Header />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Zippy/i)).toBeInTheDocument();
    expect(screen.getByText(/10 mins/i)).toBeInTheDocument();
  });

  it('renders HomePage with hero delivery heading', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Groceries & Fresh Food/i)).toBeInTheDocument();
    expect(screen.getByText(/Shop by Category/i)).toBeInTheDocument();
  });
});
