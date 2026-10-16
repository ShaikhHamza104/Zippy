// server/src/controllers/serviceability.controller.js
import { checkPincodeServiceability } from '../services/serviceability.service.js';

/**
 * Checks delivery serviceability and dark store coverage for a given postal code.
 */
export const checkPincode = async (req, res, next) => {
  try {
    const pincode = req.params.pincode || req.query.pincode;

    if (!pincode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PINCODE_REQUIRED',
          message: 'Postal code parameter is required.',
        },
      });
    }

    const result = checkPincodeServiceability(pincode);

    if (result.message && result.message.includes('Invalid pincode format')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PINCODE',
          message: result.message,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
