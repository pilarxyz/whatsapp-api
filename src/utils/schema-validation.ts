import { Response } from 'express';
import { z, ZodError } from 'zod';
import * as ResponseUtil from './response';

export function handleSchemaValidation<T>(
  schema: z.ZodType<T>,
  data: any,
  res: Response
): T {
  try {
    const result = schema.safeParse(data);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  } catch (error) {
    if (error instanceof ZodError) {
      throw ResponseUtil.badRequest({
        res,
        message: 'Invalid request body',
        err: error,
      });
    } else {
      // Handle other types of errors as needed
      // For example, you can log them or send a different response
      throw ResponseUtil.internalError({
        res,
        message: 'Internal server error',
        err: error,
      });
    }
  }
}
