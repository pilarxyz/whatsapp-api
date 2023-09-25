import { Request, Response } from 'express';
import { z } from 'zod';
import * as whatsappService from '../services/whatsappService';
import * as ResponseUtil from '../utils/response';
import { authenticator } from 'otplib';

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
  });

  const { sender, receiver } = handleSchemaValidation(
    messageSchema,
    req.body,
    res
  );

  const session = await whatsappService.getSessionAndCheckStatus(sender, res);

  try {
    let formattedMessage = {
      text: generateNumericOTP(6, receiver),
    } as any;

    console.log(formattedMessage);
    const formattedPhoneNumber = whatsappService.formatPhone(receiver);
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
        `Failed to send message to recipient ${receiver}: ${error}`
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
  });

  const { sender, receiver } = handleSchemaValidation(
    messageSchema,
    req.body,
    res
  );

  const session = await whatsappService.getSessionAndCheckStatus(sender, res);

  try {
    let formattedMessage = {
      text: 'mabar',
    } as any;

    console.log(formattedMessage);
    const formattedPhoneNumber = whatsappService.formatPhone(receiver);
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
        `Failed to send message to recipient ${receiver}: ${error}`
      );
    }
  } catch (error) {
    console.log(error);
    return ResponseUtil.internalError({ res, err: error });
  }
};
