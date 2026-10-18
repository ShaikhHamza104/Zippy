// client/tests/customer.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddToCartButton } from '../src/components/common/AddToCartButton.jsx';
import { ProductCard } from '../src/components/product/ProductCard.jsx';
import { CartDrawer } from '../src/components/cart/CartDrawer.jsx';
import { PincodeModal } from '../src/components/common/PincodeModal.jsx';
import { CategoriesPage } from '../src/pages/CategoriesPage.jsx';
import { ProductsPage } from '../src/pages/ProductsPage.jsx';
import { useUIStore } from '../src/stores/uiStore.js';
import * as useCartModule from '../src/hooks/useCart.js';
import * as apiModule from '../src/services/api.js';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('Phase 8: Customer UI Components and Flows', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    useUIStore.setState({
      isCartDrawerOpen: false,
      isPincodeModalOpen: false,
      deliveryPincode: '560001',
      toasts: [],
    });
    vi.restoreAllMocks();
  });

  describe('AddToCartButton & Stepper', () => {
    it('renders "+ ADD" button when item quantity is 0', () => {
      const mockAddItem = vi.fn();
      vi.spyOn(useCartModule, 'useCart').mockReturnValue({
        getItemQuantity: () => 0,
        addItem: mockAddItem,
        updateQuantity: vi.fn(),
        isMutating: false,
      });

      render(
        <AddToCartButton
          productId="prod-123"
          variant={{ sku: 'sku-500ml', unit: '500 ml', stock: 10 }}
        />
      );

      const addBtn = screen.getByRole('button', { name: /add 500 ml to cart/i });
      expect(addBtn).toBeInTheDocument();
      fireEvent.click(addBtn);
      expect(mockAddItem).toHaveBeenCalledWith('prod-123', 'sku-500ml', 1);
    });

    it('renders stepper [-] [qty] [+] when item quantity > 0', () => {
      const mockUpdate = vi.fn();
      vi.spyOn(useCartModule, 'useCart').mockReturnValue({
        getItemQuantity: (sku) => (sku === 'sku-500ml' ? 2 : 0),
        addItem: vi.fn(),
        updateQuantity: mockUpdate,
        isMutating: false,
      });

      render(
        <AddToCartButton
          productId="prod-123"
          variant={{ sku: 'sku-500ml', unit: '500 ml', stock: 10 }}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();

      const decBtn = screen.getByRole('button', { name: /decrease quantity/i });
      fireEvent.click(decBtn);
      expect(mockUpdate).toHaveBeenCalledWith('sku-500ml', 1);

      const incBtn = screen.getByRole('button', { name: /increase quantity/i });
      fireEvent.click(incBtn);
      expect(mockUpdate).toHaveBeenCalledWith('sku-500ml', 3);
    });

    it('renders "OUT OF STOCK" when variant stock is 0', () => {
      vi.spyOn(useCartModule, 'useCart').mockReturnValue({
        getItemQuantity: () => 0,
        addItem: vi.fn(),
        updateQuantity: vi.fn(),
        isMutating: false,
      });

      render(
        <AddToCartButton
          productId="prod-123"
          variant={{ sku: 'sku-soldout', unit: '1 kg', stock: 0 }}
        />
      );

      expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    });
  });

  describe('ProductCard', () => {
    const mockProduct = {
      _id: 'prod-milk-1',
      slug: 'amul-taaza-fresh-toned-milk',
      name: 'Amul Taaza Fresh Toned Milk',
      brand: 'Amul',
      primaryPrice: 27,
      primaryMrp: 30,
      totalStock: 50,
      unit: '500 ml',
      variants: [
        { sku: 'sku-500ml', unit: '500 ml', price: 27, mrp: 30, stock: 50 },
        { sku: 'sku-1l', unit: '1 L', price: 54, mrp: 60, stock: 25 },
      ],
    };

    it('renders product details, pricing, discount, and 10 mins delivery pill', () => {
      vi.spyOn(useCartModule, 'useCart').mockReturnValue({
        getItemQuantity: () => 0,
        addItem: vi.fn(),
        updateQuantity: vi.fn(),
        isMutating: false,
      });

      render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      expect(screen.getByText('Amul Taaza Fresh Toned Milk')).toBeInTheDocument();
      expect(screen.getByText('Amul')).toBeInTheDocument();
      expect(screen.getByText('₹27')).toBeInTheDocument();
      expect(screen.getByText('₹30')).toBeInTheDocument();
      expect(screen.getByText('10% OFF')).toBeInTheDocument();
      expect(screen.getByText(/10 mins/i)).toBeInTheDocument();
    });

    it('updates price when another variant unit is selected', () => {
      vi.spyOn(useCartModule, 'useCart').mockReturnValue({
        getItemQuantity: () => 0,
        addItem: vi.fn(),
        updateQuantity: vi.fn(),
        isMutating: false,
      });

      render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      const select = screen.getByRole('combobox', { name: /select product unit/i });
      fireEvent.change(select, { target: { value: '1' } }); // Switch to 1 L variant

      expect(screen.getByText('₹54')).toBeInTheDocument();
      expect(screen.getByText('₹60')).toBeInTheDocument();
    });
  });

  describe('CartDrawer', () => {
    it('does not render when closed', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <CartDrawer />
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.queryByText(/my cart/i)).not.toBeInTheDocument();
    });

    it('renders empty cart state when open and no items', () => {
      useUIStore.setState({ isCartDrawerOpen: true });
      vi.spyOn(useCartModule, 'useCart').mockReturnValue({
        items: [],
        subtotal: 0,
        totalMrp: 0,
        discount: 0,
        deliveryFee: 15,
        grandTotal: 0,
        coupon: null,
        isFreeDelivery: false,
        amountNeededForFreeDelivery: 199,
        totalItemCount: 0,
        applyCoupon: vi.fn(),
        removeCoupon: vi.fn(),
        isMutating: false,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <CartDrawer />
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start shopping/i })).toBeInTheDocument();
    });

    it('renders items list, free delivery progress, and bill details', () => {
      useUIStore.setState({ isCartDrawerOpen: true });
      vi.spyOn(useCartModule, 'useCart').mockReturnValue({
        items: [
          {
            productId: 'p-1',
            variantSku: 'sku-milk',
            name: 'Fresh Cow Milk',
            unit: '1 L',
            price: 60,
            quantity: 2,
            image: '',
          },
        ],
        subtotal: 120,
        totalMrp: 140,
        discount: 0,
        deliveryFee: 15,
        grandTotal: 135,
        coupon: null,
        isFreeDelivery: false,
        amountNeededForFreeDelivery: 79,
        totalItemCount: 2,
        applyCoupon: vi.fn(),
        removeCoupon: vi.fn(),
        getItemQuantity: (sku) => (sku === 'sku-milk' ? 2 : 0),
        addItem: vi.fn(),
        updateQuantity: vi.fn(),
        isMutating: false,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <CartDrawer />
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText('Fresh Cow Milk')).toBeInTheDocument();
      expect(screen.getByText(/add ₹79 more for free delivery/i)).toBeInTheDocument();
      expect(screen.getAllByText('₹135').length).toBeGreaterThan(0);
      expect(screen.getByText(/proceed to checkout/i)).toBeInTheDocument();
    });
  });

  describe('PincodeModal Serviceability', () => {
    it('verifies serviceable location and displays dark store hub info', async () => {
      useUIStore.setState({ isPincodeModalOpen: true });

      vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({
        success: true,
        data: {
          pincode: '560001',
          serviceable: true,
          city: 'Bengaluru',
          hubName: 'Zippy Koramangala Dark Store',
          estimatedDeliveryMinutes: 10,
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <PincodeModal />
        </QueryClientProvider>
      );

      expect(screen.getByText('Select Delivery Location')).toBeInTheDocument();

      const input = screen.getByLabelText(/6-digit pin code/i);
      fireEvent.change(input, { target: { value: '560001' } });

      const checkBtn = screen.getByRole('button', { name: /check & apply/i });
      fireEvent.click(checkBtn);

      await waitFor(() => {
        expect(screen.getByText(/Zippy Koramangala Dark Store/i)).toBeInTheDocument();
      });
    });
  });

  describe('CategoriesPage & Mobile Filtering', () => {
    it('renders categories explorer and filters categories by search input', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({
        success: true,
        data: {
          categories: [
            {
              _id: 'cat-1',
              name: 'Fresh Fruits',
              slug: 'fresh-fruits',
              icon: '🍎',
              productCount: 12,
            },
            { _id: 'cat-2', name: 'Dairy & Eggs', slug: 'dairy-eggs', icon: '🥛', productCount: 8 },
          ],
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <CategoriesPage />
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText('Explore All Categories')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Fresh Fruits')).toBeInTheDocument();
        expect(screen.getByText('Dairy & Eggs')).toBeInTheDocument();
        expect(screen.getByText('12 items')).toBeInTheDocument();
      });

      // Filter by typing 'fruits'
      const searchInput = screen.getByPlaceholderText(/search categories/i);
      fireEvent.change(searchInput, { target: { value: 'Fruits' } });

      expect(screen.getByText('Fresh Fruits')).toBeInTheDocument();
      expect(screen.queryByText('Dairy & Eggs')).not.toBeInTheDocument();
    });

    it('renders mobile filter toolbar and opens filter drawer', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockImplementation((url) => {
        if (url.includes('/categories')) {
          return Promise.resolve({
            success: true,
            data: {
              categories: [
                { _id: 'cat-1', name: 'Fresh Fruits', slug: 'fresh-fruits', icon: '🍎' },
              ],
            },
          });
        }
        return Promise.resolve({
          success: true,
          data: {
            products: [
              {
                _id: 'prod-1',
                name: 'Shimla Apples',
                slug: 'shimla-apples',
                primaryPrice: 120,
                mrp: 140,
                variants: [{ sku: 'app-1kg', unit: '1 kg', price: 120, stock: 10 }],
                totalStock: 10,
                isAvailable: true,
                ratingAverage: 4.8,
              },
            ],
          },
          pagination: { total: 1, totalPages: 1 },
        });
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ProductsPage />
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Shimla Apples')).toBeInTheDocument();
      });

      // Mobile Filters button exists
      const filterBtn = screen.getByRole('button', { name: /filters/i });
      expect(filterBtn).toBeInTheDocument();

      // Click to open mobile filter modal
      fireEvent.click(filterBtn);

      await waitFor(() => {
        expect(screen.getByText('Filter & Refine Products')).toBeInTheDocument();
        expect(screen.getAllByText(/price range/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/in-stock items only/i).length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
