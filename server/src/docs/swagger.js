// server/src/docs/swagger.js

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Zippy Quick-Commerce REST API',
    version: '1.0.0',
    description:
      'Production-grade RESTful API for Zippy, a quick-commerce grocery delivery platform (Blinkit / Zepto style). Built with Node.js, Express, MongoDB (catalog), and MySQL (auth & financial ledgers).',
    contact: {
      name: 'Zippy Engineering',
      email: 'support@zippy.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your 15-minute JWT access token.',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'zippy_refresh',
        description: 'Rotating httpOnly refresh token cookie.',
      },
      CsrfHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Requested-With',
        description: 'Required custom client header for cookie-bearing endpoints.',
      },
    },
    schemas: {
      Category: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '65f1234567890abcdef12345' },
          name: { type: 'string', example: 'Dairy & Breakfast' },
          slug: { type: 'string', example: 'dairy-breakfast' },
          image: { type: 'string', example: 'https://images.unsplash.com/...' },
          icon: { type: 'string', example: '🥛' },
          displayOrder: { type: 'integer', example: 1 },
          isActive: { type: 'boolean', example: true },
          productCount: { type: 'integer', example: 8 },
        },
      },
      ProductVariant: {
        type: 'object',
        properties: {
          sku: { type: 'string', example: 'MILK-AMUL-500ML' },
          unit: { type: 'string', example: '500 ml' },
          price: { type: 'number', example: 33 },
          mrp: { type: 'number', example: 35 },
          stock: { type: 'integer', example: 50 },
          isDefault: { type: 'boolean', example: true },
        },
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '65f1234567890abcdef12346' },
          name: { type: 'string', example: 'Amul Taaza Homogenised Toned Milk' },
          slug: { type: 'string', example: 'amul-taaza-toned-milk' },
          brand: { type: 'string', example: 'Amul' },
          categorySlug: { type: 'string', example: 'dairy-breakfast' },
          primaryPrice: { type: 'number', example: 33 },
          totalStock: { type: 'integer', example: 50 },
          isAvailable: { type: 'boolean', example: true },
          ratingAverage: { type: 'number', example: 4.8 },
          reviewCount: { type: 'integer', example: 124 },
          variants: {
            type: 'array',
            items: { $ref: '#/components/schemas/ProductVariant' },
          },
        },
      },
      Serviceability: {
        type: 'object',
        properties: {
          pincode: { type: 'string', example: '400001' },
          serviceable: { type: 'boolean', example: true },
          city: { type: 'string', example: 'Mumbai' },
          state: { type: 'string', example: 'Maharashtra' },
          hubName: { type: 'string', example: 'Zippy Mumbai Central Dark Store' },
          estimatedDeliveryMinutes: { type: 'integer', example: 10 },
          freeDeliveryThreshold: { type: 'number', example: 199 },
          deliveryFee: { type: 'number', example: 15 },
          minOrderAmount: { type: 'number', example: 49 },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid request data' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        tags: ['System'],
        responses: {
          200: { description: 'System healthy' },
        },
      },
    },
    '/api/v1/categories': {
      get: {
        summary: 'List all active grocery categories',
        tags: ['Catalog'],
        responses: {
          200: { description: 'Categories retrieved successfully' },
        },
      },
    },
    '/api/v1/categories/{slug}': {
      get: {
        summary: 'Get category details by slug',
        tags: ['Catalog'],
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'dairy-breakfast',
          },
        ],
        responses: {
          200: { description: 'Category details' },
          404: { description: 'Category not found' },
        },
      },
    },
    '/api/v1/products': {
      get: {
        summary: 'Paginated product listing with filters and sorting',
        tags: ['Catalog'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'inStock', in: 'query', schema: { type: 'boolean' } },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['newest', 'price_asc', 'price_desc', 'rating', 'popular'],
            },
          },
        ],
        responses: {
          200: { description: 'Products retrieved successfully' },
        },
      },
    },
    '/api/v1/products/{slugOrId}': {
      get: {
        summary: 'Get single product details with reviews',
        tags: ['Catalog'],
        parameters: [
          {
            name: 'slugOrId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'amul-taaza-toned-milk',
          },
        ],
        responses: {
          200: { description: 'Product details' },
          404: { description: 'Product not found' },
        },
      },
    },
    '/api/v1/search': {
      get: {
        summary: 'Full-text search on product catalog',
        tags: ['Search'],
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Search results' },
        },
      },
    },
    '/api/v1/search/suggestions': {
      get: {
        summary: 'Fast autocomplete search suggestions',
        tags: ['Search'],
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 8 } },
        ],
        responses: {
          200: { description: 'Search suggestions' },
        },
      },
    },
    '/api/v1/home': {
      get: {
        summary: 'Get aggregated home screen feed (banners, categories, rails)',
        tags: ['Catalog'],
        responses: {
          200: { description: 'Home feed payload' },
        },
      },
    },
    '/api/v1/serviceability/{pincode}': {
      get: {
        summary: 'Check 10-minute delivery serviceability for a pincode',
        tags: ['Serviceability'],
        parameters: [
          {
            name: 'pincode',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: '400001',
          },
        ],
        responses: {
          200: { description: 'Serviceability status' },
          400: { description: 'Invalid pincode format' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        summary: 'User login (Customer or Admin)',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'customer@zippy.test' },
                  password: { type: 'string', example: 'Password#2026' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
          423: { description: 'Account locked' },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        summary: 'Customer self-registration',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Rahul Sharma' },
                  email: { type: 'string', example: 'rahul@zippy.test' },
                  phone: { type: 'string', example: '+919876543210' },
                  password: { type: 'string', example: 'StrongCustomerPass#2026' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registration successful' },
          400: { description: 'Validation error or weak password' },
          409: { description: 'Email already exists' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Auth'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Authenticated user profile' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/cart': {
      get: {
        summary: 'Get active cart with recomputed prices and delivery fee',
        tags: ['Cart'],
        responses: { 200: { description: 'Active cart details' } },
      },
      delete: {
        summary: 'Clear cart',
        tags: ['Cart'],
        responses: { 200: { description: 'Cart cleared' } },
      },
    },
    '/api/v1/cart/items': {
      post: {
        summary: 'Add or increment item in cart',
        tags: ['Cart'],
        responses: {
          200: { description: 'Item added' },
          400: { description: 'Insufficient stock' },
        },
      },
    },
    '/api/v1/cart/coupon': {
      post: {
        summary: 'Apply coupon code to cart',
        tags: ['Cart'],
        responses: {
          200: { description: 'Coupon applied' },
          400: { description: 'Invalid coupon' },
        },
      },
      delete: {
        summary: 'Remove coupon from cart',
        tags: ['Cart'],
        responses: { 200: { description: 'Coupon removed' } },
      },
    },
    '/api/v1/cart/merge': {
      post: {
        summary: 'Merge guest cart into authenticated customer cart',
        tags: ['Cart'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Cart merged' } },
      },
    },
    '/api/v1/addresses': {
      get: {
        summary: 'List user delivery addresses',
        tags: ['Addresses'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'List of addresses' } },
      },
      post: {
        summary: 'Create shipping address',
        tags: ['Addresses'],
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Address created' } },
      },
    },
    '/api/v1/coupons': {
      get: {
        summary: 'List currently valid public coupons',
        tags: ['Coupons'],
        responses: { 200: { description: 'Active coupons list' } },
      },
    },
    '/api/v1/orders/checkout': {
      post: {
        summary: 'Atomic checkout and order creation (Cross-DB)',
        tags: ['Orders'],
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: 'Order created' },
          409: { description: 'Insufficient stock' },
        },
      },
    },
    '/api/v1/orders': {
      get: {
        summary: 'List customer orders',
        tags: ['Orders'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'List of orders' } },
      },
    },
    '/api/v1/orders/{orderId}/cancel': {
      post: {
        summary: 'Cancel order and release stock',
        tags: ['Orders'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Order cancelled, stock released' } },
      },
    },
    '/api/v1/payments/verify': {
      post: {
        summary: 'Verify Razorpay payment signature',
        tags: ['Payments'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Payment verified' } },
      },
    },
    '/api/v1/admin/dashboard': {
      get: {
        summary: 'Admin dashboard overview and KPI metrics',
        tags: ['Admin'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Dashboard metrics and low stock alerts' } },
      },
    },
    '/api/v1/admin/products': {
      get: {
        summary: 'List products with admin pagination and filters',
        tags: ['Admin Products'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Admin product list' } },
      },
      post: {
        summary: 'Create new catalog product and invalidate cache',
        tags: ['Admin Products'],
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Product created' } },
      },
    },
    '/api/v1/admin/products/{id}/stock': {
      patch: {
        summary: 'Explicit inventory and stock adjustment with cache invalidation',
        tags: ['Admin Products'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Stock updated' } },
      },
    },
    '/api/v1/admin/upload': {
      post: {
        summary: 'Upload and Sharp-process JPEG/PNG/WebP image',
        tags: ['Admin Media'],
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Image processed and saved' } },
      },
    },
    '/api/v1/admin/orders': {
      get: {
        summary: 'List orders with admin filters',
        tags: ['Admin Orders'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Admin order list' } },
      },
    },
    '/api/v1/admin/customers': {
      get: {
        summary: 'List registered customers',
        tags: ['Admin Customers'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Customer list' } },
      },
    },
    '/api/v1/admin/customers/{id}/block': {
      patch: {
        summary: 'Block or unblock customer account and revoke refresh tokens',
        tags: ['Admin Customers'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Customer status updated' } },
      },
    },
    '/api/v1/admin/coupons': {
      get: {
        summary: 'List all discount coupons with usage stats',
        tags: ['Admin Coupons'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Coupon list' } },
      },
      post: {
        summary: 'Create promotional coupon',
        tags: ['Admin Coupons'],
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Coupon created' } },
      },
    },
    '/api/v1/admin/banners': {
      get: {
        summary: 'List promotional hero banners',
        tags: ['Admin Banners'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Banner list' } },
      },
      post: {
        summary: 'Create promotional hero banner',
        tags: ['Admin Banners'],
        security: [{ BearerAuth: [] }],
        responses: { 201: { description: 'Banner created' } },
      },
    },
    '/api/v1/admin/audit-logs': {
      get: {
        summary: 'Paginated administrative audit log ledger',
        tags: ['Admin Logs'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Audit logs list' } },
      },
    },
    '/api/v1/admin/login-logs': {
      get: {
        summary: 'Paginated customer and admin authentication log ledger',
        tags: ['Admin Logs'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Login logs list' } },
      },
    },
  },
};
