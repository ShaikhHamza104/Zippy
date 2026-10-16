// server/src/controllers/address.controller.js
import { prisma } from '../database/prisma.js';

/**
 * List all active addresses for the authenticated user.
 */
export const listAddresses = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const addresses = await prisma.address.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.status(200).json({
      success: true,
      count: addresses.length,
      data: {
        addresses,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new shipping address.
 */
export const createAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      landmark,
      isDefault = false,
    } = req.body;

    const existingCount = await prisma.address.count({
      where: { userId, deletedAt: null },
    });

    // If first address or marked default, ensure default status
    const shouldBeDefault = isDefault || existingCount === 0;

    if (shouldBeDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId,
        fullName,
        phone,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        pincode,
        landmark: landmark || null,
        isDefault: shouldBeDefault,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: {
        address: newAddress,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single address by ID (must belong to authenticated user).
 */
export const getAddressById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await prisma.address.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found or has been deleted.',
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        address,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing address.
 */
export const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.address.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found or has been deleted.',
        },
      });
    }

    const { isDefault, ...otherUpdates } = req.body;

    if (isDefault === true) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        ...otherUpdates,
        ...(typeof isDefault === 'boolean' && { isDefault }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: {
        address: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Soft delete an address.
 */
export const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.address.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found or already deleted.',
        },
      });
    }

    await prisma.address.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isDefault: false,
      },
    });

    // If deleted address was default, promote the newest remaining address to default
    if (existing.isDefault) {
      const remainingNewest = await prisma.address.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      if (remainingNewest) {
        await prisma.address.update({
          where: { id: remainingNewest.id },
          data: { isDefault: true },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Set an address as the default address.
 */
export const setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.address.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found.',
        },
      });
    }

    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    const updated = await prisma.address.findUnique({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      data: {
        address: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};
