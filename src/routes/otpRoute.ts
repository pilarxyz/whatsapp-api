import { Router } from 'express';
import * as otpController from '../controllers/otpController';
import apikeyValidator from '../middlewares/apikeyValidator';

const router = Router();

router.post('/generate', apikeyValidator, otpController.generate);
router.post('/verify', apikeyValidator, otpController.verify);

export default router;
