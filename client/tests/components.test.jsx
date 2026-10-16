// client/tests/components.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Skeleton,
  Modal,
  ToastItem,
  EmptyState,
} from '../src/components/ui/index.js';

describe('UI Component Library', () => {
  describe('Button', () => {
    it('renders with label and fires onClick', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const btn = screen.getByRole('button', { name: /click me/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows loading spinner and disables button when isLoading is true', () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Submit Order
        </Button>
      );

      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-busy', 'true');
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies variant classes correctly', () => {
      const { rerender } = render(<Button variant="danger">Delete</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-red-600');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('border-slate-300');
    });
  });

  describe('Input', () => {
    it('renders with label, placeholder, and helper text', () => {
      render(
        <Input
          id="email-input"
          label="Email Address"
          placeholder="user@zippy.test"
          helperText="We will never share your email."
        />
      );

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('user@zippy.test')).toBeInTheDocument();
      expect(screen.getByText('We will never share your email.')).toBeInTheDocument();
    });

    it('displays error state with aria-invalid', () => {
      render(
        <Input
          id="password-input"
          label="Password"
          error="Password must be at least 8 characters"
        />
      );

      const input = screen.getByLabelText(/password/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toHaveTextContent('Password must be at least 8 characters');
    });
  });

  describe('Card', () => {
    it('renders all Card sub-components cleanly', () => {
      render(
        <Card data-testid="test-card">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>Review your items before payment</CardDescription>
          </CardHeader>
          <CardContent>
            <p>1x Whole Farm Fresh Milk</p>
          </CardContent>
          <CardFooter>
            <span>Total: ₹45.00</span>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('test-card')).toBeInTheDocument();
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
      expect(screen.getByText('Review your items before payment')).toBeInTheDocument();
      expect(screen.getByText('1x Whole Farm Fresh Milk')).toBeInTheDocument();
      expect(screen.getByText('Total: ₹45.00')).toBeInTheDocument();
    });
  });

  describe('Badge', () => {
    it('renders text with appropriate variant styles', () => {
      const { rerender } = render(<Badge variant="success">IN STOCK</Badge>);
      expect(screen.getByText('IN STOCK')).toHaveClass('bg-emerald-50');

      rerender(<Badge variant="danger">OUT OF STOCK</Badge>);
      expect(screen.getByText('OUT OF STOCK')).toHaveClass('bg-red-50');
    });
  });

  describe('Skeleton', () => {
    it('renders with aria-hidden="true" and animate-pulse', () => {
      const { container } = render(<Skeleton className="w-20 h-6" />);
      const skeleton = container.firstChild;
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveClass('w-20');
    });
  });

  describe('Modal', () => {
    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()} title="Hidden Modal">
          <p>Hidden Content</p>
        </Modal>
      );

      expect(screen.queryByText('Hidden Modal')).not.toBeInTheDocument();
    });

    it('renders title, children, and responds to close button when isOpen is true', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Delivery Details">
          <p>Delivery in 10 minutes</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Delivery Details')).toBeInTheDocument();
      expect(screen.getByText('Delivery in 10 minutes')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText(/close dialog/i);
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Escape Test">
          <p>Press Escape</p>
        </Modal>
      );

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ToastItem', () => {
    it('renders title, message, and calls onDismiss when close clicked', () => {
      const handleDismiss = vi.fn();
      const toast = {
        id: 't-1',
        type: 'success',
        title: 'Added to Cart',
        message: 'Amul Taaza Milk added to your basket.',
      };

      render(<ToastItem toast={toast} onDismiss={handleDismiss} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Added to Cart')).toBeInTheDocument();
      expect(screen.getByText('Amul Taaza Milk added to your basket.')).toBeInTheDocument();

      const dismissBtn = screen.getByLabelText(/dismiss notification/i);
      fireEvent.click(dismissBtn);
      expect(handleDismiss).toHaveBeenCalledWith('t-1');
    });
  });

  describe('EmptyState', () => {
    it('renders empty illustration, title, description, and action button', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="Your Cart is Empty"
          description="Explore thousands of grocery items delivered in 10 minutes."
          actionLabel="Start Shopping"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('Your Cart is Empty')).toBeInTheDocument();
      expect(
        screen.getByText('Explore thousands of grocery items delivered in 10 minutes.')
      ).toBeInTheDocument();

      const actionBtn = screen.getByRole('button', { name: /start shopping/i });
      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });
});
