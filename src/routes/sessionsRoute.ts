import { Router } from 'express';
import apikeyValidator from '../middlewares/apikeyValidator';
import * as sessionController from '../controllers/sessionController';

const router = Router();

router.get('/:sessionId', apikeyValidator, sessionController.status);
router.post('/:sessionId', apikeyValidator, sessionController.create);
router.post('/:sessionId/logout', apikeyValidator, sessionController.logout);

export default router;
