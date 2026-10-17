// server/src/controllers/admin.controller.js
import mongoose from 'mongoose';
import { prisma } from '../database/prisma.js';
import { Banner, Category, Product } from '../models/index.js';
import { processAndSaveImage } from '../services/storage.service.js';
import { recordAuditLog } from '../utils/auditLogger.js';
import { cache } from '../utils/cache.js';

const VALID_STATUS_TRANSITIONS = {
  PLACED: ['PACKED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Restores product stock in MongoDB when an order is cancelled.
 */
const restoreOrderStock = async (orderItems) => {
  for (const item of orderItems) {
    const product = await Product.findById(item.mongoProductId);
    if (product && product.variants?.length) {
      const skuMatch = item.nameSnapshot?.match(/\[(.*?)\]/);
      const targetSku = skuMatch ? skuMatch[1] : null;

      let variant = product.variants.find((v) => v.sku === targetSku);
      if (!variant) {
        variant =
          product.variants.find((v) => Number(v.price) === Number(item.priceSnapshot)) ||
          product.variants[0];
      }

      await Product.updateOne(
        { _id: item.mongoProductId, 'variants.sku': variant.sku },
        {
          $inc: {
            'variants.$.stock': item.quantity,
            totalStock: item.quantity,
          },
        }
      );
    }
  }
};

/* ==========================================================================
   1. DASHBOARD OVERVIEW & METRICS
   ========================================================================== */

export const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
    );

    // 1. Orders placed today
    const ordersToday = await prisma.order.count({
      where: { createdAt: { gte: startOfDay } },
    });

    // 2. Revenue figures (excluding cancelled orders)
    const totalRevAgg = await prisma.order.aggregate({
      where: { status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
    });
    const totalRevenue = Number(totalRevAgg._sum.totalAmount || 0);

    const todayRevAgg = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfDay },
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
    });
    const todayRevenue = Number(todayRevAgg._sum.totalAmount || 0);

    // 3. Active customers count
    const activeCustomers = await prisma.user.count({
      where: {
        role: 'CUSTOMER',
        isBlocked: false,
        deletedAt: null,
      },
    });

    // 4. Order status breakdown
    const statusGroups = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const orderStatusBreakdown = {
      PLACED: 0,
      PACKED: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    statusGroups.forEach((g) => {
      orderStatusBreakdown[g.status] = g._count.id;
    });

    // 5. Low-stock inventory alerts (variants with stock <= 10)
    const lowStockProducts = await Product.find({
      'variants.stock': { $lte: 10 },
    })
      .select('name slug brand categorySlug totalStock variants')
      .lean();

    const lowStockAlerts = [];
    lowStockProducts.forEach((prod) => {
      prod.variants.forEach((v) => {
        if (v.stock <= 10) {
          lowStockAlerts.push({
            productId: prod._id,
            productName: prod.name,
            sku: v.sku,
            unit: v.unit,
            stock: v.stock,
            price: v.price,
            brand: prod.brand,
            categorySlug: prod.categorySlug,
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          ordersToday,
          totalRevenue,
          todayRevenue,
          activeCustomers,
          orderStatusBreakdown,
          lowStockCount: lowStockAlerts.length,
        },
        lowStockAlerts: lowStockAlerts.slice(0, 20),
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================================
   2. PRODUCT MANAGEMENT (CRUD + INVENTORY)
   ========================================================================== */

export const listAdminProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.search) {
      const q = req.query.search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { 'variants.sku': { $regex: q, $options: 'i' } },
      ];
    }

    if (req.query.category) {
      if (mongoose.Types.ObjectId.isValid(req.query.category)) {
        filter.categoryId = req.query.category;
      } else {
        filter.categorySlug = req.query.category.trim().toLowerCase();
      }
    }

    if (req.query.isAvailable !== undefined) {
      filter.isAvailable = req.query.isAvailable === 'true';
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate('categoryId', 'name slug icon')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: { products },
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid product ObjectId' },
      });
    }

    const product = await Product.findById(id).populate('categoryId', 'name slug icon').lean();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }

    res.status(200).json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
};

export const createAdminProduct = async (req, res, next) => {
  try {
    const payload = req.body;

    const category = await Category.findById(payload.categoryId);
    if (!category) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CATEGORY', message: 'Referenced category does not exist' },
      });
    }

    const slug =
      payload.slug ||
      payload.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    const existing = await Product.findOne({ slug });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'SLUG_CONFLICT', message: `Product slug "${slug}" already exists` },
      });
    }

    const product = new Product({
      ...payload,
      slug,
      categorySlug: category.slug,
    });

    await product.save();
    cache.flush();

    await recordAuditLog({
      userId: req.user.id,
      action: 'CREATE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: product._id,
      details: { name: product.name, slug: product.slug, categorySlug: category.slug },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAdminProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid product ObjectId' },
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }

    const payload = req.body;

    if (payload.categoryId) {
      const category = await Category.findById(payload.categoryId);
      if (!category) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: 'Referenced category does not exist' },
        });
      }
      payload.categorySlug = category.slug;
    }

    Object.assign(product, payload);
    await product.save();
    cache.flush();

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: product._id,
      details: { name: product.name, updatedFields: Object.keys(payload) },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAdminProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid product ObjectId' },
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }

    // Soft toggle availability
    product.isAvailable = false;
    await product.save();
    cache.flush();

    await recordAuditLog({
      userId: req.user.id,
      action: 'DELETE_PRODUCT',
      entityType: 'PRODUCT',
      entityId: product._id,
      details: { name: product.name, slug: product.slug, action: 'soft_deactivated' },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Product deactivated successfully',
      data: { product },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAdminProductStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sku, stock, adjustment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid product ObjectId' },
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }

    // Locate target variant
    let variant = sku ? product.variants.find((v) => v.sku === sku) : product.variants[0];
    if (!variant) {
      return res.status(404).json({
        success: false,
        error: { code: 'VARIANT_NOT_FOUND', message: `Variant with SKU "${sku}" not found` },
      });
    }

    const previousStock = variant.stock;
    if (stock !== undefined) {
      variant.stock = Math.max(0, parseInt(stock, 10));
    } else if (adjustment !== undefined) {
      variant.stock = Math.max(0, variant.stock + parseInt(adjustment, 10));
    }

    await product.save();
    cache.flush();

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_STOCK',
      entityType: 'PRODUCT',
      entityId: product._id,
      details: {
        productName: product.name,
        sku: variant.sku,
        previousStock,
        newStock: variant.stock,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Stock updated for ${product.name} (${variant.sku})`,
      data: {
        productId: product._id,
        sku: variant.sku,
        stock: variant.stock,
        totalStock: product.totalStock,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================================
   3. CATEGORY MANAGEMENT (CRUD)
   ========================================================================== */

export const listAdminCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1, name: 1 }).lean();
    res.status(200).json({
      success: true,
      count: categories.length,
      data: { categories },
    });
  } catch (err) {
    next(err);
  }
};

export const createAdminCategory = async (req, res, next) => {
  try {
    const payload = req.body;
    const slug =
      payload.slug ||
      payload.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'SLUG_CONFLICT', message: `Category slug "${slug}" already exists` },
      });
    }

    const category = new Category({ ...payload, slug });
    await category.save();
    cache.flush();

    await recordAuditLog({
      userId: req.user.id,
      action: 'CREATE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: category._id,
      details: { name: category.name, slug: category.slug },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAdminCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid category ObjectId' },
      });
    }

    const category = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
    }

    cache.flush();

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: category._id,
      details: { name: category.name, updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAdminCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid category ObjectId' },
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
    }

    if (req.query.hard === 'true') {
      await Category.findByIdAndDelete(id);
      cache.flush();

      await recordAuditLog({
        userId: req.user.id,
        action: 'DELETE_CATEGORY',
        entityType: 'CATEGORY',
        entityId: id,
        details: { name: category.name, action: 'permanently_deleted' },
        ipAddress: req.ip,
      });

      return res.status(200).json({
        success: true,
        message: 'Category permanently deleted',
        data: null,
      });
    }

    const newStatus = !category.isActive;
    category.isActive = newStatus;
    await category.save();

    cache.flush();

    await recordAuditLog({
      userId: req.user.id,
      action: newStatus ? 'ACTIVATE_CATEGORY' : 'DEACTIVATE_CATEGORY',
      entityType: 'CATEGORY',
      entityId: category._id,
      details: { name: category.name, action: newStatus ? 'activated' : 'soft_deactivated' },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Category ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: { category },
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================================
   4. MEDIA UPLOAD
   ========================================================================== */

export const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE_PROVIDED', message: 'No image file was provided for upload' },
      });
    }

    const savedFile = await processAndSaveImage(req.file);

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPLOAD_IMAGE',
      entityType: 'MEDIA',
      entityId: savedFile.filename,
      details: { filename: savedFile.filename, size: savedFile.size, mimeType: savedFile.mimeType },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Image uploaded and processed successfully',
      data: savedFile,
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================================
   5. ORDER MANAGEMENT
   ========================================================================== */

export const listAdminOrders = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {};

    if (req.query.status) {
      where.status = req.query.status;
    }

    if (req.query.search) {
      const q = req.query.search.trim();
      where.OR = [
        { orderNumber: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
        { user: { phone: { contains: q } } },
      ];
    }

    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) where.createdAt.gte = new Date(req.query.startDate);
      if (req.query.endDate) where.createdAt.lte = new Date(req.query.endDate);
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          payment: { select: { id: true, method: true, status: true, amount: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: { orders },
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        payment: true,
        items: true,
        couponUsages: { include: { coupon: true } },
      },
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }

    res.status(200).json({ success: true, data: { order } });
  } catch (err) {
    next(err);
  }
};

export const updateAdminOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true },
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }

    const allowedNextStatuses = VALID_STATUS_TRANSITIONS[order.status] || [];
    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition order status from "${order.status}" to "${status}".`,
        },
      });
    }

    // If moving to CANCELLED, restore stock
    if (status === 'CANCELLED') {
      await restoreOrderStock(order.items);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id },
        data: {
          status,
          ...(cancellationReason && { cancellationReason }),
        },
      });

      if (status === 'CANCELLED' && order.payment && order.payment.status === 'COMPLETED') {
        await tx.payment.update({
          where: { orderId: id },
          data: { status: 'REFUNDED' },
        });
      }

      return ord;
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_ORDER_STATUS',
      entityType: 'ORDER',
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        newStatus: status,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: { order: updatedOrder },
    });
  } catch (err) {
    next(err);
  }
};

