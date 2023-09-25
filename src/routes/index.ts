import { Router, Request, Response } from 'express';
import sessionsRoute from './sessionsRoute';
import messageRoute from './messageRoute';
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

router.all('*', function (req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: 'Not Found',
  });
});

export default router;
