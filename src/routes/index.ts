import { Router, Request, Response } from 'express';
import sessionsRoute from './sessionsRoute';
import messageRoute from './messageRoute';
import otpRoute from './otpRoute';
import * as ResponseUtil from '../utils/response';

const router = Router();

router.get('/health', (req: Request, res: Response) =>
  res.status(200).json({
    message: 'PONG',
    date: new Date(),
  })
);

router.use('/', messageRoute);
router.use('/sessions', sessionsRoute);
router.use('/otp', otpRoute);

router.all('*', function (req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: 'Not Found',
  });
});

export default router;
