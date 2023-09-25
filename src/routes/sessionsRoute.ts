import { Router } from 'express';
import apikeyValidator from '../middlewares/apikeyValidator';
import * as sessionController from '../controllers/sessionController';

const router = Router();

router.get('/', apikeyValidator, sessionController.status);
router.post('/', apikeyValidator, sessionController.create);
router.post('/logout', apikeyValidator, sessionController.logout);

export default router;
