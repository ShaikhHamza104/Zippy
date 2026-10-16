import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Header } from '../src/components/common/Header.jsx';
import { HomePage } from '../src/pages/HomePage.jsx';

describe('Zippy Client Components', () => {
  it('renders Header with Zippy branding and 10 mins indicator', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    expect(screen.getByText(/Zippy/i)).toBeInTheDocument();
    expect(screen.getByText(/10 mins/i)).toBeInTheDocument();
  });

  it('renders HomePage with hero delivery heading', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Groceries delivered in/i)).toBeInTheDocument();
    expect(screen.getByText(/Shop by Category/i)).toBeInTheDocument();
  });
});
