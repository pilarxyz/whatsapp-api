import { Request, Response } from 'express';
import {
  createSession,
  getSessionStatus,
  deleteSession,
} from '../services/whatsappService';
import * as ResponseUtil from '../utils/response';
import { z } from 'zod';
import { handleSchemaValidation } from '../utils/schema-validation';

export const status = async (req: Request, res: Response) => {
  const statusSchema = z.object({
    sessionId: z.string(),
  });

  const { sessionId } = handleSchemaValidation(statusSchema, req.body, res);

  try {
    const session = await getSessionStatus(sessionId);
    return ResponseUtil.ok({
      res,
      message: 'Session status retrieved',
      data: { session },
    });
  } catch (error) {
    console.error(error);
    return ResponseUtil.internalError({ res });
  }
};

export const create = async (req: Request, res: Response) => {
  const createSchema = z.object({
    sessionId: z.string(),
  });

  const { sessionId } = handleSchemaValidation(createSchema, req.body, res);

  try {
    await createSession(sessionId, false, res);
  } catch (error) {
    console.error(error);
    return ResponseUtil.internalError({
      res,
      message: 'Unable to create session.',
      err: error,
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  const logoutSchema = z.object({
    sessionId: z.string(),
  });

  const { sessionId } = handleSchemaValidation(logoutSchema, req.body, res);

  try {
    deleteSession(sessionId, false);
    return ResponseUtil.ok({ res, data: null, message: 'Session deleted' });
  } catch (error) {
    console.error(error);
    return ResponseUtil.internalError({ res, err: error });
  }
};
