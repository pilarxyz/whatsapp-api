import { Request, Response } from 'express';
import { z } from 'zod';
import * as whatsappService from '../services/whatsappService';
import { categorizeFile } from '../utils/general';
import * as ResponseUtil from '../utils/response';

export const sendMessage = async (req: Request, res: Response) => {
  const messageSchema = z.object({
    sender: z.string(),
    receiver: z.string(),
    message: z.string(),
    file: z.string().optional(),
  });

  const result = messageSchema.safeParse(req.body);

  if (!result.success) {
    return ResponseUtil.badRequest({
      res,
      message: 'Invalid request body',
      err: result.error,
    });
  }
  const { receiver, message, file, sender } = result.data;
  try {
    const sessionStatus = await whatsappService.getSessionStatus(sender);

    if (sessionStatus.status == 'disconnected') {
      return ResponseUtil.badRequest({
        res,
        message: 'Session not connected',
      });
    }

    const session = await whatsappService.getSession(sender);

    const receivers = receiver.split('|');

    let formattedMessage = {
      text: message,
    } as any;

    if (file) {
      const categoryFile = categorizeFile(file);

      formattedMessage = {
        caption: message,
        ...categoryFile,
      };
    }

    const results = [];
    console.log(formattedMessage);
    for (const recipient of receivers) {
      const formattedPhoneNumber = whatsappService.formatPhone(recipient);
      try {
        const result = await whatsappService.sendMessage(
          session,
          formattedPhoneNumber,
          formattedMessage,
          1000
        );
        results.push({ recipient, ...result });
      } catch (error) {
        // Handle the error if needed
        console.error(
          `Failed to send message to recipient ${recipient}: ${error}`
        );
      }
    }

    return ResponseUtil.ok({ res, data: results, message: 'Message sent' });
  } catch (error) {
    console.log(error);
    return ResponseUtil.internalError({ res, err: error });
  }
};
