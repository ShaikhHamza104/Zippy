// server/src/routes/v1/address.routes.js
import { Router } from 'express';
import * as addressController from '../../controllers/address.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../validation/auth.validation.js';
import { createAddressSchema, updateAddressSchema } from '../../validation/order.validation.js';

const router = Router();

// All address routes require authenticated customer session
router.use(requireAuth);

router.get('/', addressController.listAddresses);
router.post('/', validateBody(createAddressSchema), addressController.createAddress);
router.get('/:id', addressController.getAddressById);
router.put('/:id', validateBody(updateAddressSchema), addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);
router.patch('/:id/default', addressController.setDefaultAddress);

export default router;
