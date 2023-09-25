import { Request, Response } from 'express';
import { z } from 'zod';
import * as whatsappService from '../services/whatsappService';
import * as db from '../db/db';
import * as ResponseUtil from '../utils/response';

import crypto from 'crypto';
import { handleSchemaValidation } from '../utils/schema-validation';

function generateNumericOTP(length: number, salt: string): string {
  const chars = '0123456789';
  const otp = [];
  const randomBytes = crypto.randomBytes(length);

  // Combine the salt with random bytes for added security
  const saltedBytes = Buffer.from(salt, 'utf-8');
  for (let i = 0; i < length; i++) {
    randomBytes[i] ^= saltedBytes[i % saltedBytes.length];
  }

  for (let i = 0; i < length; i++) {
    const index = randomBytes[i] % chars.length;
    otp.push(chars.charAt(index));
  }

  return otp.join('');
}

export const generate = async (req: Request, res: Response) => {
  const messageSchema = z.object({
    sender: z.string(),
    receiver: z.string(),
    message: z.string(),
  });

  const data = handleSchemaValidation(messageSchema, req.body, res);
  if (!data) {
    return;
  }

  const session = await whatsappService.getSessionAndCheckStatus(
    data.sender,
    res
  );
  if (!session) {
    return;
  }
  const otp = generateNumericOTP(6, data.receiver);

  let customText;
  if (data.message.includes('{otp}')) {
    customText = data.message.replace('{otp}', otp.toString());
  } else {
    return ResponseUtil.badRequest({
      res,
      message: 'Message should contain {otp} placeholder.',
    });
  }

  // insert otp and receiver to db
  try {
    // check if user exists
    const user = await db.getUser(data.receiver);
    if (user.length === 0) {
      await db.insertUser(data.receiver, otp);
    } else {
      await db.updateUser(data.receiver, otp);
    }
  } catch (error) {
    console.log(error);
    return ResponseUtil.internalError({ res, err: error });
  }

  try {
    let formattedMessage = {
      text: customText,
    } as any;

    const formattedPhoneNumber = whatsappService.formatPhone(data.receiver);
    try {
      const result = await whatsappService.sendMessage(
        session,
        formattedPhoneNumber,
        formattedMessage,
        1000
      );
      return ResponseUtil.ok({ res, data: result, message: 'Message sent' });
    } catch (error) {
      // Handle the error if needed
      console.error(
        `Failed to send message to recipient ${data.receiver}: ${error}`
      );
    }
  } catch (error) {
    console.log(error);
    return ResponseUtil.internalError({ res, err: error });
  }
};

export const verify = async (req: Request, res: Response) => {
  const messageSchema = z.object({
    sender: z.string(),
    receiver: z.string(),
    otp: z.string(),
  });

  const data = handleSchemaValidation(messageSchema, req.body, res);

  if (!data) {
    return;
  }

  // insert otp and receiver to db
  const session = await whatsappService.getSessionAndCheckStatus(
    data.sender,
    res
  );

  if (!session) {
    return;
  }

  try {
    console.log('session', session);
    // check if user exists
    const users = await db.getUser(data.receiver);
    if (users.length === 0) {
      return ResponseUtil.badRequest({
        res,
        message: 'User not found',
      });
    }

    const user = users[0];

    // check if otp is valid
    const isValid = data.otp === user.otp;

    if (!isValid) {
      return ResponseUtil.badRequest({
        res,
        message: 'Invalid OTP',
      });
    }

    const now = new Date();
    const offset = now.getTimezoneOffset() * 60 * 1000;
    const timestamp = new Date(user.timestamp).getTime() - offset;

    const diff = now.getTime() - timestamp;

    // check if otp is expired (5 minutes)
    if (diff > 5 * 60 * 1000) {
      return ResponseUtil.badRequest({
        res,
        message: 'OTP expired',
      });
    }

    // delete user from db
    await db.deleteUser(data.receiver);

    const text = `Login berhasil pada ${now.toISOString()}`;

    try {
      let formattedMessage = {
        text: text,
      } as any;

      console.log(formattedMessage);
      const formattedPhoneNumber = whatsappService.formatPhone(data.receiver);
      try {
        const result = await whatsappService.sendMessage(
          session,
          formattedPhoneNumber,
          formattedMessage,
          1000
        );
        return ResponseUtil.ok({
          res,
          data: { isValid, result },
          message: 'OTP verified',
        });
      } catch (error) {
        // Handle the error if needed
        console.error(
          `Failed to send message to recipient ${data.receiver}: ${error}`
        );
      }
    } catch (error) {
      console.log(error);
      return ResponseUtil.internalError({ res, err: error });
    }
  } catch (error) {
    console.log(error);
    return ResponseUtil.internalError({ res, err: error });
  }
};
