import * as Joi from 'joi';
import { Request, Response } from 'express';
import {
  createSession,
  getSessionStatus,
  deleteSession,
} from '../services/whatsappService';
import * as ResponseUtil from '../utils/response';

export const status = async (req: Request, res: Response) => {
  const schema = Joi.object({
    sessionId: Joi.string().required(),
  });

  const { error } = schema.validate(req.params);

  if (error) {
    return ResponseUtil.badRequest({
      res,
      message: error.details[0]?.message ?? 'Invalid request body',
    });
  }

  const { sessionId } = req.params;
  try {
    if (!sessionId) {
      return ResponseUtil.badRequest({
        res,
        message: 'Session ID is required',
      });
    }
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
  const schema = Joi.object({
    sessionId: Joi.string().required(),
  });
  const { error } = schema.validate(req.params);

  if (error) {
    return ResponseUtil.badRequest({
      res,
      message: error.details[0]?.message ?? 'Invalid request body',
    });
  }
  const { sessionId } = req.params;

  try {
    if (!sessionId) {
      return ResponseUtil.badRequest({
        res,
        message: 'Session ID is required',
      });
    }
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
  const schema = Joi.object({
    sessionId: Joi.string().required(),
  });
  const { error } = schema.validate(req.params);

  if (error) {
    return ResponseUtil.badRequest({
      res,
      message: error.details[0]?.message ?? 'Invalid request body',
    });
  }
  const { sessionId } = req.params;
  try {
    if (!sessionId) {
      return ResponseUtil.badRequest({
        res,
        message: 'Session ID is required',
      });
    }
    await deleteSession(sessionId, false);
    return ResponseUtil.ok({ res, data: null, message: 'Session deleted' });
  } catch (error) {
    console.error(error);
    return ResponseUtil.internalError({ res, err: error });
  }
};
