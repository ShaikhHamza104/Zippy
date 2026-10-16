// server/src/routes/v1/admin.routes.js
import { Router } from 'express';
import * as adminController from '../../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { uploadMiddleware } from '../../services/storage.service.js';
import { validateBody } from '../../validation/auth.validation.js';
import {
  adminBannerCreateSchema,
  adminBannerUpdateSchema,
  adminBlockCustomerSchema,
  adminCategoryCreateSchema,
  adminCategoryUpdateSchema,
  adminCouponCreateSchema,
  adminCouponUpdateSchema,
  adminOrderCancelSchema,
  adminOrderStatusSchema,
  adminProductCreateSchema,
  adminProductUpdateSchema,
  adminStockUpdateSchema,
} from '../../validation/admin.validation.js';

const router = Router();

// Universal security guard: Every single admin route requires valid token and ADMIN or SUPER_ADMIN role
router.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

/* 1. Dashboard Overview */
router.get('/dashboard', adminController.getDashboardStats);

/* 2. Media Upload */
router.post('/upload', uploadMiddleware.single('image'), adminController.uploadMedia);

/* 3. Products Management */
router.get('/products', adminController.listAdminProducts);
router.post(
  '/products',
  validateBody(adminProductCreateSchema),
  adminController.createAdminProduct
);
router.get('/products/:id', adminController.getAdminProductById);
router.put(
  '/products/:id',
  validateBody(adminProductUpdateSchema),
  adminController.updateAdminProduct
);
router.delete('/products/:id', adminController.deleteAdminProduct);
router.patch(
  '/products/:id/stock',
  validateBody(adminStockUpdateSchema),
  adminController.updateAdminProductStock
);

/* 4. Categories Management */
router.get('/categories', adminController.listAdminCategories);
router.post(
  '/categories',
  validateBody(adminCategoryCreateSchema),
  adminController.createAdminCategory
);
router.put(
  '/categories/:id',
  validateBody(adminCategoryUpdateSchema),
  adminController.updateAdminCategory
);
router.delete('/categories/:id', adminController.deleteAdminCategory);

/* 5. Orders Management */
router.get('/orders', adminController.listAdminOrders);
router.get('/orders/:id', adminController.getAdminOrderById);
router.patch(
  '/orders/:id/status',
  validateBody(adminOrderStatusSchema),
  adminController.updateAdminOrderStatus
);
router.post(
  '/orders/:id/cancel',
  validateBody(adminOrderCancelSchema),
  adminController.cancelAdminOrder
);

/* 6. Customers Management */
router.get('/customers', adminController.listAdminCustomers);
router.get('/customers/:id', adminController.getAdminCustomerById);
router.patch(
  '/customers/:id/block',
  validateBody(adminBlockCustomerSchema),
  adminController.toggleBlockCustomer
);

/* 7. Coupons Management */
router.get('/coupons', adminController.listAdminCoupons);
router.post('/coupons', validateBody(adminCouponCreateSchema), adminController.createAdminCoupon);
router.put(
  '/coupons/:id',
  validateBody(adminCouponUpdateSchema),
  adminController.updateAdminCoupon
);
router.delete('/coupons/:id', adminController.deleteAdminCoupon);

/* 8. Banners Management */
router.get('/banners', adminController.listAdminBanners);
router.post('/banners', validateBody(adminBannerCreateSchema), adminController.createAdminBanner);
router.put(
  '/banners/:id',
  validateBody(adminBannerUpdateSchema),
  adminController.updateAdminBanner
);
router.delete('/banners/:id', adminController.deleteAdminBanner);

/* 9. Audit and Security Logs */
router.get('/audit-logs', adminController.listAdminAuditLogs);
router.get('/login-logs', adminController.listAdminLoginLogs);

export default router;