export const cancelAdminOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true },
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_CANNOT_BE_CANCELLED',
          message: `Orders in "${order.status}" state cannot be cancelled`,
        },
      });
    }

    // 1. Release reserved MongoDB stock back to inventory
    await restoreOrderStock(order.items);

    // 2. Update order and refund payment if completed
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: cancellationReason || 'Cancelled by administrator',
        },
      });

      if (order.payment && order.payment.status === 'COMPLETED') {
        await tx.payment.update({
          where: { orderId: id },
          data: { status: 'REFUNDED' },
        });
      }

      return ord;
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'CANCEL_ORDER',
      entityType: 'ORDER',
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        cancellationReason,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Order cancelled and stock restored successfully',
      data: { order: updatedOrder },
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================================
   6. CUSTOMER MANAGEMENT (BLOCK / UNBLOCK)
   ========================================================================== */

export const listAdminCustomers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {
      role: 'CUSTOMER',
      deletedAt: null,
    };

    if (req.query.search) {
      const q = req.query.search.trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    if (req.query.isBlocked !== undefined) {
      where.isBlocked = req.query.isBlocked === 'true';
    }

    const [total, customers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isBlocked: true,
          emailVerified: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: { customers },
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isBlocked: true,
        emailVerified: true,
        createdAt: true,
        addresses: { where: { deletedAt: null } },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }

    res.status(200).json({ success: true, data: { customer } });
  } catch (err) {
    next(err);
  }
};

