import { Router } from 'express';
import * as messageController from '../controllers/messageController';
import apikeyValidator from '../middlewares/apikeyValidator';

const router = Router();

router.post('/send', apikeyValidator, messageController.sendMessage);

export default router;
