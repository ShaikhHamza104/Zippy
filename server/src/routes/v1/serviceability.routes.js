// server/src/routes/v1/serviceability.routes.js
import { Router } from 'express';
import * as serviceabilityController from '../../controllers/serviceability.controller.js';
import { pincodeParamSchema, validateParams } from '../../validation/catalog.validation.js';

const router = Router();

// Check pincode serviceability by route param
router.get('/:pincode', validateParams(pincodeParamSchema), serviceabilityController.checkPincode);

// Check pincode serviceability by query param (?pincode=...)
router.get('/', serviceabilityController.checkPincode);

export default router;