export const toggleBlockCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBlocked, reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'SUPER_ADMIN accounts cannot be blocked' },
      });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: { isBlocked },
      });

      // If blocking, immediately revoke all active refresh tokens
      if (isBlocked) {
        await tx.refreshToken.updateMany({
          where: { userId: id, isRevoked: false },
          data: { isRevoked: true },
        });
      }

      return u;
    });

    await recordAuditLog({
      userId: req.user.id,
      action: isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER',
      entityType: 'USER',
      entityId: id,
      details: {
        targetEmail: user.email,
        targetRole: user.role,
        isBlocked,
        reason: reason || (isBlocked ? 'Blocked by administrator' : 'Unblocked by administrator'),
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Customer ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        isBlocked: updatedUser.isBlocked,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================================
   7. COUPONS MANAGEMENT (CRUD)
   ========================================================================== */

export const listAdminCoupons = async (req, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { usages: true } } },
    });

    res.status(200).json({
      success: true,
      count: coupons.length,
      data: { coupons },
    });
  } catch (err) {
    next(err);
  }
};

export const createAdminCoupon = async (req, res, next) => {
  try {
    const payload = req.body;

    const existing = await prisma.coupon.findUnique({
      where: { code: payload.code.toUpperCase() },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'CODE_EXISTS', message: `Coupon "${payload.code}" already exists` },
      });
    }

    const coupon = await prisma.coupon.create({
      data: {
        ...payload,
        code: payload.code.toUpperCase(),
        validFrom: payload.validFrom ? new Date(payload.validFrom) : new Date(),
      },
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'CREATE_COUPON',
      entityType: 'COUPON',
      entityId: coupon.id,
      details: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: { coupon },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAdminCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.update({
      where: { id },
      data: req.body,
    });

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_COUPON',
      entityType: 'COUPON',
      entityId: coupon.id,
      details: { code: coupon.code, updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: { coupon },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAdminCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.delete({ where: { id } });

    await recordAuditLog({
      userId: req.user.id,
      action: 'DELETE_COUPON',
      entityType: 'COUPON',
      entityId: id,
      details: { code: coupon.code },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
      data: { coupon },
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================================
   8. BANNERS MANAGEMENT (CRUD)
   ========================================================================== */

export const listAdminBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 }).lean();
    res.status(200).json({
      success: true,
      count: banners.length,
      data: { banners },
    });
  } catch (err) {
    next(err);
  }
};

export const createAdminBanner = async (req, res, next) => {
  try {
    const banner = new Banner(req.body);
    await banner.save();
    cache.flush();

    await recordAuditLog({
      userId: req.user.id,
      action: 'CREATE_BANNER',
      entityType: 'BANNER',
      entityId: banner._id,
      details: { title: banner.title },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: { banner },
    });
  } catch (err) {
    next(err);
  }
};

export const updateAdminBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid banner ObjectId' },
      });
    }

    const banner = await Banner.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!banner) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Banner not found' } });
    }

    cache.flush();

    await recordAuditLog({
      userId: req.user.id,
      action: 'UPDATE_BANNER',
      entityType: 'BANNER',
      entityId: banner._id,
      details: { title: banner.title, updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Banner updated successfully',
      data: { banner },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAdminBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid banner ObjectId' },
      });
    }

    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Banner not found' } });
    }

    cache.flush();

    await recordAuditLog({
      userId: req.user.id,
      action: 'DELETE_BANNER',
      entityType: 'BANNER',
      entityId: id,
      details: { title: banner.title },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Banner deleted successfully',
      data: { banner },
    });
  } catch (err) {
    next(err);
  }
};

/* ==========================================================================
   9. AUDIT LOGS & LOGIN LOGS VIEWER
   ========================================================================== */

export const listAdminAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.entityType) where.entityType = req.query.entityType;
    if (req.query.userId) where.userId = req.query.userId;

    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) where.createdAt.gte = new Date(req.query.startDate);
      if (req.query.endDate) where.createdAt.lte = new Date(req.query.endDate);
    }

    const [total, auditLogs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: { auditLogs },
    });
  } catch (err) {
    next(err);
  }
};

export const listAdminLoginLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.email) where.email = { contains: req.query.email.trim() };
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.success !== undefined) where.success = req.query.success === 'true';

    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) where.createdAt.gte = new Date(req.query.startDate);
      if (req.query.endDate) where.createdAt.lte = new Date(req.query.endDate);
    }

    const [total, loginLogs] = await Promise.all([
      prisma.loginLog.count({ where }),
      prisma.loginLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: { loginLogs },
    });
  } catch (err) {
    next(err);
  }
};
