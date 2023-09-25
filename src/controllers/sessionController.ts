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
  console.log(req.params);
  const statusSchema = z.object({
    sessionId: z.string(),
  });

  const data = handleSchemaValidation(statusSchema, req.body, res);
  if (!data) {
    return;
  }

  try {
    const session = await getSessionStatus(data.sessionId);
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

  const data = handleSchemaValidation(createSchema, req.body, res);
  if (!data) {
    return;
  }

  try {
    await createSession(data.sessionId, false, res);
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

  const data = handleSchemaValidation(logoutSchema, req.body, res);
  if (!data) {
    return;
  }

  try {
    deleteSession(data.sessionId, false);
    return ResponseUtil.ok({ res, data: null, message: 'Session deleted' });
  } catch (error) {
    console.error(error);
    return ResponseUtil.internalError({ res, err: error });
  }
};
